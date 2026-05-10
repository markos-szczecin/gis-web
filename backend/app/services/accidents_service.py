from datetime import date
from typing import Optional

from app.repositories.accidents_repository import AccidentsRepository
from app.translations import DESCRIPTION_MAP, PLACE_MAP, ROAD_TYPE_MAP, SEVERITY_MAP, translate

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
                "severity": translate(SEVERITY_MAP, accident.severity),
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
        "description": translate(DESCRIPTION_MAP, accident.description),
        "traffic_light": accident.traffic_light,
        "place": translate(PLACE_MAP, accident.place),
        "crossroad": accident.crossroad,
        "urban": accident.urban,
        "road_type": translate(ROAD_TYPE_MAP, accident.road_type),
        "severity": translate(SEVERITY_MAP, accident.severity),
        "geometry": accident.geometry,
        "day_night": accident.day_night
    }
