from datetime import date

from fastapi import APIRouter, HTTPException
from app.services.accidents_service import get_base_accidents_geojson

router = APIRouter(prefix="/accidents", tags=["accidents"])


@router.get("/")
def list_accidents():
    try:
        return get_base_accidents_geojson(minDate=date(2025, 1, 1), maxDate=date(2025, 12, 31))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
