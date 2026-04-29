import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Cluster from "ol/source/Cluster";
import { Style, Circle as CircleStyle, Fill, Stroke, Text } from "ol/style";
import type { FeatureLike } from "ol/Feature";
import Feature from "ol/Feature";
import { fromExtent } from "ol/geom/Polygon";
import { extend as extendExtent, createEmpty, isEmpty } from "ol/extent";
import type { Extent } from "ol/extent";
import type Map from "ol/Map";
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

export function setupClusterClick(map: Map, layer: VectorLayer): void {
  const getFlashSourceLayer = (extent: Extent): VectorLayer => {
    const flashSource = new VectorSource({
      features: [new Feature(fromExtent(extent))],
    });

    const flashLayer = new VectorLayer({
      source: flashSource,
      style: new Style({
        stroke: new Stroke({ color: "#ff6600", width: 2 }),
        fill: new Fill({ color: "rgba(255, 102, 0, 0.15)" }),
      }),
    });
    flashLayer.set("isFlashLayer", true);
    
    return flashLayer;
  };

  const removeFlashLayer = () => {
    map.getLayers().forEach((l) => {
      if (l && l.get("isFlashLayer")) map.removeLayer(l);
    });
  };

  map.on('pointermove', (evt) => {
    map.forEachFeatureAtPixel(
      evt.pixel,
      (feature) => {
        const subFeatures = feature.get("features") as FeatureLike[];
        if (!subFeatures || subFeatures.length <= 2) {
          removeFlashLayer();
          return;
        }

        const extent: Extent = createEmpty();
        for (const f of subFeatures) {
          const geom = f.getGeometry();
          if (geom) extendExtent(extent, geom.getExtent());
        }
        if (isEmpty(extent)) return;

        const resolution = map.getView().getResolution() ?? 1;
        const minSize = 40 * resolution;
        const cx = (extent[0] + extent[2]) / 2;
        const cy = (extent[1] + extent[3]) / 2;
        if (extent[2] - extent[0] < minSize) {
          extent[0] = cx - minSize / 2;
          extent[2] = cx + minSize / 2;
        }
        if (extent[3] - extent[1] < minSize) {
          extent[1] = cy - minSize / 2;
          extent[3] = cy + minSize / 2;
        }

        const flashLayer = getFlashSourceLayer(extent);

        map.addLayer(flashLayer);
      });
  });

  map.on("singleclick", (evt) => {
    map.forEachFeatureAtPixel(
      evt.pixel,
      (feature) => {
        const subFeatures = feature.get("features") as FeatureLike[];
        if (!subFeatures || subFeatures.length <= 1) return;

        const extent: Extent = createEmpty();
        for (const f of subFeatures) {
          const geom = f.getGeometry();
          if (geom) extendExtent(extent, geom.getExtent());
        }
        
        if (isEmpty(extent)) return;

        map.getView().fit(extent, { duration: 500, padding: [60, 60, 60, 60] });
        removeFlashLayer();

        return true;
      },
      { layerFilter: (l) => l === layer }
    );
  });
}
