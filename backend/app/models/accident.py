from dataclasses import dataclass
from datetime import date, time
from typing import Optional


@dataclass
class Accident:
    id: int
    event_date: date
    event_time: Optional[time]
    severity: Optional[str]
    description: Optional[str]
    day_night: Optional[str]
    traffic_light: Optional[bool]
    place: Optional[str]
    crossroad: Optional[bool]
    urban: Optional[bool]
    road_type: Optional[str]
    geometry: dict
