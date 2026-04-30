const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function fetchAccidents(minDate: string, maxDate: string): Promise<object> {
  const params = new URLSearchParams({ minDate, maxDate });
  const response = await fetch(`${API_BASE}/accidents/?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch accidents: ${response.status}`);
  }
  return response.json();
}

export interface AccidentDetails {
  id: string;
  event_date: string;
  event_time: string;
  severity: string;
  description: string;
  day_night: string;
  traffic_light: boolean;
  place: string;
  crossroad: boolean;
  urban: boolean;
  road_type: string;
  geometry: object;
}

export async function fetchAccidentDetails(id: string): Promise<AccidentDetails> {
  const response = await fetch(`${API_BASE}/accidents/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch accident details: ${response.status}`);
  }
  return response.json();
}
