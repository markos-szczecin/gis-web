import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import { createAccidentsLayer, setupClusterClick } from "./layers/accidents";

export default function MapView({ minDate, maxDate }) {
  const containerRef = useRef(null);
  const loadDataRef = useRef(null);

  useEffect(() => {
    const { layer, loadData } = createAccidentsLayer();
    loadDataRef.current = loadData;

    const map = new Map({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() }), layer],
      view: new View({
        center: fromLonLat([14.556684989118507, 53.42750347047982]),
        zoom: 12,
      }),
    });

    setupClusterClick(map, layer);

    return () => map.setTarget(null);
  }, []);

  useEffect(() => {
    if (minDate && maxDate && loadDataRef.current) {
      loadDataRef.current(minDate, maxDate);
    }
  }, [minDate, maxDate]);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}