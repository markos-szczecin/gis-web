import { useState } from "react";
import type { CSSProperties } from "react";
import { WEATHER_CODE_MAP, WEATHER_FIELDS, defaultWeather, type WeatherParams } from "./config/weatherConfig";
import { defaultRiskGridTime } from "./services/predictionsService";
import { defaultFilters } from "./config/config";

const TIME_SLOTS = [
  { label: "00:00 – 06:00", hour: 0 },
  { label: "06:00 – 12:00", hour: 6 },
  { label: "12:00 – 18:00", hour: 12 },
  { label: "18:00 – 00:00", hour: 18 },
];

function AccidentsControls({ onSubmit }: { onSubmit: (minDate: string, maxDate: string) => void }) {
  const [minDate, setMinDate] = useState(defaultFilters.minDate);
  const [maxDate, setMaxDate] = useState(defaultFilters.maxDate);

  return (
    <div style={styles.section}>
      <label style={styles.fieldLabel}>
        From
        <input type="date" min="2020-01-01" value={minDate} onChange={(e) => setMinDate(e.target.value)} style={styles.textInput} />
      </label>
      <label style={styles.fieldLabel}>
        To
        <input type="date" min="2020-01-01" value={maxDate} onChange={(e) => setMaxDate(e.target.value)} style={styles.textInput} />
      </label>
      <button style={styles.loadBtn} onClick={() => onSubmit(minDate, maxDate)}>Load</button>
    </div>
  );
}

function RiskGridControls({ onSubmit }: { onSubmit: (time: string, weather: WeatherParams) => void }) {
  const [draftTime, setDraftTime] = useState(defaultRiskGridTime());
  const [draftWeather, setDraftWeather] = useState<WeatherParams>(defaultWeather);

  const date = draftTime.slice(0, 10);
  const hour = parseInt(draftTime.slice(11, 13), 10);

  const setDate = (d: string) =>
    setDraftTime(`${d}T${String(hour).padStart(2, "0")}:00`);
  const setSlot = (h: number) =>
    setDraftTime(`${date}T${String(h).padStart(2, "0")}:00`);
  const setWeatherField = (key: keyof WeatherParams, value: number) =>
    setDraftWeather((w) => ({ ...w, [key]: value }));

  return (
    <>
      <div style={styles.section}>
        <label style={styles.fieldLabel}>
          Date
          <input type="date" min="2020-01-01" value={date} onChange={(e) => setDate(e.target.value)} style={styles.textInput} />
        </label>
        <div style={styles.fieldLabel as CSSProperties}>
          Time window
          <div style={styles.slotGrid}>
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.hour}
                style={{ ...styles.slotBtn, ...(hour === slot.hour ? styles.slotBtnActive : {}) }}
                onClick={() => setSlot(slot.hour)}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.sectionHeader}>Weather</div>

      <div style={styles.section}>
        <label style={styles.fieldLabel}>
          Condition
          <select
            value={draftWeather.weather_code}
            onChange={(e) => setWeatherField("weather_code", Number(e.target.value))}
            style={styles.textInput}
          >
            {Object.entries(WEATHER_CODE_MAP).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </label>

        {WEATHER_FIELDS.map((f) => (
          <label key={f.key} style={styles.fieldLabel}>
            <span style={styles.fieldRow}>
              <span>{f.label}</span>
              <span style={styles.unit}>{f.unit}</span>
            </span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step}
              value={draftWeather[f.key]}
              onChange={(e) => setWeatherField(f.key, parseFloat(e.target.value) || 0)}
              style={styles.textInput}
            />
          </label>
        ))}

        <button style={styles.loadBtn} onClick={() => onSubmit(draftTime, draftWeather)}>Load</button>
      </div>

      <div style={styles.riskNote}>Color: yellow (low) → red (high risk)</div>
    </>
  );
}

interface SidebarProps {
  activeLayer: "accidents" | "riskGrid";
  onLayerChange: (layer: "accidents" | "riskGrid") => void;
  onSubmitAccidents: (minDate: string, maxDate: string) => void;
  onSubmitRiskGrid: (time: string, weather: WeatherParams) => void;
}

export default function Sidebar({ activeLayer, onLayerChange, onSubmitAccidents, onSubmitRiskGrid }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ ...styles.wrapper, transform: collapsed ? "translateX(-240px)" : "translateX(0)" }}>
      <aside style={styles.sidebar}>
        <div style={styles.header}>
          Layers
          <button style={styles.collapseBtn} onClick={() => setCollapsed(true)} title="Hide sidebar">◀</button>
        </div>

        <div style={styles.layerSection}>
          <button
            style={{ ...styles.layerBtn, ...(activeLayer === "accidents" ? styles.layerBtnActive : {}) }}
            onClick={() => onLayerChange("accidents")}
            title="Shows recorded road accidents as clusters on the map. Click a cluster to zoom in or view individual accident details."
          >
            Road Accidents
          </button>
          <button
            style={{ ...styles.layerBtn, ...(activeLayer === "riskGrid" ? styles.layerBtnActive : {}) }}
            onClick={() => onLayerChange("riskGrid")}
            title="Shows a risk heatmap predicted by an ML model. Configure date, time window, and weather conditions to see where accidents are most likely to occur. Optinally you can Draw area on the map to filter the risk grid to that area."
          >
            Accident Risk Predictor
          </button>
        </div>

        {activeLayer === "accidents" && <AccidentsControls onSubmit={onSubmitAccidents} />}
        {activeLayer === "riskGrid" && <RiskGridControls onSubmit={onSubmitRiskGrid} />}
      </aside>
      <button
        style={styles.tabBtn}
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Show sidebar" : "Hide sidebar"}
      >
        {collapsed ? "▶" : "◀"}
      </button>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    position: "absolute",
    zIndex: 9999,
    top: 0,
    left: 0,
    height: "100%",
    display: "flex",
    alignItems: "stretch",
    transition: "transform 0.3s ease",
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "#1e1e2e",
    color: "#cdd6f4",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    fontFamily: "sans-serif",
    fontSize: 14,
  },
  header: {
    padding: "16px 16px 12px",
    fontWeight: 700,
    fontSize: 16,
    borderBottom: "1px solid #313244",
    letterSpacing: "0.03em",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  collapseBtn: {
    background: "none",
    border: "none",
    color: "#cdd6f4",
    cursor: "pointer",
    fontSize: 12,
    opacity: 0.6,
    padding: "2px 4px",
    lineHeight: 1,
  },
  tabBtn: {
    alignSelf: "center",
    background: "#1e1e2e",
    border: "1px solid #313244",
    borderLeft: "none",
    color: "#cdd6f4",
    cursor: "pointer",
    width: 20,
    height: 48,
    borderRadius: "0 6px 6px 0",
    fontSize: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  layerSection: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "12px 16px",
    borderBottom: "1px solid #313244",
  },
  layerBtn: {
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: 4,
    color: "#a6adc8",
    cursor: "pointer",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    textAlign: "left",
    letterSpacing: "0.03em",
  },
  layerBtnActive: {
    background: "#89b4fa",
    border: "1px solid #89b4fa",
    color: "#1e1e2e",
  },
  sectionHeader: {
    padding: "8px 16px 4px",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#6c7086",
    borderTop: "1px solid #313244",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "10px 16px",
  },
  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#a6adc8",
  },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
  },
  unit: {
    color: "#6c7086",
    fontWeight: 400,
    textTransform: "none",
    letterSpacing: 0,
  },
  textInput: {
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: 4,
    color: "#cdd6f4",
    padding: "4px 8px",
    fontSize: 13,
    colorScheme: "dark",
    width: "100%",
    boxSizing: "border-box",
  },
  slotGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 4,
  },
  slotBtn: {
    background: "#313244",
    border: "1px solid #45475a",
    borderRadius: 4,
    color: "#a6adc8",
    cursor: "pointer",
    padding: "6px 10px",
    fontSize: 12,
    textAlign: "left",
  },
  slotBtnActive: {
    background: "#89b4fa",
    border: "1px solid #89b4fa",
    color: "#1e1e2e",
    fontWeight: 700,
  },
  loadBtn: {
    background: "#a6e3a1",
    border: "none",
    borderRadius: 4,
    color: "#1e1e2e",
    cursor: "pointer",
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    marginTop: 4,
  },
  riskNote: {
    fontSize: 11,
    color: "#6c7086",
    padding: "4px 16px 12px",
    fontStyle: "italic",
  },
};
