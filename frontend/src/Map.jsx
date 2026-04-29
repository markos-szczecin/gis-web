import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import "ol/ol.css";
import { fromLonLat } from "ol/proj";
import { createAccidentsLayer } from "./layers/accidents";

export default function MapView() {
  const containerRef = useRef(null);

  useEffect(() => {
    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        createAccidentsLayer(),
      ],
      view: new View({
        center: fromLonLat([14.556684989118507, 53.42750347047982]),
        zoom: 12,
      }),
    });

    return () => map.setTarget(null);
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}