import { useState, useEffect } from "react";
import { WEATHER_CODE_MAP, WEATHER_FIELDS, defaultWeather, type WeatherParams } from "./config/weatherConfig";
import { defaultRiskGridTime } from "./services/predictionsService";
import { defaultFilters } from "./config/config";
import "./Sidebar.css";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

const TIME_SLOTS = [
  { label: "00:00 – 06:00", hour: 0 },
  { label: "06:00 – 12:00", hour: 6 },
  { label: "12:00 – 18:00", hour: 12 },
  { label: "18:00 – 00:00", hour: 18 },
];

function AccidentsControls({
  minDate, maxDate, setMinDate, setMaxDate,
}: {
  minDate: string; maxDate: string;
  setMinDate: (v: string) => void; setMaxDate: (v: string) => void;
}) {
  return (
    <div className="sidebar__section">
      <label className="sidebar__field-label">
        From
        <input type="date" min="2020-01-01" value={minDate} onChange={(e) => setMinDate(e.target.value)} className="sidebar__text-input" />
      </label>
      <label className="sidebar__field-label">
        To
        <input type="date" min="2020-01-01" value={maxDate} onChange={(e) => setMaxDate(e.target.value)} className="sidebar__text-input" />
      </label>
    </div>
  );
}

function RiskGridControls({
  draftTime, draftWeather, setDraftTime, setDraftWeather,
}: {
  draftTime: string; draftWeather: WeatherParams;
  setDraftTime: (v: string) => void; setDraftWeather: (v: WeatherParams) => void;
}) {
  const date = draftTime.slice(0, 10);
  const hour = parseInt(draftTime.slice(11, 13), 10);

  const setDate = (d: string) =>
    setDraftTime(`${d}T${String(hour).padStart(2, "0")}:00`);
  const setSlot = (h: number) =>
    setDraftTime(`${date}T${String(h).padStart(2, "0")}:00`);
  const setWeatherField = (key: keyof WeatherParams, value: number) =>
    setDraftWeather({ ...draftWeather, [key]: value });

  const today = new Date().toISOString().split("T")[0];
  console.log("Today:", today);
  return (
    <>
      <div className="sidebar__section">
        <label className="sidebar__field-label">
          Date
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="sidebar__text-input" />
        </label>
        <div className="sidebar__field-label">
          Time window
          <div className="sidebar__slot-grid">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.hour}
                className={`sidebar__slot-btn${hour === slot.hour ? " sidebar__slot-btn--active" : ""}`}
                onClick={() => setSlot(slot.hour)}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar__section-header">Weather</div>

      <div className="sidebar__section">
        <label className="sidebar__field-label">
          Condition
          <select
            value={draftWeather.weather_code}
            onChange={(e) => setWeatherField("weather_code", Number(e.target.value))}
            className="sidebar__text-input"
          >
            {Object.entries(WEATHER_CODE_MAP).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </label>

        {WEATHER_FIELDS.map((f) => (
          <label key={f.key} className="sidebar__field-label">
            <span className="sidebar__field-row">
              <span>{f.label}</span>
              <span className="sidebar__unit">{f.unit}</span>
            </span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step}
              value={draftWeather[f.key]}
              onChange={(e) => setWeatherField(f.key, parseFloat(e.target.value) || 0)}
              className="sidebar__text-input"
            />
          </label>
        ))}
      </div>

      <div className="sidebar__risk-note">Color: yellow (low) → red (high risk)</div>
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
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => window.matchMedia("(max-width: 768px)").matches);

  const [minDate, setMinDate] = useState(defaultFilters.minDate);
  const [maxDate, setMaxDate] = useState(defaultFilters.maxDate);
  const [draftTime, setDraftTime] = useState(defaultRiskGridTime());
  const [draftWeather, setDraftWeather] = useState<WeatherParams>(defaultWeather);

  const handleLoad = () => {
    if (activeLayer === "accidents") {
      onSubmitAccidents(minDate, maxDate);
    } else {
      onSubmitRiskGrid(draftTime, draftWeather);
    }
  };

  const wrapperClass = [
    "sidebar-wrapper",
    isMobile ? "sidebar-wrapper--mobile" : "",
    collapsed ? "sidebar-wrapper--collapsed" : "",
  ].filter(Boolean).join(" ");

  const sidebarClass = ["sidebar", isMobile ? "sidebar--mobile" : ""].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      <aside className={sidebarClass}>
        <div className="sidebar__scrollable-content">
          <div
            className={`sidebar__header${isMobile ? " sidebar__header--mobile" : ""}`}
            onClick={isMobile ? () => setCollapsed((c) => !c) : undefined}
          >
            Layers
            {isMobile ? (
              <span className="sidebar__collapse-btn sidebar__collapse-btn--indicator">
                {collapsed ? "▲" : "▼"}
              </span>
            ) : (
              <button className="sidebar__collapse-btn" onClick={() => setCollapsed(true)} title="Hide sidebar">◀</button>
            )}
          </div>

          <div className="sidebar__layer-section">
            <button
              className={`sidebar__layer-btn${activeLayer === "accidents" ? " sidebar__layer-btn--active" : ""}`}
              onClick={() => onLayerChange("accidents")}
              title="Shows recorded road accidents as clusters on the map. Click a cluster to zoom in or view individual accident details."
            >
              Road Accidents
            </button>
            <button
              className={`sidebar__layer-btn${activeLayer === "riskGrid" ? " sidebar__layer-btn--active" : ""}`}
              onClick={() => onLayerChange("riskGrid")}
              title="Shows a risk heatmap predicted by an ML model. Configure date, time window, and weather conditions to see where accidents are most likely to occur. Optinally you can Draw area on the map to filter the risk grid to that area."
            >
              Accident Risk Predictor
            </button>
            <a
            className="sidebar__eda-link"
             href="/zs-risk-accident/eda_accidents.html" target="_blank" rel="noopener noreferrer" className="sidebar__eda-link">
              EDA of Accidents Dataset
            </a>
          </div>

          {activeLayer === "accidents" && (
            <AccidentsControls minDate={minDate} maxDate={maxDate} setMinDate={setMinDate} setMaxDate={setMaxDate} />
          )}
          {activeLayer === "riskGrid" && (
            <RiskGridControls draftTime={draftTime} draftWeather={draftWeather} setDraftTime={setDraftTime} setDraftWeather={setDraftWeather} />
          )}
        </div>

        <div className="sidebar__load-btn-footer">
          <button className="sidebar__load-btn" onClick={handleLoad}>Load</button>
        </div>
      </aside>
      {!isMobile && (
        <button
          className="sidebar__tab-btn"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      )}
    </div>
  );
}
