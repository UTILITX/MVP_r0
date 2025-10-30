"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { MapWithDrawing, type MapBubble, type GeorefShape } from "@/components/map-with-drawing"
import { GuidanceChecklist } from "@/components/guidance-checklist"
import type { ShareRequest, LatLng } from "@/lib/record-types"
import { loadRequest } from "@/lib/storage"

function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return "just now"
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`

  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`
}

function centroidOfPath(path: LatLng[]): LatLng {
  if (!path.length) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}

function getPolygonBounds(polygon: LatLng[]) {
  if (!polygon.length) return { center: { lat: 43.6532, lng: -79.3832 }, zoom: 10 }

  let minLat = polygon[0].lat
  let maxLat = polygon[0].lat
  let minLng = polygon[0].lng
  let maxLng = polygon[0].lng

  polygon.forEach((point) => {
    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
    minLng = Math.min(minLng, point.lng)
    maxLng = Math.max(maxLng, point.lng)
  })

  const center = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  }

  // Calculate zoom based on bounds - rough approximation
  const latDiff = maxLat - minLat
  const lngDiff = maxLng - minLng
  const maxDiff = Math.max(latDiff, lngDiff)

  // Zoom levels: smaller diff = higher zoom
  let zoom = 15
  if (maxDiff > 0.01) zoom = 13
  if (maxDiff > 0.02) zoom = 12
  if (maxDiff > 0.05) zoom = 11
  if (maxDiff > 0.1) zoom = 10

  return { center, zoom }
}

export default function ContributePage() {
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
Uploaded by ${rec.uploaderName} ${formatDistanceToNow(new Date(rec.uploadedAt))}`

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

  const mapConfig = useMemo(() => {
    if (!request?.polygon) return { center: { lat: 43.6532, lng: -79.3832 }, zoom: 10 }
    return getPolygonBounds(request.polygon)
  }, [request?.polygon])

  if (!request) {
    return (
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6 relative z-10 bg-white">
        <Card className="relative z-10 bg-white">
          <CardHeader>
            <CardTitle>Request not found</CardTitle>
            <CardDescription>The link may be invalid or the data is not available in this browser.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Go to Create Flow</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6 relative z-10 bg-white">
      <header className="flex flex-col gap-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">UTILITX — Secure Request</h1>
            <p className="text-muted-foreground">Created {formatDistanceToNow(new Date(request.createdAt))}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      <section aria-labelledby="contributor-workflow">
        <h2 id="contributor-workflow" className="sr-only">
          Contributor workflow
        </h2>

        <div className="space-y-4">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Contributor workflow</h2>
              <p className="text-muted-foreground">
                Review the defined area and guidance, then contribute the recommended utility records.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700">Contribute</span>
              <span className="text-xs px-2 py-1 rounded bg-sky-50 text-sky-700">Review</span>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Left Column - Instructions */}
            <div className="space-y-4 md:col-span-1 md:h-[600px] md:overflow-y-auto md:pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <Card className="relative z-10 bg-white">
                <CardHeader>
                  <CardTitle>How to contribute</CardTitle>
                  <CardDescription>
                    Use this simple flow to contribute the recommended files for this area.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Use the Upload flow to contribute the recommended files for this area.
                  </div>

                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-medium">1.</span>
                      <span>Open the Upload tab on the homepage</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">2.</span>
                      <span>Select the matching record type(s) from the guidance below</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">3.</span>
                      <span>Upload files and georeference as a point, line, or polygon</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium">4.</span>
                      <span>Generate a secure link to share your contributions back</span>
                    </li>
                  </ol>

                  <Button asChild className="w-full">
                    <Link href="/">Go to Upload</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Map and Guidance */}
            <div className="md:col-span-2 space-y-4">
              {/* Map Card */}
              <Card className="relative z-10 bg-white">
                <CardHeader>
                  <CardTitle>Defined Area</CardTitle>
                  <CardDescription>
                    Area ~{" "}
                    {request.areaSqMeters
                      ? `${(request.areaSqMeters / 1_000_000).toFixed(3)} km²`
                      : `${request.polygon.length} vertices`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="aspect-[4/3] w-full rounded-md border">
                    <MapWithDrawing
                      mode="view"
                      polygon={request.polygon}
                      bubbles={bubbles}
                      shapes={shapes}
                      center={mapConfig.center}
                      zoom={mapConfig.zoom}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Guidance Card */}
              <Card className="relative z-10 bg-white">
                <CardHeader>
                  <CardTitle>Guidance: what to submit</CardTitle>
                  <CardDescription>
                    Based on your area and current coverage, here are the recommended record types to contribute next.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GuidanceChecklist polygon={request.polygon} records={request.records} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
