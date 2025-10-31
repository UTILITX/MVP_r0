"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { MapWithDrawing, type MapMarker } from "@/components/map-with-drawing"
import { RecordSelectorTable } from "@/components/record-selector-table"
import { UploadFilesTable } from "@/components/upload-files-table"
import { type LatLng, type RequestRecord } from "@/lib/record-types"
import { formatDistanceToNow } from "date-fns"
import UploadTab from "@/components/workflows/upload-tab"
import { loadStagedRecords, saveStagedRecords } from "@/lib/storage"

type SelectedType = {
  id: string
  path: string
  priority: 1 | 2 | 3
} | null

export default function UploadPage() {
  const { toast } = useToast()
  const [polygon, setPolygon] = useState<LatLng[] | null>(null)
  const [areaSqMeters, setAreaSqMeters] = useState<number | null>(null)

  const [selectedType, setSelectedType] = useState<SelectedType>(null)
  const [orgName, setOrgName] = useState<string>("")
  const [files, setFiles] = useState<FileList | null>(null)
  const [records, setRecords] = useState<RequestRecord[]>([])
  const [uploaderName, setUploaderName] = useState<string>("")

  // Georeference state
  const [pickActive, setPickActive] = useState(false)
  const [target, setTarget] = useState<{ recordId: string; fileId: string } | null>(null)
  const [picked, setPicked] = useState<LatLng | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    const initial = loadStagedRecords()
    if (initial.length) setRecords(initial)
  }, [])

  useEffect(() => {
    saveStagedRecords(records)
  }, [records])

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = []
    for (const rec of records) {
      for (const f of rec.files) {
        if (f.status === "Georeferenced" && typeof f.lat === "number" && typeof f.lng === "number") {
          list.push({
            id: f.id,
            position: { lat: f.lat, lng: f.lng },
            title: f.name,
            description: `${rec.recordTypePath} • P${rec.priority}\n${rec.orgName ? `Org: ${rec.orgName} • ` : ""}Uploaded ${formatDistanceToNow(new Date(rec.uploadedAt), { addSuffix: true })}`,
          })
        }
      }
    }
    return list
  }, [records])

  const totalFiles = useMemo(() => records.reduce((acc, r) => acc + r.files.length, 0), [records])

  function addFilesToQueue() {
    if (!polygon || polygon.length < 3) {
      toast({ title: "Draw a polygon", description: "Define the work area first.", variant: "destructive" })
      return
    }
    if (!selectedType) {
      toast({ title: "Select a record type", description: "Choose a type in the selector.", variant: "destructive" })
      return
    }
    if (!orgName.trim()) {
      toast({ title: "Enter organization", description: "Provide the organization name.", variant: "destructive" })
      return
    }
    if (!files || files.length === 0) {
      toast({ title: "Attach at least one file", description: "Upload PDFs or images.", variant: "destructive" })
      return
    }

    const newRecord: RequestRecord = {
      id: crypto.randomUUID(),
      uploaderName: uploaderName.trim() || "Uploader",
      uploadedAt: new Date().toISOString(),
      recordTypeId: selectedType.id as any,
      recordTypePath: selectedType.path,
      priority: selectedType.priority,
      orgName: orgName.trim(),
      files: Array.from(files).map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        type: f.type,
        status: "Not Georeferenced",
      })),
    }

    setRecords((prev) => [newRecord, ...prev])
    setFiles(null)
    const el = document.getElementById("upload-file-input") as HTMLInputElement | null
    if (el) el.value = ""
    toast({ title: "Files added", description: "Your files were queued with metadata." })
  }

  function startGeoreference(payload: { recordId: string; fileId: string }) {
    setTarget(payload)
    setPickActive(true)
    toast({ title: "Georeference mode", description: "Click on the map to set the file location." })
  }

  function onPick(latlng: LatLng) {
    setPicked(latlng)
    setPickActive(false)
    setConfirmOpen(true)
  }

  function confirmGeoreference() {
    if (!target || !picked) return
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== target.recordId) return r
        return {
          ...r,
          files: r.files.map((f) =>
            f.id === target.fileId
              ? {
                  ...f,
                  status: "Georeferenced",
                  lat: picked.lat,
                  lng: picked.lng,
                  georefAt: new Date().toISOString(),
                  georefBy: uploaderName.trim() || "Uploader",
                }
              : f
          ),
        }
      })
    )
    setConfirmOpen(false)
    setTarget(null)
    setPicked(null)
    toast({ title: "Georeferenced", description: "Location saved for the file." })
  }

  function cancelGeoreference() {
    setConfirmOpen(false)
    setTarget(null)
    setPicked(null)
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <UploadTab records={records} setRecords={setRecords} />
    </main>
  )
}
