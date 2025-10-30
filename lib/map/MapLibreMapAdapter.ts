import type { MapAdapter, DrawMode, UtilityType, SaveEvents } from "./MapAdapter"
import type { GeoJSON } from "geojson"

export class MapLibreMapAdapter implements MapAdapter {
  private handlers: SaveEvents = {}
  setHandlers(h: SaveEvents) {
    this.handlers = h
  }

  init(container: HTMLElement) {
    /* TODO: create new maplibre-gl.Map(...) */
  }
  setWorkArea(_polygon: GeoJSON.Polygon | null) {
    /* TODO */
  }
  setFeatures(_fc: GeoJSON.FeatureCollection | null) {
    /* TODO */
  }
  setDrawMode(_mode: DrawMode) {
    /* TODO: add draw lib, e.g., mapbox-gl-draw */
  }
  setUtilityType(_utility: UtilityType) {
    /* TODO */
  }
  destroy() {
    /* TODO: map.remove() */
  }
}
