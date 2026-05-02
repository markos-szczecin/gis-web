"""
Weather data pipeline for accident enrichment.

Fetches historical hourly weather from the Open-Meteo Archive API for every
accident record and stores results in the weather_accident table.

Usage:
    python weather_pipeline.py --mode insert
    python weather_pipeline.py --mode update
    python weather_pipeline.py --mode insert --start-date 2024-01-01 --end-date 2024-12-31
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from datetime import date, datetime, time as time_t
from typing import Callable, Literal, Optional

import psycopg2
import requests
import requests_cache
from dotenv import load_dotenv
from retry_requests import retry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class AccidentRecord:
    id: int
    event_date: date
    event_time: time_t
    lat: float
    lon: float


@dataclass
class WeatherRecord:
    accident_id: int
    fetched_at: datetime
    temperature_2m: Optional[float]
    apparent_temperature: Optional[float]
    relative_humidity_2m: Optional[float]
    dew_point_2m: Optional[float]
    surface_pressure: Optional[float]
    precipitation: Optional[float]
    rain: Optional[float]
    snowfall: Optional[float]
    snow_depth: Optional[float]
    wind_speed_10m: Optional[float]
    wind_gusts_10m: Optional[float]
    wind_direction_10m: Optional[float]
    cloud_cover: Optional[float]
    weather_code: Optional[int]
    is_day: Optional[bool]


# ---------------------------------------------------------------------------
# Abstract weather client (Dependency Inversion)
# ---------------------------------------------------------------------------

class WeatherClient(ABC):
    @abstractmethod
    def fetch(
        self,
        accident_id: int,
        lat: float,
        lon: float,
        event_date: date,
        event_hour: int,
    ) -> WeatherRecord:
        """Return weather conditions for the given location and hour."""


# ---------------------------------------------------------------------------
# Open-Meteo implementation
# ---------------------------------------------------------------------------

class OpenMeteoWeatherClient(WeatherClient):
    URL = "https://archive-api.open-meteo.com/v1/archive"
    TIMEZONE = "Europe/Warsaw"
    HOURLY_VARS = [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "dew_point_2m",
        "surface_pressure",
        "precipitation",
        "rain",
        "snowfall",
        "snow_depth",
        "wind_speed_10m",
        "wind_gusts_10m",
        "wind_direction_10m",
        "cloud_cover",
        "weather_code",
        "is_day",
    ]
    # Polite delay between non-cached requests (Open-Meteo free tier: ~10k/day)
    REQUEST_DELAY_S = 0.05

    def __init__(self, cache_path: str = ".cache") -> None:
        cached_session = requests_cache.CachedSession(cache_path, expire_after=-1)
        self._session = retry(cached_session, retries=5, backoff_factor=0.2)

    def fetch(
        self,
        accident_id: int,
        lat: float,
        lon: float,
        event_date: date,
        event_hour: int,
    ) -> WeatherRecord:
        date_str = event_date.isoformat()
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": date_str,
            "end_date": date_str,
            "hourly": ",".join(self.HOURLY_VARS),
            "timezone": self.TIMEZONE,
        }
        response = self._session.get(self.URL, params=params, timeout=30)
        response.raise_for_status()

        # Throttle only real HTTP requests, not cache hits
        if not getattr(response, "from_cache", False):
            time.sleep(self.REQUEST_DELAY_S)

        data = response.json()
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])

        if len(times) < event_hour + 1:
            raise ValueError(
                f"Accident {accident_id}: API returned {len(times)} hourly rows, "
                f"expected at least {event_hour + 1}"
            )

        expected_suffix = f"T{event_hour:02d}:00"
        if not times[event_hour].endswith(expected_suffix):
            raise ValueError(
                f"Accident {accident_id}: time index mismatch — "
                f"got '{times[event_hour]}', expected suffix '{expected_suffix}'"
            )

        def _get(var: str):
            return hourly.get(var, [None] * 24)[event_hour]

        raw_code = _get("weather_code")
        raw_is_day = _get("is_day")

        return WeatherRecord(
            accident_id=accident_id,
            fetched_at=datetime.utcnow(),
            temperature_2m=_get("temperature_2m"),
            apparent_temperature=_get("apparent_temperature"),
            relative_humidity_2m=_get("relative_humidity_2m"),
            dew_point_2m=_get("dew_point_2m"),
            surface_pressure=_get("surface_pressure"),
            precipitation=_get("precipitation"),
            rain=_get("rain"),
            snowfall=_get("snowfall"),
            snow_depth=_get("snow_depth"),
            wind_speed_10m=_get("wind_speed_10m"),
            wind_gusts_10m=_get("wind_gusts_10m"),
            wind_direction_10m=_get("wind_direction_10m"),
            cloud_cover=_get("cloud_cover"),
            weather_code=int(raw_code) if raw_code is not None else None,
            is_day=bool(raw_is_day) if raw_is_day is not None else None,
        )


# ---------------------------------------------------------------------------
# Accident reader
# ---------------------------------------------------------------------------

class AccidentReader:
    _INSERT_MODE_SQL = """
        SELECT
            a.id,
            a.event_date,
            a.event_time,
            ST_Y(a.loc) AS lat,
            ST_X(a.loc) AS lon
        FROM accidents a
        LEFT JOIN weather_accident wa ON wa.accident_id = a.id
        WHERE wa.id IS NULL
          AND (%(start_date)s IS NULL OR a.event_date >= %(start_date)s)
          AND (%(end_date)s   IS NULL OR a.event_date <= %(end_date)s)
        ORDER BY a.event_date
    """

    _UPDATE_MODE_SQL = """
        SELECT
            a.id,
            a.event_date,
            a.event_time,
            ST_Y(a.loc) AS lat,
            ST_X(a.loc) AS lon
        FROM accidents a
        WHERE (%(start_date)s IS NULL OR a.event_date >= %(start_date)s)
          AND (%(end_date)s   IS NULL OR a.event_date <= %(end_date)s)
        ORDER BY a.event_date
    """

    def __init__(self, connection_factory: Callable) -> None:
        self._connect = connection_factory

    def fetch_accidents(
        self,
        mode: Literal["insert", "update"],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> list[AccidentRecord]:
        sql = self._INSERT_MODE_SQL if mode == "insert" else self._UPDATE_MODE_SQL
        params = {"start_date": start_date, "end_date": end_date}

        conn = self._connect()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
        finally:
            conn.close()

        return [
            AccidentRecord(
                id=row[0],
                event_date=row[1],
                event_time=row[2],
                lat=float(row[3]),
                lon=float(row[4]),
            )
            for row in rows
        ]


# ---------------------------------------------------------------------------
# Weather writer
# ---------------------------------------------------------------------------

class WeatherWriter:
    _UPSERT_SQL = """
        INSERT INTO weather_accident (
            accident_id,
            fetched_at,
            temperature_2m,
            apparent_temperature,
            relative_humidity_2m,
            dew_point_2m,
            surface_pressure,
            precipitation,
            rain,
            snowfall,
            snow_depth,
            wind_speed_10m,
            wind_gusts_10m,
            wind_direction_10m,
            cloud_cover,
            weather_code,
            is_day
        ) VALUES (
            %(accident_id)s,
            %(fetched_at)s,
            %(temperature_2m)s,
            %(apparent_temperature)s,
            %(relative_humidity_2m)s,
            %(dew_point_2m)s,
            %(surface_pressure)s,
            %(precipitation)s,
            %(rain)s,
            %(snowfall)s,
            %(snow_depth)s,
            %(wind_speed_10m)s,
            %(wind_gusts_10m)s,
            %(wind_direction_10m)s,
            %(cloud_cover)s,
            %(weather_code)s,
            %(is_day)s
        )
        ON CONFLICT (accident_id) DO UPDATE SET
            fetched_at           = EXCLUDED.fetched_at,
            temperature_2m       = EXCLUDED.temperature_2m,
            apparent_temperature = EXCLUDED.apparent_temperature,
            relative_humidity_2m = EXCLUDED.relative_humidity_2m,
            dew_point_2m         = EXCLUDED.dew_point_2m,
            surface_pressure     = EXCLUDED.surface_pressure,
            precipitation        = EXCLUDED.precipitation,
            rain                 = EXCLUDED.rain,
            snowfall             = EXCLUDED.snowfall,
            snow_depth           = EXCLUDED.snow_depth,
            wind_speed_10m       = EXCLUDED.wind_speed_10m,
            wind_gusts_10m       = EXCLUDED.wind_gusts_10m,
            wind_direction_10m   = EXCLUDED.wind_direction_10m,
            cloud_cover          = EXCLUDED.cloud_cover,
            weather_code         = EXCLUDED.weather_code,
            is_day               = EXCLUDED.is_day
    """

    def __init__(self, connection_factory: Callable) -> None:
        self._connect = connection_factory

    def upsert_batch(self, records: list[WeatherRecord]) -> None:
        if not records:
            return
        conn = self._connect()
        try:
            with conn.cursor() as cur:
                for record in records:
                    cur.execute(self._UPSERT_SQL, asdict(record))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Pipeline orchestrator
# ---------------------------------------------------------------------------

BATCH_SIZE = 50


class WeatherPipeline:
    def __init__(
        self,
        reader: AccidentReader,
        client: WeatherClient,
        writer: WeatherWriter,
    ) -> None:
        self._reader = reader
        self._client = client
        self._writer = writer

    def run(
        self,
        mode: Literal["insert", "update"],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> None:
        accidents = self._reader.fetch_accidents(mode, start_date, end_date)
        total = len(accidents)

        logger.info(
            "Pipeline started — mode=%s, date_range=[%s, %s], accidents=%d",
            mode, start_date or "unbounded", end_date or "unbounded", total,
        )

        if total == 0:
            logger.info("No accidents to process.")
            return

        processed = 0
        errors = 0
        batch: list[WeatherRecord] = []
        start_time = time.monotonic()

        for accident in accidents:
            event_hour = accident.event_time.hour
            logger.debug(
                "Fetching weather for accident %d at (%.4f, %.4f) on %s hour %d",
                accident.id, accident.lat, accident.lon, accident.event_date, event_hour,
            )
            try:
                record = self._client.fetch(
                    accident.id, accident.lat, accident.lon,
                    accident.event_date, event_hour,
                )
                batch.append(record)
            except Exception as exc:
                logger.error("Accident %d failed: %s", accident.id, exc)
                errors += 1
                continue

            if len(batch) >= BATCH_SIZE:
                self._writer.upsert_batch(batch)
                processed += len(batch)
                batch = []
                logger.info(
                    "Processed %d/%d accidents (%.0f%%)",
                    processed, total, processed / total * 100,
                )

        if batch:
            self._writer.upsert_batch(batch)
            processed += len(batch)

        elapsed = time.monotonic() - start_time
        logger.info(
            "Pipeline complete — processed=%d, errors=%d, elapsed=%.1fs",
            processed, errors, elapsed,
        )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def _build_connection():
    """Thin wrapper so get_connection can be imported or replaced in tests."""
    try:
        from app.db.connection import get_connection
        return get_connection()
    except ImportError:
        import os
        import psycopg2
        return psycopg2.connect(os.environ["DATABASE_URL"])


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Fetch historical weather data for accident records.",
    )
    parser.add_argument(
        "--mode",
        choices=["insert", "update"],
        required=True,
        help=(
            "insert: only enrich accidents without weather data; "
            "update: enrich all accidents, overwrite existing data"
        ),
    )
    parser.add_argument(
        "--start-date",
        type=date.fromisoformat,
        default=None,
        metavar="YYYY-MM-DD",
        help="Only process accidents on or after this date.",
    )
    parser.add_argument(
        "--end-date",
        type=date.fromisoformat,
        default=None,
        metavar="YYYY-MM-DD",
        help="Only process accidents on or before this date.",
    )
    args = parser.parse_args()

    reader = AccidentReader(_build_connection)
    client = OpenMeteoWeatherClient(cache_path=".cache")
    writer = WeatherWriter(_build_connection)
    pipeline = WeatherPipeline(reader, client, writer)

    try:
        pipeline.run(args.mode, args.start_date, args.end_date)
    except KeyboardInterrupt:
        logger.info("Interrupted by user.")
        sys.exit(1)


if __name__ == "__main__":
    main()
