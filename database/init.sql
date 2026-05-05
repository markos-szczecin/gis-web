CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS accidents (
    id SERIAL PRIMARY KEY,
    public_id VARCHAR(50) NOT NULL UNIQUE,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    severity VARCHAR(20) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    loc GEOMETRY(Point, 4326) NOT NULL,

    traffic_light BOOLEAN DEFAULT NULL,
    type VARCHAR(100) DEFAULT NULL,
    place VARCHAR(100) DEFAULT NULL,
    crossroad BOOLEAN DEFAULT NULL,
    urban BOOLEAN DEFAULT NULL,
    road_type VARCHAR(50) DEFAULT NULL
);

-- tabela for uczestnicy 
-- tabela pogodowa
-- tabela uczestnicy
COMMENT ON COLUMN accidents.traffic_light IS 'TRUE if traffic light was present, FALSE otherwise';
COMMENT ON COLUMN accidents.crossroad IS 'TRUE if the accident occurred at a crossroad, FALSE otherwise';


CREATE INDEX IF NOT EXISTS accidents_geom_idx
ON accidents
USING GIST (loc);

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