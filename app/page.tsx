"use client"

import { useEffect, useState } from "react"
import UploadTab from "@/components/workflows/upload-tab"
import type { RequestRecord, LatLng } from "@/lib/record-types"
import { loadStagedRecords, saveStagedRecords } from "@/lib/storage"
import { loadWorkArea, saveWorkArea } from "@/lib/work-area-storage" // ✅ Import moved to top


export default function Page() {
  const [records, setRecords] = useState<RequestRecord[]>([])
  const [preloadedPolygon, setPreloadedPolygon] = useState<LatLng[] | null>(null)
  const [preloadedAreaSqMeters, setPreloadedAreaSqMeters] = useState<number | null>(null)

  useEffect(() => {
    const initial = loadStagedRecords()
    if (initial.length) setRecords(initial)
  }, []);

  useEffect(() => {
    // 🔄 Fetch most recent polygon from Supabase
    fetch("/api/work-areas")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.workAreas.length > 0) {
          const workArea = data.workAreas[0];
          setPreloadedPolygon(workArea.polygon);
          // Optional: calculate area client-side if needed
          // setPreloadedAreaSqMeters(calculateArea(workArea.polygon));
        }
      })
      .catch((err) => {
        console.error("❌ Failed to fetch persisted work area:", err);
      });
  }, []);

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
        <h2 id="unified-workflow" className="sr-only">Unified utility records workflow</h2>
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
