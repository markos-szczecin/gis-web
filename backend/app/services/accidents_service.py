from datetime import date
import json
from typing import Optional
from app.db.connection import get_cursor


def get_base_accidents_geojson(
    minDate: Optional[date] = None,
    maxDate: Optional[date] = None,
) -> dict:
    if minDate is None:
        minDate = date(date.today().year, 1, 1)
    if maxDate is None:
        maxDate = date(date.today().year, 12, 31)
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
    dates = (minDate.strftime("%Y-%m-%d"), maxDate.strftime("%Y-%m-%d"))


    with get_cursor() as cur:
        cur.execute(query, dates)
        rows = cur.fetchall()

    features = [
        {
            "type": "Feature",
            "geometry": row["geometry"],
            "properties": {
                "id": row["id"],
                "event_date": row["event_date"].isoformat() if row["event_date"] else None,
                "event_time": row["event_time"] if row["event_time"] else None,
                "severity": row["severity"],
            },
        }
        for row in rows
    ]

    return {"type": "FeatureCollection", "features": features}


def get_accident_details(accident_id: str) -> dict:
    query = """
        SELECT
            id,
            event_date,
            event_time,
            severity,
            description,
            day_night,
            traffic_light,
            place,
            crossroad,
            urban,
            road_type,
            ST_AsGeoJSON(loc)::json AS geometry
        FROM accidents
        WHERE id = %s
    """

    with get_cursor() as cur:
        cur.execute(query, (accident_id,))
        row = cur.fetchone()

    if not row:
        raise ValueError(f"Accident with ID {accident_id} not found")

    return {
        "id": row["id"],
        "event_date": row["event_date"].isoformat(),
        "event_time": row["event_time"].isoformat(),
        "description": row["description"],
        "day_night": row["day_night"],
        "traffic_light": row["traffic_light"],
        "place": row["place"],
        "crossroad": row["crossroad"],
        "urban": row["urban"],
        "road_type": row["road_type"],
        "severity": row["severity"],
        "geometry": row["geometry"],
    }
