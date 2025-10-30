"use server"

import { createClient } from "@supabase/supabase-js"
import type { GeoJSON } from "geojson"

export async function insertTestPolygon() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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

  console.log("[v0] Server: Attempting to insert test polygon...")

  const { data, error } = await supabase
    .from("work_areas")
    .insert([{ name: "Test Polygon", geom: poly as any }])
    .select()
    .single()

  console.log("[v0] Server: insertTestPolygon result →", { data, error })

  return {
    success: !error,
    message: error ? error.message : `Inserted: ${data?.id}`,
    data,
    error,
  }
}

export async function testInsertRecord() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  console.log("[v0] Server: Fetching latest work area...")

  // 1) Fetch latest work area
  const { data: wa, error: waErr } = await supabase
    .from("work_areas")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (waErr || !wa) {
    console.error("[v0] Server: No work area found", waErr)
    return {
      success: false,
      error: "No work area found. Draw/insert one first.",
      data: null,
    }
  }

  console.log("[v0] Server: Found work area:", wa.id)
  console.log("[v0] Server: Attempting to insert test record...")

  // 2) Insert a dummy record linked to that work area
  const { data, error } = await supabase
    .from("records")
    .insert([
      {
        work_area_id: wa.id,
        file_name: "dummy.pdf",
        file_url: `uploads/${wa.id}/dummy.pdf`,
        mime_type: "application/pdf",
        size_bytes: 12345,
      },
    ])
    .select()
    .single()

  console.log("[v0] Server: testInsertRecord result →", { wa, data, error })

  return {
    success: !error,
    message: error ? error.message : `Inserted record: ${data?.id}`,
    data,
    error: error ? error.message : null,
  }
}
