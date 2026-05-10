from fastapi import APIRouter, HTTPException, Query
from app.models.http.PredictionRequest import PredictionRequest
from app.services.predictor import AccidentRiskPredictor

router = APIRouter(prefix="/predictions", tags=["predictions"])

predictor = AccidentRiskPredictor.load("artifact_dir/")

@router.post("/single")
def perform_prediction(req: PredictionRequest):
    try:
        result = predictor.predict(
            time=req.time,
            cell_id=req.cell_id,
            lat=req.lat,
            lon=req.lon,
            weather=req.weather
        )

        return {
            "time_window": result["time_window"].isoformat(),
            "cell_id": result["cell_id"],
            "risk_probability": result["risk_probability"],
            "lift_over_baseline": result["lift_over_baseline"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


"""
Response example
[
{
    "cell_id": 146,
    "centroid_x": 204502.14265684097,
    "centroid_y": 626530.0615311833,
    "risk_probability": 0.0014973161742091179
},
{
    "cell_id": 122,
    "centroid_x": 203502.14265684097,
    "centroid_y": 627530.0615311833,
    "risk_probability": 0.0013066454557701945
},
{
    "cell_id": 147,
    "centroid_x": 204502.14265684097,
    "centroid_y": 627530.0615311833,
    "risk_probability": 0.0012794208014383912
},
""" 
@router.post("/grid")
def perform_predictions(req: PredictionRequest):
    try:
        grid = predictor.predict_grid(time=req.time, weather=req.weather)

        # Convert DataFrame to list of dicts for JSON response
        return grid.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))