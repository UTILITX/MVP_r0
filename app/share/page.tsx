"use client"

import type * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MapBubble, GeorefShape } from "@/components/map-with-drawing"
import { decryptPayload, hashToSealed } from "@/lib/crypto"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import { formatDistanceToNow } from "date-fns"

type SecurePayload = {
  createdAt: string
  polygon: LatLng[]
  areaSqMeters?: number
  title?: string
  deadline?: string
  records?: RequestRecord[]
}

export default function ShareSecurePage() {
  const router = useRouter()
  const [sealedHash, setSealedHash] = useState<string>("")
  const [passcode, setPasscode] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SecurePayload | null>(null)

  useEffect(() => {
    setSealedHash(window.location.hash || "")
  }, [])

  async function tryDecrypt(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    setData(null)
    const sealed = hashToSealed(sealedHash)
    if (!sealed) {
      setError("No secure data found in link. Make sure you pasted the full URL.")
      return
    }
    if (!passcode.trim()) {
      setError("Enter the passcode to open this link.")
      return
    }
    try {
      const payload = await decryptPayload<SecurePayload>(passcode.trim(), sealed)
      if (!payload?.polygon?.length) throw new Error("Invalid payload")
      setData(payload)
      setError(null)

      // Store the decrypted payload in sessionStorage for the main page to pick up
      sessionStorage.setItem("preloadedRequest", JSON.stringify(payload))

      // Redirect to main page which will load the unified workflow with the polygon
      router.push("/")
    } catch {
      setError("Invalid passcode or corrupted link. Please try again.")
    }
  }

  const { bubbles, shapes } = useMemo(() => {
    const b: MapBubble[] = []
    const s: GeorefShape[] = []
    if (!data?.records?.length) return { bubbles: b, shapes: s }
    const getLabelFromPath = (path: string) => {
      const parts = path.split("/").map((p) => p.trim())
      return parts[2] || path
    }
    for (const rec of data.records) {
      const recordLabel = getLabelFromPath(rec.recordTypePath)
      for (const f of rec.files) {
        if (f.status !== "Georeferenced") continue
        const baseDesc = `${rec.recordTypePath} • P${rec.priority}${
          rec.orgName
            ? `
Org: ${rec.orgName}`
            : ""
        }
Uploaded ${formatDistanceToNow(new Date(rec.uploadedAt), { addSuffix: true })}`
        if (f.geomType === "Point" || (!f.geomType && typeof f.lat === "number" && typeof f.lng === "number")) {
          const pos = f.geomType === "Point" && f.path?.[0] ? f.path[0] : { lat: f.lat as number, lng: f.lng as number }
          b.push({ id: f.id, position: pos, title: f.name, description: baseDesc, recordLabel, size: 28 })
        } else if (f.geomType === "LineString" && f.path?.length) {
          s.push({ id: f.id, type: "LineString", path: f.path, title: f.name, description: baseDesc })
        } else if (f.geomType === "Polygon" && f.path?.length) {
          s.push({ id: f.id, type: "Polygon", path: f.path, title: f.name, description: baseDesc })
        }
      }
    }
    return { bubbles: b, shapes: s }
  }, [data])

  if (!sealedHash) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>No secure link detected</CardTitle>
            <CardDescription>
              This route expects a URL with a secure fragment. Generate one from the Request page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/request">Go to Request</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Open secure request</CardTitle>
          <CardDescription>
            Enter the passcode to access the unified workflow with the pre-defined work area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={tryDecrypt} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
              />
            </div>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            <div className="flex items-center gap-2">
              <Button type="submit">Open Workflow</Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).catch(() => {})
                }}
              >
                Copy link
              </Button>
            </div>
          </form>
          <div className="text-xs text-muted-foreground">
            After entering the correct passcode, you'll be taken directly to the unified workflow with the work area
            pre-loaded.
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
