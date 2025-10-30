"use client"

import { useState, useEffect } from "react"
import type { UtilityType, DrawMode, MapAdapter } from "@/lib/map/MapAdapter"
import { supabase } from "@/lib/supabase"
import type { GeoJSON } from "geojson"
import { MapAdapterView } from "@/components/MapAdapterView"
import { uploadRecord as uploadRecordToStorage } from "@/lib/upload-record"
import dynamic from "next/dynamic"

const WorkspaceFilesListSafe = dynamic(() => import("@/components/workspace-files-list-safe"), { ssr: false })

function WorkspaceClient() {
  const [workAreaId, setWorkAreaId] = useState<string | null>(null)
  const [workAreaGeom, setWorkAreaGeom] = useState<GeoJSON.Polygon | null>(null)
  const [features, setFeatures] = useState<GeoJSON.FeatureCollection | null>(null)
  const [drawMode, setDrawMode] = useState<DrawMode>("none")
  const [utility, setUtility] = useState<UtilityType>("water")
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("")
  const [adapter, setAdapter] = useState<MapAdapter | null>(null)

  useEffect(() => {
    console.log("[v0] WorkspaceClient mounted ✅")
  }, [])

  useEffect(() => {
    import("@/lib/map/LeafletMapAdapter").then(({ LeafletMapAdapter }) => {
      setAdapter(new LeafletMapAdapter())
    })
  }, [])

  const handlers = {
    onWorkAreaSave: async (poly: GeoJSON.Polygon) => {
      setStatus("Saving work area…")
      const { data, error } = await supabase
        .from("work_areas")
        .insert([{ name: "Work Area", geom: poly as any }])
        .select()
        .single()

      if (error) {
        setStatus("❌ Failed to save work area")
        console.error(error)
        return
      }
      setWorkAreaId(data.id)
      setWorkAreaGeom(poly)
      setStatus(`✅ Work area saved • id: ${data.id}`)
      setDrawMode("none")
    },
    onMarkupSave: async (feat: GeoJSON.Feature, ut: UtilityType) => {
      if (!activeRecordId) {
        setStatus("⚠️ Upload/select a record first")
        return
      }
      setStatus("Saving markup…")
      const { error } = await supabase
        .from("records")
        .update({ geometry: feat.geometry as any, utility_type: ut })
        .eq("id", activeRecordId)
      if (error) {
        setStatus("❌ Failed to save markup")
        console.error(error)
        return
      }

      setFeatures((prev) => ({
        type: "FeatureCollection",
        features: [
          ...(prev?.features ?? []),
          { type: "Feature", properties: { utility_type: ut }, geometry: feat.geometry! },
        ],
      }))
      setStatus("✅ Markup saved")
      setDrawMode("none")
    },
  }

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

    const { data, error } = await supabase
      .from("work_areas")
      .insert([{ name: "Test Polygon", geom: poly as any }])
      .select()
      .single()

    console.log("[v0] insertTestPolygon →", { data, error })
    alert(error ? `❌ ${error.message}` : `✅ inserted: ${data.id}`)

    if (data) {
      setStatus(`✅ Test polygon inserted • id: ${data.id}`)
    }
  }

  async function uploadRecord(file: File, recordType: string) {
    if (!workAreaId) {
      setStatus("⚠️ Draw & save a work area first")
      return
    }

    console.log("[v0] workspace-client uploadRecord triggered:", { fileName: file.name, recordType, workAreaId })

    setStatus("Uploading file…")

    try {
      const record = await uploadRecordToStorage({
        file,
        workAreaId,
        recordType,
        orgName: "municipality",
      })

      console.log("[v0] Upload completed successfully:", record)
      setActiveRecordId(record.id)
      setStatus(`✅ File saved • record id: ${record.id}`)
    } catch (error) {
      console.error("[v0] Upload failed with error:", error)
      setStatus("❌ Upload failed")
      console.error(error)
    }
  }

  async function refreshFeatures() {
    if (!workAreaId) return
    const { data, error } = await supabase
      .from("records")
      .select("id,utility_type,geometry")
      .eq("work_area_id", workAreaId)
      .not("geometry", "is", null)
    if (error) return
    setFeatures({
      type: "FeatureCollection",
      features: (data ?? []).map((r: any) => ({
        type: "Feature",
        properties: { utility_type: r.utility_type ?? "default" },
        geometry: r.geometry,
      })),
    })
  }

  function handleDrawWorkArea() {
    setDrawMode("polygon")
    setStatus("🖊️ Drawing: Polygon")
  }
  function handleGeometryMode(mode: DrawMode) {
    if (!activeRecordId) {
      setStatus("⚠️ Upload/select a record first")
      return
    }
    setDrawMode(mode)
    setStatus(`🖊️ Drawing: ${mode}`)
  }

  async function handleGenerateShareLink() {
    if (!workAreaId) {
      setStatus("⚠️ Save a work area first")
      return
    }
    setStatus("Generating share link…")
    const token = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    const { data, error } = await supabase
      .from("share_links")
      .insert([{ work_area_id: workAreaId, token }])
      .select("token")
      .single()
    if (error) {
      setStatus("❌ Could not create link")
      console.error(error)
      return
    }
    const url = typeof window !== "undefined" ? `${window.location.origin}/share/${data.token}` : `/share/${data.token}`
    setStatus(`🔗 Copied: ${url}`)
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(url)
      } catch {}
    }
  }

  function handleReset() {
    setWorkAreaId(null)
    setWorkAreaGeom(null)
    setActiveRecordId(null)
    setFeatures(null)
    setDrawMode("none")
    setStatus("🔄 Reset. Draw a new work area.")
  }

  if (!adapter) {
    return (
      <div className="grid gap-4">
        <header>
          <h1 className="text-xl font-semibold">UTILITX — The trusted basemap</h1>
          <p className="text-sm text-gray-600">Loading map...</p>
        </header>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-xl font-semibold">UTILITX — The trusted basemap</h1>
        <p className="text-sm text-gray-600">🗺️ Draw → 📤 Upload → 📍 Markup → 🔗 Share.</p>
      </header>

      <section className="border rounded-lg p-3">
        <h2 className="font-medium mb-2">1 · Define Work Area</h2>
        <p className="text-sm mb-2">Draw a polygon to define your corridor/intersection.</p>
        <div className="flex gap-2 mb-2">
          <button onClick={handleDrawWorkArea} className="border px-3 py-1 rounded">
            Draw work area on map
          </button>
          {workAreaId && <span className="text-xs text-gray-600">id: {workAreaId}</span>}
        </div>
      </section>

      <section className="border rounded-lg p-3">
        <h2 className="font-medium mb-2">2 · Attach Records</h2>

        <div className="flex flex-wrap gap-2 mb-2 text-sm">
          {["as_built", "permit", "locate", "other"].map((rt) => (
            <label key={rt} className="border rounded px-2 py-1 cursor-pointer">
              <input
                type="file"
                hidden
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadRecord(f, rt)
                }}
              />
              Upload {rt.replace("_", " ")}
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={utility}
            onChange={(e) => setUtility(e.target.value as UtilityType)}
            className="border rounded px-2 py-1 text-sm"
            title="APWA utility type for next markup"
          >
            <option value="water">Water</option>
            <option value="sewer">Wastewater</option>
            <option value="proposed">Storm/Proposed</option>
            <option value="gas">Gas</option>
            <option value="communication">Telecom</option>
            <option value="electric">Electric</option>
            <option value="reclaimed">Reclaimed</option>
            <option value="survey">Survey</option>
          </select>

          <span className="text-xs text-gray-500">Draw:</span>
          <button onClick={() => handleGeometryMode("point")} className="border px-2 py-1 rounded">
            ● Point
          </button>
          <button onClick={() => handleGeometryMode("line")} className="border px-2 py-1 rounded">
            ━ Line
          </button>
          <button onClick={() => handleGeometryMode("polygon")} className="border px-2 py-1 rounded">
            ▢ Polygon
          </button>
          <button onClick={() => setDrawMode("none")} className="border px-2 py-1 rounded">
            Stop
          </button>
        </div>
      </section>

      <section className="border rounded-lg p-3">
        <h2 className="font-medium mb-2">Uploaded Files</h2>
        {workAreaId ? (
          <WorkspaceFilesListSafe workAreaId={workAreaId} />
        ) : (
          <p className="text-sm text-muted-foreground">Save a work area first to see uploaded files</p>
        )}
      </section>

      <section className="border rounded-lg p-3">
        <h2 className="font-medium mb-2">Draw on Map</h2>
        <MapAdapterView
          adapter={adapter}
          workArea={workAreaGeom}
          features={features}
          drawMode={drawMode}
          utility={utility}
          handlers={handlers}
          height="65vh"
        />
        <div className="text-sm text-gray-600 mt-2">
          {status || (workAreaId ? "" : "No polygon yet. You can still georeference files.")}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <button onClick={handleGenerateShareLink} className="border px-3 py-2 rounded">
          Generate secure sharing link
        </button>
        <button onClick={handleReset} className="border px-3 py-2 rounded">
          Complete Upload & Start New
        </button>
        <button onClick={refreshFeatures} className="ml-auto border px-3 py-2 rounded">
          Refresh features
        </button>
        <button onClick={insertTestPolygon} className="border px-3 py-2 rounded bg-yellow-50">
          🧪 Test Insert Polygon
        </button>
      </section>
    </div>
  )
}

export default WorkspaceClient
