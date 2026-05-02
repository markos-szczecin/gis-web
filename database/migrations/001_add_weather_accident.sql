-- Migration 001: Add weather_accident table
-- Stores historical weather conditions matched to each accident by time and location.
-- Safe to re-run (all statements use IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS weather_accident (
    id                   SERIAL PRIMARY KEY,
    accident_id          INTEGER NOT NULL UNIQUE
                             REFERENCES accidents(id) ON DELETE CASCADE,
    fetched_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    temperature_2m       REAL,
    apparent_temperature REAL,
    relative_humidity_2m REAL,
    dew_point_2m         REAL,
    surface_pressure     REAL,
    precipitation        REAL,
    rain                 REAL,
    snowfall             REAL,
    snow_depth           REAL,
    wind_speed_10m       REAL,
    wind_gusts_10m       REAL,
    wind_direction_10m   REAL,
    cloud_cover          REAL,
    weather_code         SMALLINT,
    is_day               BOOLEAN
);

CREATE INDEX IF NOT EXISTS weather_accident_accident_id_idx
ON weather_accident (accident_id);
