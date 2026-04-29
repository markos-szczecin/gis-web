CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS accidents (
    id SERIAL PRIMARY KEY,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    severity VARCHAR(20) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    loc GEOMETRY(Point, 4326) NOT NULL,
    day_night BOOLEAN DEFAULT NULL,
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

COMMENT ON COLUMN accidents.day_night IS 'TRUE for day, FALSE for night';
COMMENT ON COLUMN accidents.traffic_light IS 'TRUE if traffic light was present, FALSE otherwise';
COMMENT ON COLUMN accidents.crossroad IS 'TRUE if the accident occurred at a crossroad, FALSE otherwise';


CREATE INDEX IF NOT EXISTS accidents_geom_idx
ON accidents
USING GIST (loc);