export const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Cloud development not observed or not observable",
  1: "Clouds generally dissolving or becoming less developed",
  2: "State of sky on the whole unchanged",
  3: "Clouds generally forming or developing",
  51: "Drizzle, not freezing, continuous, slight at time of observation",
  53: "Drizzle, not freezing, continuous",
  55: "Drizzle, not freezing, continuous, heavy (dense) at time of observation",
  61: "Rain, not freezing, continuous, slight at time of observation",
  63: "Rain, not freezing, continuous, moderate at time of observation",
  71: "Continuous fall of snowflakes, slight at time of observation",
  73: "Continuous fall of snowflakes",
  75: "Continuous fall of snowflakes, heavy at time of observation",
};

export interface WeatherParams {
  precipitation: number;
  wind_speed_10m: number;
  wind_gusts_10m: number;
  temperature_2m: number;
  rain: number;
  snow_depth: number;
  cloud_cover: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  dew_point_2m: number;
  surface_pressure: number;
  weather_code: number;
}

export const defaultWeather: WeatherParams = {
  temperature_2m: 10,
  apparent_temperature: 10,
  precipitation: 0,
  rain: 0,
  snow_depth: 0,
  wind_speed_10m: 0,
  wind_gusts_10m: 0,
  cloud_cover: 0,
  relative_humidity_2m: 70,
  dew_point_2m: 5,
  surface_pressure: 1013,
  weather_code: 0,
};

export const WEATHER_FIELDS: {
  key: keyof WeatherParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "temperature_2m",      label: "Temperature",  unit: "°C",  min: -15, max: 38,   step: 0.5 },
  { key: "apparent_temperature", label: "Feels like",   unit: "°C",  min: -20, max: 42,   step: 0.5 },
  { key: "dew_point_2m",        label: "Dew point",    unit: "°C",  min: -15, max: 25,   step: 0.5 },
  { key: "precipitation",       label: "Precipitation", unit: "mm",  min: 0,   max: 50,   step: 0.1 },
  { key: "rain",                label: "Rain",          unit: "mm",  min: 0,   max: 50,   step: 0.1 },
  { key: "snow_depth",          label: "Snow depth",   unit: "m",   min: 0,   max: 0.5,  step: 0.01 },
  { key: "wind_speed_10m",      label: "Wind speed",   unit: "m/s", min: 0,   max: 30,   step: 0.5 },
  { key: "wind_gusts_10m",      label: "Wind gusts",   unit: "m/s", min: 0,   max: 50,   step: 0.5 },
  { key: "cloud_cover",         label: "Cloud cover",  unit: "%",   min: 0,   max: 100,  step: 1 },
  { key: "relative_humidity_2m",label: "Humidity",     unit: "%",   min: 0,   max: 100,  step: 1 },
  { key: "surface_pressure",    label: "Pressure",     unit: "hPa", min: 960, max: 1050, step: 0.5 },
];
