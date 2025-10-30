"use client"

import { supabase } from "@/lib/supabase"
import type { GeoJSON } from "geojson"

export default function GlobalDevBar() {
  async function insertTestPolygon() {
    const poly: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [-79.38, 43.65],
          [-79.38, 43.66],
          [-79.37, 43.66],
          [-79.37, 43.65],
          [-79.38, 43.65],
        ],
      ],
    }

    console.log("[v0] Attempting to insert test polygon:", poly)

    const { data, error } = await supabase
      .from("work_areas")
      .insert([{ name: "Test Polygon", geom: poly as any }])
      .select()
      .single()

    console.log("[v0] insertTestPolygon result →", { data, error })
    alert(error ? `❌ ${error.message}` : `✅ inserted: ${data?.id}`)
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 999999,
        background: "#111",
        color: "#fff",
        padding: 10,
        borderRadius: 12,
        boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
      }}
    >
      <button
        onClick={insertTestPolygon}
        style={{
          background: "#22c55e",
          color: "#111",
          padding: "10px 14px",
          borderRadius: 10,
          fontWeight: 800,
          border: "none",
          cursor: "pointer",
        }}
      >
        ➕ INSERT TEST POLYGON (GLOBAL)
      </button>
    </div>
  )
}
