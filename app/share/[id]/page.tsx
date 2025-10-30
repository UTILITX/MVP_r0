"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { MapWithDrawing, type MapBubble, type GeorefShape } from "@/components/map-with-drawing"
import type { ShareRequest, LatLng } from "@/lib/record-types"
import { loadRequest } from "@/lib/storage"
import { formatDistanceToNow } from "date-fns"

export default function SharePage() {
  const [request, setRequest] = useState<ShareRequest | null>(null)

  useEffect(() => {
    const id = window.location.pathname.split("/").pop() || ""
    const req = loadRequest(id)
    setRequest(req)
  }, [])

  const { bubbles, shapes } = useMemo(() => {
    if (!request) return { bubbles: [] as MapBubble[], shapes: [] as GeorefShape[] }
    const b: MapBubble[] = []
    const s: GeorefShape[] = []

    const getLabelFromPath = (path: string) => {
      const parts = path.split("/").map((p) => p.trim())
      return parts[2] || path
    }

    for (const rec of request.records) {
      const recordLabel = getLabelFromPath(rec.recordTypePath)

      for (const f of rec.files) {
        if (f.status !== "Georeferenced") continue

        const baseDesc = `${rec.recordTypePath} • P${rec.priority}
Uploaded by ${rec.uploaderName} ${formatDistanceToNow(new Date(rec.uploadedAt), { addSuffix: true })}`

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
          s.push({ id: f.id, type: "LineString", path: f.path, title: f.name, description: baseDesc })
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
          s.push({ id: f.id, type: "Polygon", path: f.path, title: f.name, description: baseDesc })
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
  }, [request])

  if (!request) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Request not found</CardTitle>
            <CardDescription>The link may be invalid or the data is not available in this browser.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Go to Requestor Flow</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">UTILITX — Utility Records Demo</h1>
          <p className="text-muted-foreground">Receiver Flow — review the boundary and contributed records</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-sky-50 text-sky-700">Step 2 of 2</span>
          <Button asChild variant="outline">
            <Link href="/">Back to Requestor</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>{request.title ? request.title : "Defined Work Area"}</CardTitle>
            <CardDescription>
              {request.areaSqMeters
                ? `Area ~ ${(request.areaSqMeters / 1_000_000).toFixed(3)} km²`
                : `Polygon with ${request.polygon.length} vertices`}
              {request.deadline ? ` • Deadline: ${new Date(request.deadline).toLocaleDateString()}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[4/3] w-full rounded-md border">
              <MapWithDrawing mode="view" polygon={request.polygon} bubbles={bubbles} shapes={shapes} />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Contribute Records</CardTitle>
            <CardDescription>Upload your records for the defined space.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-medium">All files for this request</h3>
                <p className="text-xs text-muted-foreground">
                  {request.records.length} record(s), {request.records.reduce((a, r) => a + r.files.length, 0)} file(s)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function centroidOfPath(path: LatLng[]): LatLng {
  if (!path.length) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}
