import type { GeoJSON } from "geojson"

// Shared types
export type UtilityType =
  | "water"
  | "sewer"
  | "gas"
  | "electric"
  | "communication"
  | "reclaimed"
  | "survey"
  | "proposed"
  | "default"

export type SaveEvents = {
  onWorkAreaSave?: (polygon: GeoJSON.Polygon) => void
  onMarkupSave?: (feature: GeoJSON.Feature, utility: UtilityType) => void
}

export type DrawMode = "none" | "polygon" | "line" | "point"

export interface MapAdapter {
  /** Attach to a DOM container and initialize the map */
  init(container: HTMLElement, opts?: { center?: [number, number]; zoom?: number }): void

  /** Set or replace the current work area polygon to render */
  setWorkArea(polygon: GeoJSON.Polygon | null): void

  /** Set or replace the current record feature collection to render */
  setFeatures(fc: GeoJSON.FeatureCollection | null): void

  /** Control drawing tools */
  setDrawMode(mode: DrawMode): void

  /** Pick APWA utility type for the next markup save */
  setUtilityType(utility: UtilityType): void

  /** Subscribe to save events (work area, markup) */
  setHandlers(handlers: SaveEvents): void

  /** Clean up listeners and map instance */
  destroy(): void
}
