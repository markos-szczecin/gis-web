from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from app.services.accidents_service import get_accident_details, get_base_accidents_geojson

router = APIRouter(prefix="/accidents", tags=["accidents"])


@router.get("/")
def list_accidents(
    minDate: Optional[date] = Query(default=None),
    maxDate: Optional[date] = Query(default=None),
):
    try:
        return get_base_accidents_geojson(minDate=minDate, maxDate=maxDate)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{accident_id}")
def accident_details(accident_id: str):
    try:
        return get_accident_details(accident_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
