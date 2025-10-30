"use client"
import { useEffect, useRef } from "react"
import type GeoJSON from "geojson" // Added import for GeoJSON
import type { MapAdapter, DrawMode, UtilityType, SaveEvents } from "@/lib/map/MapAdapter"

export default function MapAdapterView({
  adapter,
  workArea,
  features,
  drawMode = "none",
  utility = "water",
  handlers,
  height = "65vh", // Updated default height from 60vh to 65vh
}: {
  adapter: MapAdapter
  workArea: GeoJSON.Polygon | null
  features: GeoJSON.FeatureCollection | null
  drawMode?: DrawMode
  utility?: UtilityType
  handlers?: SaveEvents
  height?: string | number
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    adapter.init(containerRef.current, { center: [43.6532, -79.3832], zoom: 12 })
    if (handlers) adapter.setHandlers(handlers)
    return () => adapter.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    adapter.setWorkArea(workArea)
  }, [adapter, workArea])
  useEffect(() => {
    adapter.setFeatures(features)
  }, [adapter, features])
  useEffect(() => {
    adapter.setDrawMode(drawMode)
  }, [adapter, drawMode])
  useEffect(() => {
    adapter.setUtilityType(utility)
  }, [adapter, utility])

  return <div ref={containerRef} style={{ width: "100%", height }} className="rounded-xl border" />
}
