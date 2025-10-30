import type { MapAdapter, DrawMode, UtilityType, SaveEvents } from "./MapAdapter"
import L from "leaflet"
import "leaflet-draw" // css is imported globally in layout
import type { GeoJSON } from "geojson" // declare the GeoJSON variable

import iconUrl from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"
L.Icon.Default.mergeOptions({
  iconUrl: (iconUrl as any).src ?? (iconUrl as any),
  shadowUrl: (iconShadow as any).src ?? (iconShadow as any),
})

const APWA: Record<UtilityType, string> = {
  water: "#0000FF",
  reclaimed: "#800080",
  sewer: "#00FF00",
  gas: "#FFFF00",
  electric: "#FF0000",
  communication: "#FFA500",
  survey: "#FFC0CB",
  proposed: "#FFFFFF",
  default: "#808080",
}

export class LeafletMapAdapter implements MapAdapter {
  private map: L.Map | null = null
  private fg: L.FeatureGroup = new L.FeatureGroup() // drawn and rendered layers
  private draw: any | null = null
  private handlers: SaveEvents = {}
  private utility: UtilityType = "water"

  init(container: HTMLElement, opts?: { center?: [number, number]; zoom?: number }) {
    if (this.map) return
    const center = opts?.center ?? [43.6532, -79.3832]
    const zoom = opts?.zoom ?? 12

    this.map = L.map(container, { center, zoom })
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map)

    this.fg.addTo(this.map)

    // initial draw control (inactive)
    this.draw = new (L as any).Control.Draw({
      edit: { featureGroup: this.fg },
      draw: {
        polygon: false,
        polyline: false,
        marker: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
      },
    })
    this.map.addControl(this.draw)

    this.map.on((L as any).Draw.Event.CREATED, (e: any) => {
      console.log("[v0] Draw event fired!", e)

      const layer = e.layer as L.Layer
      this.fg.addLayer(layer)

      const feat = (layer as any).toGeoJSON() as GeoJSON.Feature
      console.log("[v0] Feature from toGeoJSON:", feat)
      console.log("[v0] Geometry only:", feat.geometry)
      console.log("[v0] Geometry type:", feat.geometry.type)

      if (feat.geometry.type === "Polygon") {
        console.log("[v0] Calling onWorkAreaSave with geometry:", feat.geometry)
        this.handlers.onWorkAreaSave?.(feat.geometry as GeoJSON.Polygon)
      } else {
        console.log("[v0] Calling onMarkupSave with feature and utility:", feat, this.utility)
        this.handlers.onMarkupSave?.(feat, this.utility)
      }
    })
  }

  setHandlers(h: SaveEvents) {
    this.handlers = h
  }

  setWorkArea(polygon: GeoJSON.Polygon | null) {
    const toRemove: L.Layer[] = []
    this.fg.eachLayer((l) => {
      const f = (l as any).toGeoJSON?.() as GeoJSON.Feature | undefined
      if (f?.properties?.__wa) toRemove.push(l)
    })
    toRemove.forEach((l) => this.fg.removeLayer(l))

    if (!polygon) return
    const layer = L.geoJSON({ type: "Feature", properties: { __wa: true }, geometry: polygon } as any, {
      style: { color: "#333", weight: 2, fillOpacity: 0.15 },
    })
    layer.addTo(this.fg)
    try {
      this.map?.fitBounds((layer as any).getBounds(), { padding: [20, 20] })
    } catch {}
  }

  setFeatures(fc: GeoJSON.FeatureCollection | null) {
    const toRemove: L.Layer[] = []
    this.fg.eachLayer((l) => {
      const f = (l as any).toGeoJSON?.() as GeoJSON.Feature | undefined
      if (f && !f.properties?.__wa) toRemove.push(l)
    })
    toRemove.forEach((l) => this.fg.removeLayer(l))

    if (!fc) return
    const style = (feat: any) => {
      const t = (feat.properties?.utility_type as UtilityType) ?? "default"
      const color = APWA[t] ?? APWA.default
      const type = feat.geometry?.type
      return { color, weight: type === "LineString" ? 3 : 2, fillOpacity: 0.3 }
    }
    L.geoJSON(fc as any, { style }).addTo(this.fg)
  }

  setDrawMode(mode: DrawMode) {
    if (!this.map) return
    // remove old control
    if (this.draw) this.map.removeControl(this.draw)

    const drawOpts: any = {
      edit: { featureGroup: this.fg },
      draw: {
        polygon: false,
        polyline: false,
        marker: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
      },
    }
    if (mode === "polygon") drawOpts.draw.polygon = true
    if (mode === "line") drawOpts.draw.polyline = true
    if (mode === "point") drawOpts.draw.marker = true

    this.draw = new (L as any).Control.Draw(drawOpts)
    this.map.addControl(this.draw)
  }

  setUtilityType(utility: UtilityType) {
    this.utility = utility
  }

  destroy() {
    if (!this.map) return
    this.map.off()
    this.map.remove()
    this.map = null
  }
}
