from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from app.services.accidents_service import get_base_accidents_geojson

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
