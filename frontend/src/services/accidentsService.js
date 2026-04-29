const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function fetchAccidents() {
  const response = await fetch(`${API_BASE}/accidents/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch accidents: ${response.status}`);
  }
  return response.json();
}
