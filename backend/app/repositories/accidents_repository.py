from datetime import date
from typing import Optional

from app.db.connection import get_cursor
from app.models.accident import Accident


class AccidentsRepository:
    def find_in_date_range(self, min_date: date, max_date: date) -> list[Accident]:
        query = """
            SELECT
                id,
                event_date,
                event_time,
                severity,
                ST_AsGeoJSON(loc)::json AS geometry
            FROM accidents
            WHERE event_date >= %s AND event_date <= %s
            ORDER BY event_date DESC
        """
        with get_cursor() as cur:
            cur.execute(query, (min_date.strftime("%Y-%m-%d"), max_date.strftime("%Y-%m-%d")))
            rows = cur.fetchall()

        return [
            Accident(
                id=row["id"],
                event_date=row["event_date"],
                event_time=row["event_time"],
                severity=row["severity"],
                description=None,
                traffic_light=None,
                place=None,
                crossroad=None,
                urban=None,
                road_type=None,
                geometry=row["geometry"],
                day_night=None
            )
            for row in rows
        ]

    def find_by_id(self, accident_id: str) -> Optional[Accident]:
        query = """
            SELECT
                a.id,
                event_date,
                event_time,
                severity,
                description,
                traffic_light,
                place,
                crossroad,
                urban,
                road_type,
                ST_AsGeoJSON(loc)::json AS geometry,
                wa.is_day
            FROM accidents a
            LEFT JOIN weather_accident wa ON a.id = wa.accident_id
            WHERE a.id = %s
        """
        with get_cursor() as cur:
            cur.execute(query, (accident_id,))
            row = cur.fetchone()

        if not row:
            return None

        return Accident(
            id=row["id"],
            event_date=row["event_date"],
            event_time=row["event_time"],
            severity=row["severity"],
            description=row["description"],
            traffic_light=row["traffic_light"],
            place=row["place"],
            crossroad=row["crossroad"],
            urban=row["urban"],
            road_type=row["road_type"],
            geometry=row["geometry"],
            day_night=row["is_day"]
        )
