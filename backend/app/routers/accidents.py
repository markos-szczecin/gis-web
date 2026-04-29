from fastapi import APIRouter, HTTPException
from app.services.accidents_service import get_accidents_geojson

router = APIRouter(prefix="/accidents", tags=["accidents"])


@router.get("/")
def list_accidents():
    try:
        return get_accidents_geojson()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
