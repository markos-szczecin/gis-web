import type { WeatherParams } from "../config/weatherConfig";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface GridCell {
  cell_id: number;
  centroid_x: number;
  centroid_y: number;
  risk_probability: number;
}

export async function fetchRiskGrid(time: string, weather: WeatherParams): Promise<GridCell[]> {
  const response = await fetch(`${API_BASE}/predictions/grid`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ time, weather }),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch risk grid: ${response.status}`);
  }
  return response.json();
}

export function defaultRiskGridTime(): string {
  const now = new Date();
  const snappedHour = Math.floor(now.getHours() / 6) * 6;
  now.setHours(snappedHour, 0, 0, 0);
  return now.toISOString().slice(0, 16);
}
