import json
from app.db.connection import get_cursor


def get_accidents_geojson() -> dict:
    query = """
        SELECT
            id,
            event_date,
            event_time,
            severity,
            description,
            day_night,
            traffic_light,
            type,
            place,
            crossroad,
            urban,
            road_type,
            ST_AsGeoJSON(loc)::json AS geometry
        FROM accidents
    """
    with get_cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    features = [
        {
            "type": "Feature",
            "geometry": row["geometry"],
            "properties": {
                "id": row["id"],
                "event_date": str(row["event_date"]),
                "event_time": str(row["event_time"]),
                "severity": row["severity"],
                "description": row["description"],
                "day_night": row["day_night"],
                "traffic_light": row["traffic_light"],
                "type": row["type"],
                "place": row["place"],
                "crossroad": row["crossroad"],
                "urban": row["urban"],
                "road_type": row["road_type"],
            },
        }
        for row in rows
    ]

    return {"type": "FeatureCollection", "features": features}
