import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { transform } from "ol/proj";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { Polygon } from "ol/geom";
import type { Polygon as OlPolygon } from "ol/geom";
import { Style, Fill, Stroke } from "ol/style";
import { fetchRiskGrid, type GridCell } from "../services/predictionsService";
import type { WeatherParams } from "../config/weatherConfig";

proj4.defs(
  "EPSG:2180",
  "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);
register(proj4);

const CELL_HALF = 500;

function riskColor(risk: number, maxRisk: number): string {
  const t = maxRisk > 0 ? Math.min(risk / maxRisk, 1) : 0;
  const g = Math.round(200 * (1 - t));
  const a = (0.05 + t * 0.7).toFixed(2);
  return `rgba(255,${g},0,${a})`;
}

function cellRing(cx: number, cy: number): number[][] {
  return [
    [cx - CELL_HALF, cy - CELL_HALF],
    [cx + CELL_HALF, cy - CELL_HALF],
    [cx + CELL_HALF, cy + CELL_HALF],
    [cx - CELL_HALF, cy + CELL_HALF],
    [cx - CELL_HALF, cy - CELL_HALF],
  ].map(([x, y]) => transform([x, y], "EPSG:2180", "EPSG:3857"));
}

const RISK_EPSILON = 0.00001;

function cellStyle(risk: number, maxRisk: number): Style {
  if (risk < RISK_EPSILON) {
    return new Style();
  }
  return new Style({
    fill: new Fill({ color: riskColor(risk, maxRisk) }),
    // stroke: new Stroke({ color: "rgba(200,0,0,0.15)", width: 0.5 }),
  });
}

export function applyPolygonFilter(source: VectorSource, polygon: OlPolygon | null): void {
  const features = source.getFeatures();

  const maxRisk = source.getFeatures().reduce((max, feature) => {
    const [x, y] = feature.get("center3857") as [number, number];
    if (polygon !== null && !polygon.containsXY(x, y)) {
      return max;
    }
    return Math.max(max, feature.get("risk_probability") as number);
  }, 0);

  
  features.forEach((feature) => {
    const [x, y] = feature.get("center3857") as [number, number];
    const inside = polygon === null || polygon.containsXY(x, y);
    feature.setStyle(inside ? cellStyle(feature.get("risk_probability") as number, maxRisk) : new Style());
  });
}

export function createRiskGridLayer(): {
  layer: VectorLayer;
  source: VectorSource;
  loadData: (time: string, weather: WeatherParams) => Promise<void>;
} {
  const source = new VectorSource();
  const layer = new VectorLayer({ source, visible: false });

  const loadData = (time: string, weather: WeatherParams): Promise<void> =>
    fetchRiskGrid(time, weather)
      .then((cells: GridCell[]) => {
        source.clear();
        const maxRisk = cells.reduce((m, c) => Math.max(m, c.risk_probability), 0);
        const features = cells.map((cell) => {
          const center3857 = transform([cell.centroid_x, cell.centroid_y], "EPSG:2180", "EPSG:3857");
          const feature = new Feature({
            geometry: new Polygon([cellRing(cell.centroid_x, cell.centroid_y)]),
            risk_probability: cell.risk_probability,
            cell_id: cell.cell_id,
            center3857,
          });
          feature.setStyle(cellStyle(cell.risk_probability, maxRisk));
          return feature;
        });
        source.addFeatures(features);
      })
      .catch((err: Error) => console.error("Failed to load risk grid:", err));

  return { layer, source, loadData };
}
