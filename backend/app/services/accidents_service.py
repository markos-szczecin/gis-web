from datetime import date
from typing import Optional

from app.repositories.accidents_repository import AccidentsRepository

_repository = AccidentsRepository()


def get_base_accidents_geojson(
    minDate: Optional[date] = None,
    maxDate: Optional[date] = None,
) -> dict:
    if minDate is None:
        minDate = date(date.today().year, 1, 1)
    if maxDate is None:
        maxDate = date(date.today().year, 12, 31)

    accidents = _repository.find_in_date_range(minDate, maxDate)

    features = [
        {
            "type": "Feature",
            "geometry": accident.geometry,
            "properties": {
                "id": accident.id,
                "event_date": accident.event_date.isoformat() if accident.event_date else None,
                "event_time": accident.event_time if accident.event_time else None,
                "severity": accident.severity,
            },
        }
        for accident in accidents
    ]

    return {"type": "FeatureCollection", "features": features}


def get_accident_details(accident_id: str) -> dict:
    accident = _repository.find_by_id(accident_id)

    if not accident:
        raise ValueError(f"Accident with ID {accident_id} not found")

    return {
        "id": accident.id,
        "event_date": accident.event_date.isoformat(),
        "event_time": accident.event_time.isoformat(),
        "description": accident.description,
        "traffic_light": accident.traffic_light,
        "place": accident.place,
        "crossroad": accident.crossroad,
        "urban": accident.urban,
        "road_type": accident.road_type,
        "severity": accident.severity,
        "geometry": accident.geometry,
        "day_night": accident.day_night
    }
