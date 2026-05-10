import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import OSM from "ol/source/OSM";
import Draw from "ol/interaction/Draw";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import { Style, Fill, Stroke } from "ol/style";
import type { Polygon as OlPolygon } from "ol/geom";
import { createAccidentsLayer, setupClusterClick, type AccidentSummary } from "./layers/accidents";
import { createRiskGridLayer, applyPolygonFilter } from "./layers/riskGrid";
import { extentConstraints, maxZoomLevel, mapCenter, defaultZoom } from "./config/config";
import { type WeatherParams } from "./config/weatherConfig";
import AccidentDetailsModal from "./components/AccidentDetailsModal";
import AccidentListModal from "./components/AccidentListModal";

interface Props {
  minDate: string;
  maxDate: string;
  activeLayer: "accidents" | "riskGrid";
  riskGridTime: string;
  weatherParams: WeatherParams;
}

type ModalState =
  | { type: "details"; id: string }
  | { type: "list"; items: AccidentSummary[] }
  | null;

const selectionStyle = new Style({
  fill: new Fill({ color: "rgba(255,165,0,0.08)" }),
  stroke: new Stroke({ color: "#ff6600", width: 2, lineDash: [6, 4] }),
});

export default function MapView({ minDate, maxDate, activeLayer, riskGridTime, weatherParams }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadAccidentsRef = useRef<((minDate: string, maxDate: string) => void) | null>(null);
  const loadRiskGridRef = useRef<((time: string, weather: WeatherParams) => Promise<void>) | null>(null);
  const accidentsLayerRef = useRef<ReturnType<typeof createAccidentsLayer>["layer"] | null>(null);
  const riskGridLayerRef = useRef<ReturnType<typeof createRiskGridLayer>["layer"] | null>(null);
  const riskSourceRef = useRef<VectorSource | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);
  const selectionSourceRef = useRef<VectorSource | null>(null);
  const polygonRef = useRef<OlPolygon | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [drawActive, setDrawActive] = useState(false);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [showDrawHint, setShowDrawHint] = useState(false);

  const closeModal = () => setModal(null);

  useEffect(() => {
    const { layer: accLayer, loadData: loadAccidents } = createAccidentsLayer();
    const { layer: gridLayer, source: riskSource, loadData: loadGrid } = createRiskGridLayer();

    loadAccidentsRef.current = loadAccidents;
    loadRiskGridRef.current = loadGrid;
    accidentsLayerRef.current = accLayer;
    riskGridLayerRef.current = gridLayer;
    riskSourceRef.current = riskSource;

    const selectionSource = new VectorSource();
    selectionSourceRef.current = selectionSource;
    const selectionLayer = new VectorLayer({ source: selectionSource, style: selectionStyle });

    const draw = new Draw({ source: selectionSource, type: "Polygon" });
    draw.setActive(false);
    draw.on("drawend", (evt) => {
      const polygon = evt.feature.getGeometry() as OlPolygon;
      polygonRef.current = polygon;
      draw.setActive(false);
      setDrawActive(false);
      setHasPolygon(true);
      // geometry is added to source asynchronously after the event, defer filter
      setTimeout(() => applyPolygonFilter(riskSource, polygon), 0);
    });
    drawInteractionRef.current = draw;

    const map = new Map({
      target: containerRef.current!,
      layers: [new TileLayer({ source: new OSM() }), accLayer, gridLayer, selectionLayer],
      view: new View({
        center: fromLonLat(mapCenter),
        zoom: defaultZoom,
        maxZoom: maxZoomLevel,
        extent: fromLonLat(extentConstraints[0]).concat(fromLonLat(extentConstraints[1])),
      }),
    });
    map.addInteraction(draw);

    setupClusterClick(
      map,
      accLayer,
      (id) => setModal({ type: "details", id }),
      (items) => setModal({ type: "list", items }),
    );

    return () => map.setTarget(undefined);
  }, []);

  // Accidents layer: visibility + reload
  useEffect(() => {
    if (!accidentsLayerRef.current || !loadAccidentsRef.current) return;
    const visible = activeLayer === "accidents";
    accidentsLayerRef.current.setVisible(visible);
    if (visible && minDate && maxDate) loadAccidentsRef.current(minDate, maxDate);
  }, [activeLayer, minDate, maxDate]);

  // Risk grid layer: visibility + reload, re-apply polygon filter after load
  useEffect(() => {
    if (!riskGridLayerRef.current || !loadRiskGridRef.current) return;
    const visible = activeLayer === "riskGrid";
    riskGridLayerRef.current.setVisible(visible);
    if (!visible) {
      clearPolygonState();
      return;
    }
    if (riskGridTime) {
      loadRiskGridRef.current(riskGridTime, weatherParams).then(() => {
        if (polygonRef.current) applyPolygonFilter(riskSourceRef.current!, polygonRef.current);
      });
    }
  }, [activeLayer, riskGridTime, weatherParams]);

  function clearPolygonState() {
    drawInteractionRef.current?.setActive(false);
    selectionSourceRef.current?.clear();
    polygonRef.current = null;
    setDrawActive(false);
    setHasPolygon(false);
  }

  const startDraw = () => {
    selectionSourceRef.current!.clear();
    polygonRef.current = null;
    setHasPolygon(false);
    if (riskSourceRef.current) applyPolygonFilter(riskSourceRef.current, null);
    drawInteractionRef.current!.setActive(true);
    setDrawActive(true);
  };

  const handleDrawAreaClick = () => {
    if (!localStorage.getItem("drawAreaHintSeen")) {
      setShowDrawHint(true);
    } else {
      startDraw();
    }
  };

  const dismissDrawHint = () => {
    localStorage.setItem("drawAreaHintSeen", "1");
    setShowDrawHint(false);
    startDraw();
  };

  const cancelDraw = () => {
    drawInteractionRef.current!.abortDrawing();
    drawInteractionRef.current!.setActive(false);
    setDrawActive(false);
  };

  const clearPolygon = () => {
    selectionSourceRef.current!.clear();
    polygonRef.current = null;
    if (riskSourceRef.current) applyPolygonFilter(riskSourceRef.current, null);
    setHasPolygon(false);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {activeLayer === "riskGrid" && (
        <div style={toolbar}>
          {!drawActive && !hasPolygon && (
            <button style={mapBtnDraw} onClick={handleDrawAreaClick}>Draw area</button>
          )}
          {drawActive && (
            <button style={{ ...mapBtn, ...mapBtnCancel }} onClick={cancelDraw}>Cancel</button>
          )}
          {!drawActive && hasPolygon && (
            <>
              <button style={mapBtn} onClick={startDraw}>Redraw</button>
              <button style={{ ...mapBtn, ...mapBtnClear }} onClick={clearPolygon}>Clear area</button>
            </>
          )}
        </div>
      )}

      {showDrawHint && (
        <div style={hintOverlay}>
          <div style={hintBox}>
            <div style={hintTitle}>Draw Area Filter</div>
            <p style={hintBody}>
              Draw a polygon directly on the map to focus the risk heatmap on a specific area.
              Only cells inside the polygon will be coloured; the colour scale resets to the local maximum so subtle differences become visible.
            </p>
            <p style={hintBody}>
              <strong>How to use:</strong> click to place vertices, double-click to close the polygon.
              Use <em>Redraw</em> to start over or <em>Clear area</em> to remove the filter.
            </p>
            <button style={hintBtn} onClick={dismissDrawHint}>Got it — start drawing</button>
          </div>
        </div>
      )}

      {modal?.type === "details" && (
        <AccidentDetailsModal id={modal.id} onClose={closeModal} />
      )}
      {modal?.type === "list" && (
        <AccidentListModal
          items={modal.items}
          onSelect={(id) => setModal({ type: "details", id })}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

const toolbar: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  display: "flex",
  gap: 8,
  zIndex: 1000,
};

const mapBtn: React.CSSProperties = {
  background: "#1e1e2e",
  border: "1px solid #45475a",
  borderRadius: 4,
  color: "#cdd6f4",
  cursor: "pointer",
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "sans-serif",
  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
};

const mapBtnDraw: React.CSSProperties = {
  ...mapBtn,
  padding: "10px 20px",
  fontSize: 15,
};

const mapBtnCancel: React.CSSProperties = {
  background: "#f38ba8",
  borderColor: "#f38ba8",
  color: "#1e1e2e",
};

const mapBtnClear: React.CSSProperties = {
  background: "#fab387",
  borderColor: "#fab387",
  color: "#1e1e2e",
};

const hintOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};

const hintBox: React.CSSProperties = {
  background: "#1e1e2e",
  border: "1px solid #45475a",
  borderRadius: 8,
  padding: "28px 32px",
  maxWidth: 420,
  color: "#cdd6f4",
  fontFamily: "sans-serif",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
};

const hintTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 14,
  color: "#89b4fa",
};

const hintBody: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  marginBottom: 12,
  color: "#cdd6f4",
};

const hintBtn: React.CSSProperties = {
  marginTop: 8,
  background: "#a6e3a1",
  border: "none",
  borderRadius: 4,
  color: "#1e1e2e",
  cursor: "pointer",
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  width: "100%",
};
