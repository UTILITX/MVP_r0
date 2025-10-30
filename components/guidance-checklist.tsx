"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { defaultTaxonomy, flattenTaxonomy, type Taxonomy } from "@/lib/taxonomy"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import { getUtilityColorsFromDomain } from "@/lib/utility-colors"

type Props = {
  polygon: LatLng[] | null
  records: RequestRecord[]
  taxonomy?: Taxonomy
}

// Simple point-in-polygon (ray casting)
function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat
    const xj = polygon[j].lng,
      yj = polygon[j].lat
    const intersect =
      yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function centroidOfPath(path: LatLng[]): LatLng {
  if (!path.length) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}

export function GuidanceChecklist({ polygon, records, taxonomy = defaultTaxonomy }: Props) {
  const analysis = React.useMemo(() => {
    const flat = flattenTaxonomy(taxonomy)
    const byPath = new Map(flat.map((r) => [r.path, r]))
    // Gather present recordType paths that fall inside polygon
    const present = new Set<string>()
    if (polygon && polygon.length >= 3) {
      for (const rec of records) {
        const inside = rec.files.some((f) => {
          if (f.status !== "Georeferenced") return false
          let lat = typeof f.lat === "number" ? f.lat : undefined
          let lng = typeof f.lng === "number" ? f.lng : undefined
          if ((lat === undefined || lng === undefined) && f.path?.length) {
            const c = centroidOfPath(f.path)
            lat = c.lat
            lng = c.lng
          }
          if (typeof lat !== "number" || typeof lng !== "number") return false
          return pointInPolygon({ lat, lng }, polygon)
        })
        if (inside) present.add(rec.recordTypePath)
      }
    }

    // Group taxonomy by owner/domain; compute missing
    const groups = new Map<
      string,
      { owner: string; domain: string; items: { path: string; label: string; priority: 1 | 2 | 3; present: boolean }[] }
    >()
    for (const item of flat) {
      const key = `${item.owner}||${item.domain}`
      const g = groups.get(key) || { owner: item.owner, domain: item.domain, items: [] as any[] }
      g.items.push({
        path: item.path,
        label: item.label,
        priority: item.priority as 1 | 2 | 3,
        present: present.has(item.path),
      })
      groups.set(key, g)
    }

    // Sort items by priority then label; sort groups by highest missing priority then domain name
    const list = Array.from(groups.values()).map((g) => {
      g.items.sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label))
      const missing = g.items.filter((i) => !i.present)
      const highestMissingPriority = missing.length ? Math.min(...missing.map((i) => i.priority)) : 99
      return { ...g, missing, highestMissingPriority }
    })
    list.sort((a, b) => {
      const pr = a.highestMissingPriority - b.highestMissingPriority
      if (pr !== 0) return pr
      return a.domain.localeCompare(b.domain)
    })

    const totals = {
      missing: list.reduce((acc, g) => acc + g.missing.length, 0),
      present: list.reduce((acc, g) => acc + g.items.filter((i) => i.present).length, 0),
      total: flat.length,
    }

    return { list, totals }
  }, [polygon, records, taxonomy])

  function copyChecklist() {
    const lines: string[] = []
    lines.push(`Recommended submissions (missing):`)
    for (const g of analysis.list) {
      if (!g.missing.length) continue
      lines.push(`- ${g.owner} / ${g.domain}`)
      for (const i of g.missing) {
        lines.push(`  - [ ] ${i.label} (P${i.priority})`)
      }
    }
    navigator.clipboard.writeText(lines.join("\n")).catch(() => {})
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guidance: what to submit</CardTitle>
        <CardDescription>
          Based on your area and current coverage, here are the recommended record types to contribute next.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {analysis.totals.missing > 0
            ? `${analysis.totals.missing} missing of ${analysis.totals.total} total types.`
            : "All covered — nothing missing right now."}
        </div>
        <div className="grid gap-3">
          {analysis.list.map((g) => {
            const colors = getUtilityColorsFromDomain(g.domain)
            const hasMissing = g.missing.length > 0
            return (
              <div key={`${g.owner}||${g.domain}`} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colors.stroke }}
                      aria-hidden
                    />
                    <div className="font-medium">
                      {g.owner} / {g.domain}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.items.filter((i) => i.present).length} present • {g.missing.length} missing
                  </div>
                </div>

                {hasMissing ? (
                  <div className="mt-2 grid gap-1.5">
                    {g.missing.map((i) => (
                      <div key={i.path} className="flex items-center justify-between rounded border px-2 py-1">
                        <div className="text-sm">{i.label}</div>
                        <Badge variant={i.priority === 1 ? "destructive" : i.priority === 2 ? "secondary" : "outline"}>
                          P{i.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 inline-block">
                    Complete
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-1">
          <Button variant="secondary" onClick={copyChecklist}>
            Copy checklist
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
