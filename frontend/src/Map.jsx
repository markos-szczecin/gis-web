import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import { createAccidentsLayer, setupClusterClick } from "./layers/accidents";
import { extentConstraints, maxZoomLevel, mapCenter, defaultZoom } from "./config/config";
import AccidentDetailsModal from "./components/AccidentDetailsModal";
import AccidentListModal from "./components/AccidentListModal";

export default function MapView({ minDate, maxDate }) {
  const containerRef = useRef(null);
  const loadDataRef = useRef(null);
  const [modal, setModal] = useState(null);

  const closeModal = () => setModal(null);

  useEffect(() => {
    const { layer, loadData } = createAccidentsLayer();
    loadDataRef.current = loadData;

    const map = new Map({
      target: containerRef.current,
      layers: [new TileLayer({source: new OSM() }), layer],
      view: new View({
        center: fromLonLat(mapCenter),
        zoom: defaultZoom,
        maxZoom: maxZoomLevel,
        extent: fromLonLat(extentConstraints[0]).concat(fromLonLat(extentConstraints[1])),
      }),
    });

    setupClusterClick(
      map,
      layer,
      (id) => setModal({ type: "details", id }),
      (items) => setModal({ type: "list", items }),
    );

    return () => map.setTarget(null);
  }, []);

  useEffect(() => {
    if (minDate && maxDate && loadDataRef.current) {
      loadDataRef.current(minDate, maxDate);
    }
  }, [minDate, maxDate]);

  return (
    <>
      <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />
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
    </>
  );
}