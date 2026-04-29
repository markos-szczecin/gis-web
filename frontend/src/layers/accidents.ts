import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Cluster from "ol/source/Cluster";
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from "ol/style";
import type { FeatureLike } from "ol/Feature";
import { fetchAccidents } from "../services/accidentsService";

const styleCache: Record<number, Style> = {};

function clusterStyle(feature: FeatureLike): Style {
  const size: number = (feature.get("features") as FeatureLike[]).length;
  if (!styleCache[size]) {
    styleCache[size] = new Style({
      image: new CircleStyle({
        radius: 15,
        fill: new Fill({ color: "#3399CC" }),
        stroke: new Stroke({ color: "#fff", width: 2 }),
      }),
      text: new Text({
        text: size.toString(),
        fill: new Fill({ color: "#fff" }),
      }),
    });
  }
  return styleCache[size];
}

export function createAccidentsLayer(): VectorLayer {
  const accidentsSource = new VectorSource();

  const clusterSource = new Cluster({
    distance: 40,
    source: accidentsSource,
  });

  fetchAccidents()
    .then((geojson) => {
      const features = new GeoJSON().readFeatures(geojson, {
        featureProjection: "EPSG:3857",
      });
      accidentsSource.addFeatures(features);
    })
    .catch((err: Error) => console.error("Failed to load accidents:", err));

  return new VectorLayer({
    source: clusterSource,
    visible: true,
    style: clusterStyle,
  });
}
