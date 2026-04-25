CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS accidents (
    id SERIAL PRIMARY KEY,
    event_date DATE,
    severity TEXT,
    description TEXT,
    geom GEOMETRY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS accidents_geom_idx
ON accidents
USING GIST (geom);