from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import accidents
from app.routers import predictions
import os

app = FastAPI(title="Geo Dashboard API")

app.include_router(accidents.router)
app.include_router(predictions.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Geo Dashboard API działa",
        "database": os.getenv("DATABASE_URL"),
        "redis": os.getenv("REDIS_HOST"),
    }

@app.get("/health")
def health():
    return {"status": "ok"}