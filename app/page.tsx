"use client"

import { useEffect, useState } from "react"
import UploadTab from "@/components/workflows/upload-tab"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import { loadStagedRecords, saveStagedRecords } from "@/lib/storage"

type PreloadedRequest = {
  createdAt: string
  polygon: LatLng[]
  areaSqMeters?: number
  title?: string
  deadline?: string
  records?: RequestRecord[]
}

export default function Page() {
  // Shared records state for the unified workflow
  const [records, setRecords] = useState<RequestRecord[]>([])
  const [preloadedPolygon, setPreloadedPolygon] = useState<LatLng[] | null>(null)
  const [preloadedAreaSqMeters, setPreloadedAreaSqMeters] = useState<number | null>(null)

  useEffect(() => {
    const initial = loadStagedRecords()
    if (initial.length) setRecords(initial)

    const preloadedData = sessionStorage.getItem("preloadedRequest")
    if (preloadedData) {
      try {
        const parsed: PreloadedRequest = JSON.parse(preloadedData)
        if (parsed.polygon && parsed.polygon.length >= 3) {
          setPreloadedPolygon(parsed.polygon)
          setPreloadedAreaSqMeters(parsed.areaSqMeters || null)

          // If there are existing records in the request, merge them
          if (parsed.records && parsed.records.length > 0) {
            setRecords((prev) => [...parsed.records!, ...prev])
          }
        }
        // Clear the session storage after loading
        sessionStorage.removeItem("preloadedRequest")
      } catch (e) {
        console.warn("Failed to parse preloaded request data:", e)
      }
    }
  }, [])

  useEffect(() => {
    saveStagedRecords(records)
  }, [records])

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6 relative z-10 bg-white">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">UTILITX — The trusted basemap</h1>
        <p className="text-muted-foreground">
          🗺️ Define your work area on the map → 📤 Upload utility records → 📍 Mark their locations → 🔗 Share with your
          team. Everything in one unified workflow.
        </p>
      </header>

      <section aria-labelledby="unified-workflow">
        <h2 id="unified-workflow" className="sr-only">
          Unified utility records workflow
        </h2>
        <UploadTab
          records={records}
          setRecords={setRecords}
          preloadedPolygon={preloadedPolygon}
          preloadedAreaSqMeters={preloadedAreaSqMeters}
        />
      </section>
    </main>
  )
}
