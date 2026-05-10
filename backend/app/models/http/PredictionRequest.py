from pydantic import BaseModel
from datetime import datetime

class PredictionRequest(BaseModel):
    time: datetime
    cell_id: int | None = None
    lat: float | None = None
    lon: float | None = None
    weather: dict[str, float]