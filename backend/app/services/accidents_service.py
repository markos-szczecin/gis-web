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
            ST_AsGeoJSON(loc)::json AS geometry
        FROM accidents
        WHERE event_date >= %s AND event_date <= %s
    """
    print(minDate, maxDate)
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
            },
        }
        for row in rows
    ]

    return {"type": "FeatureCollection", "features": features}
