import { useEffect } from "react"
import { useMemo, useState, useRef } from "react"
import type React from "react"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import { encryptPayload, sealedToHash } from "@/lib/crypto"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { MapWithDrawing, type MapBubble, type GeorefShape } from "@/components/map-with-drawing"
import { UtilityOverviewPanel } from "@/components/utility-overview-panel"
import type { UtilityType, RecordType } from "@/components/dual-record-selector"
import { getUtilityColorsFromPath, getUtilityColorsFromUtilityType } from "@/lib/utility-colors"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import type { GeometryType, GeorefMode, PendingDropMeta } from "@/lib/types"
import { RecordsTable } from "@/components/records-table"
import { Edit } from "lucide-react"

type SelectedType = {
  utilityType: UtilityType
  recordType: RecordType
} | null

type Props = {
  records: RequestRecord[]
  setRecords: React.Dispatch<React.SetStateAction<RequestRecord[]>>
  preloadedPolygon?: LatLng[] | null
  preloadedAreaSqMeters?: number | null
}

export default function UploadTab({ records, setRecords, preloadedPolygon, preloadedAreaSqMeters }: Props) {
  const { toast } = useToast()
  const [polygon, setPolygon] = useState<LatLng[] | null>(null)
  const [areaSqMeters, setAreaSqMeters] = useState<number | null>(null)

  const [selectedType, setSelectedType] = useState<SelectedType>(null)
  const [orgName, setOrgName] = useState<string>("")
  const [files, setFiles] = useState<FileList | null>(null)
  const [uploaderName, setUploaderName] = useState<string>("")
  const [workAreaId, setWorkAreaId] = useState<string | null>(null);


  // New: secure sharing link flow
  const [genOpen, setGenOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [title, setTitle] = useState("")
  const [deadline, setDeadline] = useState<string>("")
  const [passcode, setPasscode] = useState("")

  // Georeference state
  const [georefMode, setGeorefMode] = useState<GeorefMode>("none")
  const [georefColor, setGeorefColor] = useState<string | undefined>(undefined)
  const [target, setTarget] = useState<{ recordId: string; fileId: string } | null>(null)
  const [picked, setPicked] = useState<LatLng | null>(null)
  const [pendingDropMeta, setPendingDropMeta] = useState<PendingDropMeta | null>(null)

  const [pendingDrop, setPendingDrop] = useState<File[] | null>(null)
  const [pendingManualFiles, setPendingManualFiles] = useState<File[] | null>(null)
  const [focusPoint, setFocusPoint] = useState<LatLng | null>(null)

  const [isDraggingSide, setIsDraggingSide] = useState(false)
  const sideDragDepthRef = useRef(0)

  const [isDraggingAttach, setIsDraggingAttach] = useState(false)
  const attachDragDepthRef = useRef(0)

  const [selectedUtilityType, setSelectedUtilityType] = useState<UtilityType | null>(null)
  const [selectedRecordType, setSelectedRecordType] = useState<RecordType | null>(null)
  const [selectedGeometryType, setSelectedGeometryType] = useState<GeometryType | null>(null)

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [notes, setNotes] = useState<string>("")

  const [isGeometryComplete, setIsGeometryComplete] = useState(false)

  const [redrawTarget, setRedrawTarget] = useState<{ recordId: string; fileId: string } | null>(null)

  const [showAllRecords, setShowAllRecords] = useState(false)

  // Map overlays from records
  const { bubbles, shapes } = useMemo(() => {
    const b: MapBubble[] = []
    const s: GeorefShape[] = []

    const getLabelFromPath = (path: string) => {
      const parts = path.split("/").map((p) => p.trim())
      return parts[2] || path
    }

    for (const rec of records) {
      // Try to extract utility type from record path or use fallback
      const colors = getUtilityColorsFromPath(rec.recordTypePath)
      const recordLabel = getLabelFromPath(rec.recordTypePath)

      for (const f of rec.files) {
        if (f.status !== "Georeferenced") continue

        const baseDesc = `${rec.recordTypePath} • P${rec.priority}
${rec.orgName ? `Org: ${rec.orgName} • ` : ""}Uploaded ${formatDistanceToNow(new Date(rec.uploadedAt), { addSuffix: true })}`

        if (f.geomType === "Point" || (!f.geomType && typeof f.lat === "number" && typeof f.lng === "number")) {
          const pos = f.geomType === "Point" && f.path?.[0] ? f.path[0] : { lat: f.lat as number, lng: f.lng as number }

          b.push({
            id: f.id,
            position: pos,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
          })
        } else if (f.geomType === "LineString" && f.path && f.path.length >= 2) {
          s.push({
            id: f.id,
            type: "LineString",
            path: f.path,
            title: f.name,
            description: `${rec.recordTypePath} • P${rec.priority}`,
            strokeColor: colors.stroke,
          })
          const centroid = centroidOfPath(f.path)
          b.push({
            id: `${f.id}-bubble`,
            position: centroid,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
          })
        } else if (f.geomType === "Polygon" && f.path && f.path.length >= 3) {
          s.push({
            id: f.id,
            type: "Polygon",
            path: f.path,
            title: f.name,
            description: `${rec.recordTypePath} • P${rec.priority}`,
            strokeColor: colors.stroke,
            fillColor: colors.fill,
          })
          const centroid = centroidOfPath(f.path)
          b.push({
            id: `${f.id}-bubble`,
            position: centroid,
            title: f.name,
            description: baseDesc,
            recordLabel,
            size: 28,
          })
        }
      }
    }
    return { bubbles: b, shapes: s }
  }, [records])

  const totalFiles = useMemo(() => records.reduce((acc, r) => acc + r.files.length, 0), [records])

  useEffect(() => {
    if (preloadedPolygon && preloadedPolygon.length >= 3) {
      setPolygon(preloadedPolygon)
      setAreaSqMeters(preloadedAreaSqMeters || null)

      toast({
        title: "Work area loaded",
        description: "The work area from the secure request has been loaded. You can now upload utility records.",
        variant: "default",
      })
    }
  }, [preloadedPolygon, preloadedAreaSqMeters, toast])

  // Upload-side actions
  function addFilesToQueue() {
    if (!polygon || polygon.length < 3) {
      toast({ title: "Draw a polygon", description: "Define the work area first.", variant: "destructive" })
      return
    }
    if (!selectedType?.utilityType || !selectedType?.recordType) {
      toast({
        title: "Select record type",
        description: "Choose both utility type and record type.",
        variant: "destructive",
      })
      return
    }

    const hasUploadedFiles = records.some((record) => record.files && record.files.length > 0)
    if (!hasUploadedFiles) {
      toast({
        title: "Upload files first",
        description: "Drop files on the map or drag them to the side panel.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Upload flow started",
      description: "Your files are ready for processing with the selected utility and record types.",
      variant: "default",
    })
  }

  async function startDrawingGeometry() {
    if (!selectedUtilityType || !selectedRecordType || !selectedGeometryType) {
      toast({
        title: "Complete selection",
        description: "Please select utility type, record type, and geometry type first.",
        variant: "destructive",
      })
      return
    }

    

    if (uploadedFiles.length === 0) {
      toast({
        title: "No files uploaded",
        description: "Please upload files first before drawing geometry.",
        variant: "destructive",
      })
      return
    }

      // Upload each file + metadata
    for (const file of uploadedFiles) {
      try {
        await handleUpload(file, workAreaId, {
          utilityType: selectedUtilityType,
          recordType: selectedRecordType,
          geometryType: selectedGeometryType,
          orgName,
          uploaderName,
          notes,
        });
        toast({ title: "Upload successful", description: `${file.name} uploaded` });
      } catch (error: any) {
        toast({ title: "Upload failed", description: error.message || "Unknown error", variant: "destructive" });
        return; // stop further processing if upload fails
      }
    }

    // Set up the selected type
    setSelectedType({
      utilityType: selectedUtilityType,
      recordType: selectedRecordType,
    })

    // Set up pending drop meta with uploaded files
    setPendingDropMeta({
      files: uploadedFiles,
      type: {
        utilityType: selectedUtilityType,
        recordType: selectedRecordType,
      },
      org: orgName || "Organization",
      name: uploaderName || "",
      notes: notes,
    })

    // Use APWA colors based on utility type
    const c = getUtilityColorsFromUtilityType(selectedUtilityType)
    setGeorefColor(c.stroke)

    // Set the georeferencing mode based on selected geometry type
    const geoMode: GeorefMode = selectedGeometryType
    setGeorefMode(geoMode)

    if (geoMode === "point") {
      toast({ title: "Point georeference", description: "Click on the map to place the files." })
    } else if (geoMode === "line") {
      toast({ title: "Line georeference", description: "Draw a line on the map for the files." })
    } else if (geoMode === "polygon") {
      toast({ title: "Polygon georeference", description: "Draw a polygon on the map for the files." })
    }
  }

  function startGeoreference(payload: { recordId: string; fileId: string }) {
    setTarget(payload)
    const rec = records.find((r) => r.id === payload.recordId)
    if (rec && selectedType?.utilityType) {
      const c = getUtilityColorsFromUtilityType(selectedType.utilityType)
      setGeorefColor(c.stroke)
    } else {
      setGeorefColor(undefined)
    }
    setGeorefMode("point")
  }

  function startRedrawGeometry(payload: { recordId: string; fileId: string }) {
    const record = records.find((r) => r.id === payload.recordId)
    const file = record?.files.find((f) => f.id === payload.fileId)

    if (!record || !file) return

    setRedrawTarget(payload)

    // Set color based on record type
    const utilityType = record.recordTypePath.split(" / ")[0].toLowerCase()
    const colors = getUtilityColorsFromUtilityType(utilityType)
    setGeorefColor(colors.stroke)

    // Set geometry mode based on existing geometry
    if (file.geomType === "Point") {
      setGeorefMode("point")
      toast({ title: "Redraw point", description: "Click on the map to place the new point location." })
    } else if (file.geomType === "LineString") {
      setGeorefMode("line")
      toast({ title: "Redraw line", description: "Draw a new line on the map, double-click to finish." })
    } else if (file.geomType === "Polygon") {
      setGeorefMode("polygon")
      toast({ title: "Redraw polygon", description: "Draw a new polygon on the map." })
    }

    // Focus on existing geometry if available
    if (file.lat && file.lng) {
      setFocusPoint({ lat: file.lat, lng: file.lng })
    } else if (file.path && file.path.length > 0) {
      setFocusPoint(file.path[0])
    }
  }

  function handleDropFilesAt(latlng: LatLng, droppedFiles: File[]) {
    setUploadedFiles((prev) => [...prev, ...droppedFiles])

    toast({
      title: "Files uploaded",
      description: `${droppedFiles.length} file(s) uploaded. Update metadata and click "Draw on Map" to georeference.`,
    })
  }

  function handleGeorefComplete(
    result: { type: "Point"; point: LatLng } | { type: "LineString" | "Polygon"; path: LatLng[] },
  ) {
    if (redrawTarget) {
      const now = new Date().toISOString()
      const uploader = "Current User" // You might want to get this from context/auth

      setRecords((prev) =>
        prev.map((record) => {
          if (record.id === redrawTarget.recordId) {
            return {
              ...record,
              files: record.files.map((file) => {
                if (file.id === redrawTarget.fileId) {
                  if (result.type === "Point") {
                    return {
                      ...file,
                      geomType: "Point",
                      path: [result.point],
                      lat: result.point.lat,
                      lng: result.point.lng,
                      georefAt: now,
                      georefBy: uploader,
                    }
                  } else {
                    return {
                      ...file,
                      geomType: result.type,
                      path: result.path,
                      lat: result.path[0]?.lat,
                      lng: result.path[0]?.lng,
                      georefAt: now,
                      georefBy: uploader,
                    }
                  }
                }
                return file
              }),
            }
          }
          return record
        }),
      )

      setRedrawTarget(null)
      setGeorefMode("none")

      if (result.type === "Point") {
        setFocusPoint(result.point)
      } else {
        setFocusPoint(result.path[0])
      }

      toast({
        title: "Geometry redrawn",
        description: `File geometry has been updated with new ${result.type.toLowerCase()}.`,
      })
      return
    }

    // Existing code for regular georeferencing
    if (!target && pendingDropMeta && result.type === "Point") {
      const now = new Date().toISOString()
      const uploader = pendingDropMeta.name.trim() || "Uploader"
      const newRecord: RequestRecord = {
        id: crypto.randomUUID(),
        uploaderName: uploader,
        uploadedAt: now,
        recordTypeId: pendingDropMeta.type.id as any,
        recordTypePath: `${pendingDropMeta.type.utilityType} / ${pendingDropMeta.type.recordType}`,
        priority: pendingDropMeta.type.priority,
        orgName: pendingDropMeta.org.trim(),
        notes: pendingDropMeta.notes.trim() || undefined,
        files: pendingDropMeta.files.map((f) => ({
          id: crypto.randomUUID(),
          name: f.name,
          size: f.size,
          type: f.type,
          status: "Georeferenced",
          geomType: "Point",
          path: [result.point], // Store point as single-item path array
          lat: result.point.lat,
          lng: result.point.lng,
          georefAt: now,
          georefBy: uploader,
        })),
      }
      setRecords((prev) => [newRecord, ...prev])
      setFocusPoint(result.point)
      setPendingDropMeta(null)
      setGeorefMode("none")
      setIsGeometryComplete(true)
      toast({
        title: "Files georeferenced",
        description: `${pendingDropMeta.files.length} file(s) saved with a point geometry.`,
      })
      return
    }

    if (target && result.type === "Point") {
      const now = new Date().toISOString()
      const by = uploaderName.trim() || "Uploader"
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== target.recordId) return r
          return {
            ...r,
            recordTypePath: selectedType
              ? `${selectedType.utilityType} / ${selectedType.recordType}`
              : r.recordTypePath,
            files: r.files.map((f) =>
              f.id === target.fileId
                ? {
                    ...f,
                    status: "Georeferenced",
                    geomType: "Point",
                    path: [result.point], // Store point as single-item path array
                    lat: result.point.lat,
                    lng: result.point.lng,
                    georefAt: now,
                    georefBy: by,
                  }
                : f,
            ),
          }
        }),
      )
      setFocusPoint(result.point)
      setTarget(null)
      setGeorefMode("none")
      toast({
        title: "Georeferenced",
        description: "Point saved for the file.",
      })
      return
    }

    if (!target && pendingDropMeta && (result.type === "LineString" || result.type === "Polygon")) {
      const centroid = centroidOfPath(result.path)
      const now = new Date().toISOString()
      const uploader = pendingDropMeta.name.trim() || "Uploader"
      const newRecord: RequestRecord = {
        id: crypto.randomUUID(),
        uploaderName: uploader,
        uploadedAt: now,
        recordTypeId: pendingDropMeta.type.id as any,
        recordTypePath: `${pendingDropMeta.type.utilityType} / ${pendingDropMeta.type.recordType}`, // Store utility type in path
        priority: pendingDropMeta.type.priority,
        orgName: pendingDropMeta.org.trim(),
        notes: pendingDropMeta.notes.trim() || undefined,
        files: pendingDropMeta.files.map((f) => ({
          id: crypto.randomUUID(),
          name: f.name,
          size: f.size,
          type: f.type,
          status: "Georeferenced",
          geomType: result.type,
          path: result.path,
          lat: centroid.lat,
          lng: centroid.lng,
          georefAt: now,
          georefBy: uploader,
        })),
      }
      setRecords((prev) => [newRecord, ...prev])
      setFocusPoint(centroid)
      setPendingDropMeta(null)
      setGeorefMode("none")
      setIsGeometryComplete(true)
      toast({
        title: "Files georeferenced",
        description: `${pendingDropMeta.files.length} file(s) saved with a ${result.type === "LineString" ? "line" : "polygon"} geometry.`,
      })
      return
    }

    const centroid = centroidOfPath(result.path)
    const now = new Date().toISOString()
    const by = uploaderName.trim() || "Uploader"
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== target.recordId) return r
        return {
          ...r,
          // Update the record type path to include utility type if we have selectedType
          recordTypePath: selectedType ? `${selectedType.utilityType} / ${selectedType.recordType}` : r.recordTypePath,
          files: r.files.map((f) =>
            f.id === target.fileId
              ? {
                  ...f,
                  status: "Georeferenced",
                  geomType: result.type,
                  path: result.path,
                  lat: centroid.lat,
                  lng: centroid.lng,
                  georefAt: now,
                  georefBy: by,
                }
              : f,
          ),
        }
      }),
    )
    setFocusPoint(centroid)
    setTarget(null)
    setGeorefMode("none")
    toast({
      title: "Georeferenced",
      description: `${result.type === "LineString" ? "Line" : "Polygon"} saved for the file.`,
    })
  }

  function onAttachDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDraggingAttach(false)
    const droppedFiles = extractFiles(e.dataTransfer)

    setUploadedFiles((prev) => [...prev, ...droppedFiles])
    setFiles(e.dataTransfer.files)

    toast({
      title: "Files uploaded",
      description: `${droppedFiles.length} file(s) uploaded. Update metadata and click "Draw on Map" to georeference.`,
      variant: "default",
    })
  }

  function completeUpload() {
    // Reset all form state for new upload
    setSelectedUtilityType(null)
    setSelectedRecordType(null)
    setSelectedGeometryType(null)
    setUploadedFiles([])
    setFiles(null)
    setOrgName("")
    setNotes("")
    setUploaderName("")
    setIsGeometryComplete(false)
    setSelectedType(null)
    setGeorefMode("none")
    setGeorefColor(undefined)
    setFocusPoint(null)
    setShowAllRecords(false)

    // Clear file input
    const el = document.getElementById("upload-file-input") as HTMLInputElement | null
    if (el) el.value = ""

    toast({
      title: "Upload completed",
      description: "Ready to start a new upload. Select utility type, record type, and upload files.",
    })
  }

  async function generateSecureLink() {
    if (!polygon || polygon.length < 3) {
      toast({ title: "Draw a polygon", description: "Please outline the area of interest.", variant: "destructive" })
      return
    }
    if (!passcode.trim()) {
      toast({ title: "Add a passcode", description: "Set a passcode to protect the link.", variant: "destructive" })
      return
    }
    const payload = {
      createdAt: new Date().toISOString(),
      polygon,
      areaSqMeters: areaSqMeters ?? undefined,
      title: title.trim() || undefined,
      deadline: deadline || undefined,
      records,
    }
    try {
      const sealed = await encryptPayload(passcode.trim(), payload)
      const url = `${window.location.origin}/share#${sealedToHash(sealed)}`
      await navigator.clipboard.writeText(url).catch(() => {})
      setLinkUrl(url)
      setGenOpen(false)
      setLinkOpen(true)
      toast({ title: "Secure link generated", description: "Link copied to clipboard. Share it with the receiver." })
    } catch {
      toast({ title: "Failed to create link", description: "Please try again.", variant: "destructive" })
    }
  }

  function handleCancelGeoref() {
    setTarget(null)
    setRedrawTarget(null)
    setGeorefMode("none")
    setGeorefColor(undefined)
  }

  const handleCompleteUpload = () => {
    completeUpload()
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Unified utility records workflow</h2>
          <p className="text-muted-foreground">
            Space-first Records: One unified workflow to define work areas, upload records, and share.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">Upload</span>
          <span className="text-xs px-2 py-1 rounded bg-sky-50 text-sky-700">Share</span>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Left Column - Define Work Area and Attach Records */}
        <div className="space-y-4 md:col-span-1 md:h-[calc(100vh-12rem)] md:overflow-y-auto md:pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* Define Work Area - Step 1 */}
          <Card className="relative z-10 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                  1
                </span>
                Define Work Area
              </CardTitle>
              <CardDescription>Draw a polygon on the map to define your work area first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Click on the map to start drawing your work area polygon. This defines the boundary for your utility
                records project.
              </div>

              {polygon && polygon.length >= 3 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium text-sm">Work area defined</span>
                  </div>
                  <div className="mt-1 text-xs">
                    {polygon.length} vertices •{" "}
                    {typeof areaSqMeters === "number"
                      ? `${(areaSqMeters / 1_000_000).toFixed(3)} km²`
                      : "Area calculated"}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-800 p-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <span className="font-medium text-sm">Draw work area on map</span>
                  </div>
                  <div className="mt-1 text-xs">Click on the map to start drawing your polygon boundary</div>
                </div>
              )}

              {polygon && polygon.length >= 3 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setPolygon(null)
                    setAreaSqMeters(null)
                  }}
                  className="w-full"
                >
                  Clear Work Area
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Attach Records - Step 2 */}
          <Card className="relative z-10 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold",
                    polygon && polygon.length >= 3 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400",
                  )}
                >
                  2
                </span>
                Attach Records
              </CardTitle>
              <CardDescription>
                {polygon && polygon.length >= 3
                  ? "Follow the steps to attach your utility records."
                  : "Define work area first, then attach records."}
              </CardDescription>
            </CardHeader>
            <CardContent
              className={cn("space-y-4", !polygon || polygon.length < 3 ? "opacity-50 pointer-events-none" : "")}
            >
              <div className="grid gap-3">
                <Label className="text-sm font-medium">Utility Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      value: "water",
                      label: "Water",
                    },
                    {
                      value: "wastewater",
                      label: "Wastewater",
                    },
                    {
                      value: "storm",
                      label: "Storm",
                    },
                    {
                      value: "gas",
                      label: "Gas",
                    },
                    {
                      value: "telecom",
                      label: "Telecom",
                    },
                    {
                      value: "electric",
                      label: "Electric",
                    },
                  ].map((utility) => (
                    <Button
                      key={utility.value}
                      variant="outline"
                      className={cn(
                        "h-auto p-3 flex items-center justify-center border-2 transition-all text-xs",
                        selectedUtilityType === utility.value
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                          : "hover:bg-muted",
                      )}
                      onClick={() => setSelectedUtilityType(utility.value as UtilityType)}
                    >
                      <span className="font-medium">{utility.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <Label className="text-sm font-medium">Record Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "as built", label: "As Built" },
                    { value: "permit", label: "Permit" },
                    { value: "locate", label: "Locate" },
                    { value: "other", label: "Other" },
                  ].map((record) => (
                    <Button
                      key={record.value}
                      variant="outline"
                      className={cn(
                        "h-auto p-3 flex items-center justify-center border-2 transition-all text-xs",
                        selectedRecordType === record.value
                          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                          : "hover:bg-muted",
                      )}
                      onClick={() => setSelectedRecordType(record.value as RecordType)}
                      disabled={!selectedUtilityType}
                    >
                      <span className="font-medium">{record.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <Label className="text-sm font-medium">Geometry Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "point", label: "Point", icon: "●" },
                    { value: "line", label: "Line", icon: "━" },
                    { value: "polygon", label: "Polygon", icon: "▢" },
                  ].map((geometry) => (
                    <Button
                      key={geometry.value}
                      variant="outline"
                      className={cn(
                        "h-auto p-3 flex flex-col items-center gap-2 border-2 transition-all text-xs",
                        selectedGeometryType === geometry.value
                          ? "bg-primary/10 text-primary border-primary hover:bg-primary/20"
                          : "hover:bg-muted/50",
                      )}
                      onClick={() => setSelectedGeometryType(geometry.value as GeometryType)}
                      disabled={!selectedRecordType}
                    >
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-lg font-bold border",
                          selectedGeometryType === geometry.value
                            ? "bg-primary/20 text-primary border-primary"
                            : "bg-muted border-muted-foreground/20",
                        )}
                      >
                        {geometry.icon}
                      </div>
                      <span className="font-medium">{geometry.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {selectedUtilityType && selectedRecordType && selectedGeometryType && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-sm">
                  <span className="font-medium">Selection:</span>{" "}
                  <span className="font-medium">
                    {selectedUtilityType} • {selectedRecordType} • {selectedGeometryType}
                  </span>
                </div>
              )}

              <div className="grid gap-3">
                <Label htmlFor="upl-org">Organization</Label>
                <Input
                  id="upl-org"
                  placeholder="e.g., City of Example"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>

              <div className="grid gap-3">
                <Label htmlFor="upl-notes">Notes (optional)</Label>
                <Input
                  id="upl-notes"
                  placeholder="e.g., Emergency repair work, located near main intersection"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div
                className="relative grid gap-3 rounded-md"
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={onAttachDrop}
              >
                <Label htmlFor="upload-file-input">Files (PDF/Images/CAD)</Label>
                <div
                  className={cn(
                    "rounded-md border p-2 transition-colors",
                    isDraggingAttach ? "border-emerald-500 bg-emerald-50/40" : "border-muted",
                  )}
                >
                  <Input
                    id="upload-file-input"
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,.dwg,.dxf,.tiff,.tif"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files)
                        setUploadedFiles((prev) => [...prev, ...newFiles])
                        setFiles(e.target.files)
                        toast({
                          title: "Files uploaded",
                          description: `${newFiles.length} file(s) uploaded. Update metadata and click "Draw on Map" to georeference.`,
                          variant: "default",
                        })
                      }
                    }}
                  />
                  <div className="mt-1 text-xs text-muted-foreground">
                    Drag files here to start the flow, or use the picker.
                  </div>
                </div>
                {uploadedFiles.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {uploadedFiles.length} file(s) uploaded: {uploadedFiles.map((f) => f.name).join(", ")}
                  </div>
                ) : files && files.length > 0 ? (
                  <div className="text-xs text-muted-foreground">{files.length} file(s) selected</div>
                ) : null}

                <div
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-md px-3 py-1 text-xs font-medium shadow-sm transition-opacity",
                    isDraggingAttach ? "opacity-100 bg-emerald-600 text-white" : "opacity-0",
                  )}
                  aria-hidden={!isDraggingAttach}
                >
                  Drop files to start flow
                </div>
              </div>

              <div
                className={cn(
                  "relative rounded-lg border-2 border-dashed p-8 text-center transition-all",
                  isDraggingAttach
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
                  selectedUtilityType && selectedRecordType && selectedGeometryType
                    ? "opacity-100"
                    : "opacity-50 pointer-events-none",
                )}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={onAttachDrop}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-muted p-3">
                    <svg
                      className="h-6 w-6 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Drop files here to upload</p>
                    <p className="text-xs text-muted-foreground">PDF, Images, CAD files supported</p>
                  </div>
                </div>

                {isDraggingAttach && (
                  <div className="absolute inset-0 rounded-lg bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
                    <div className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                      Drop files to start upload flow
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={startDrawingGeometry}
                  disabled={
                    !selectedUtilityType || !selectedRecordType || !selectedGeometryType || uploadedFiles.length === 0
                  }
                  className="flex-1"
                >
                  Draw on Map
                </Button>
                {uploadedFiles.length > 0 && !isGeometryComplete && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadedFiles([])
                      setFiles(null)
                    }}
                  >
                    Clear Files
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {records.some((r) => r.files.some((f) => f.status === "Georeferenced")) && (
            <Card className="relative z-10 bg-white">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    const georefRecord = records.find((r) => r.files.some((f) => f.status === "Georeferenced"))
                    if (georefRecord) {
                      const georeferencedFile = georefRecord.files.find((f) => f.status === "Georeferenced")
                      if (georeferencedFile) {
                        startRedrawGeometry({ recordId: georefRecord.id, fileId: georeferencedFile.id })
                      }
                    }
                  }}
                  className="w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Redraw Geometry
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Map */}
        <Card className="relative z-10 bg-white md:col-span-2">
          <CardHeader>
            <CardTitle>Work Area</CardTitle>
            <CardDescription>Single map for drawing, georeferencing, and sharing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="aspect-[4/3] w-full rounded-md border">
              <MapWithDrawing
                mode="draw"
                polygon={polygon}
                onPolygonChange={(path, area) => {
                  setPolygon(path)
                  setAreaSqMeters(area ?? null)
                  setWorkAreaId(workAreaId || crypto.randomUUID());
                }}
                georefMode={georefMode}
                georefColor={georefColor}
                onGeorefComplete={handleGeorefComplete}
                pickPointActive={georefMode === "point"}
                pickZoom={16}
                bubbles={bubbles}
                shapes={shapes}
                enableDrop
                onDropFilesAt={handleDropFilesAt}
                focusPoint={focusPoint}
                focusZoom={16}
              />
            </div>

            {records.length > 0 && <UtilityOverviewPanel records={records} className="mt-4" />}

            <div className="flex flex-col gap-3">
              {/* Polygon summary + actions (remove + secure link) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-sm">
                <div className="text-muted-foreground">
                  {polygon && polygon.length >= 3 ? (
                    <div className="flex flex-wrap gap-2">
                      <span className="font-medium text-foreground">Polygon saved:</span>
                      <span>{polygon.length} vertices</span>
                      {typeof areaSqMeters === "number" ? (
                        <span>• Area: {(areaSqMeters / 1_000_000).toFixed(3)} km²</span>
                      ) : null}
                    </div>
                  ) : (
                    "No polygon yet. You can still georeference files."
                  )}
                </div>
                <div className="flex gap-2">
                  {polygon && polygon.length >= 3 ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPolygon(null)
                        setAreaSqMeters(null)
                      }}
                    >
                      Remove polygon
                    </Button>
                  ) : null}
                  <Button onClick={() => setGenOpen(true)} disabled={!polygon || polygon.length < 3}>
                    Generate secure sharing link
                  </Button>
                </div>
              </div>

              {/* Complete Upload button */}
              <div className="flex justify-end">
                <Button onClick={handleCompleteUpload} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Complete Upload & Start New
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secure link dialogs */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate secure sharing link</DialogTitle>
            <DialogDescription>
              Set details and a passcode. We encrypt the request in the URL for a secure share.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="share-title">Work ID / Project Name (optional)</Label>
              <Input
                id="share-title"
                placeholder="e.g., Main St. Corridor — Phase 2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="share-deadline">Deadline (optional)</Label>
              <Input id="share-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="share-passcode">Passcode (required)</Label>
              <Input
                id="share-passcode"
                type="password"
                placeholder="Set a passcode to protect this link"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateSecureLink}>Create link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Secure link ready</DialogTitle>
            <DialogDescription>
              The receiver will open the platform with your polygon preloaded and can contribute records.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="secure-link">Secure link</Label>
            <Input id="secure-link" value={linkUrl} readOnly onFocus={(e) => e.currentTarget.select()} />
            <div className="text-xs text-muted-foreground">Tip: We already copied this link to your clipboard.</div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(linkUrl).catch(() => {})
              }}
            >
              Copy link
            </Button>
            <Button
              onClick={() => {
                window.open(linkUrl, "_blank", "noopener,noreferrer")
              }}
            >
              Open link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-6">
        <div className="border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 rounded-t-lg">
            <h3 className="text-lg font-semibold">Uploaded Records</h3>
            <p className="text-sm text-muted-foreground">All files and records uploaded in this session</p>
          </div>

          <div className="p-4">
            <RecordsTable
              records={records.slice(0, showAllRecords ? records.length : 2)}
              showActions={true}
              onGeoreference={startGeoreference}
              onRedrawGeometry={startRedrawGeometry}
            />

            {records.length > 2 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllRecords(!showAllRecords)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {showAllRecords
                    ? `Show less (${records.length - 2} hidden)`
                    : `Show ${records.length - 2} more records`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function hasFiles(dt: DataTransfer | null | undefined) {
  if (!dt) return false
  if (dt.types) {
    for (const t of Array.from(dt.types)) {
      if (t === "Files") return true
    }
  }
  return (dt.files && dt.files.length > 0) || (dt.items && dt.items.length > 0)
}

function extractFiles(dt: DataTransfer | null): File[] {
  if (!dt) return []
  if (dt.items && dt.items.length) {
    const files: File[] = []
    for (const item of Array.from(dt.items)) {
      if (item.kind === "file") {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    return files
  }
  return Array.from(dt.files || [])
}

function centroidOfPath(path: LatLng[]): LatLng {
  if (!path.length) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}

const handleUpload = async (file: File, workAreaId: string, metadata: any) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workAreaId", workAreaId);
  formData.append("metadata", JSON.stringify(metadata));

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!json.ok) {
    console.error("Upload failed:", json.error);
  } else {
    console.log("✅ Upload successful:", json.path);
  }
};
