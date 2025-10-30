"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { LatLng, RequestRecord } from "@/lib/record-types"
import { defaultTaxonomy, flattenTaxonomy, type Taxonomy } from "@/lib/taxonomy"
import { getUtilityColorsFromDomain } from "@/lib/utility-colors"

type Props = {
  polygon: LatLng[] | null
  records: RequestRecord[]
  taxonomy?: Taxonomy
  className?: string
}

const UTILITY_CATEGORIES = {
  Water: "water",
  "Wastewater/Sanitary": "wastewater",
  Wastewater: "wastewater",
  Stormwater: "storm",
  "Natural Gas": "gas",
  Power: "power",
  Telco: "telecom",
} as const

const CATEGORY_DISPLAY_NAMES = {
  water: "Water",
  wastewater: "Wastewater",
  storm: "Storm",
  gas: "Gas",
  power: "Power",
  telecom: "Telecom",
} as const

export function CompletenessPanel({ polygon, records, taxonomy = defaultTaxonomy, className }: Props) {
  // Require a closed polygon with at least 3 vertices
  const active = !!polygon && polygon.length >= 3

  const analysis = React.useMemo(() => {
    if (!active) {
      return null
    }

    console.log("[v0] CompletenessPanel analysis starting", {
      polygonVertices: polygon?.length,
      totalRecords: records.length,
      recordsWithFiles: records.filter((r) => r.files.length > 0).length,
      georefFiles: records.flatMap((r) => r.files).filter((f) => f.status === "Georeferenced").length,
    })

    const flat = flattenTaxonomy(taxonomy)

    // Collect present paths inside polygon (distinct)
    const presentPaths = new Set<string>()
    const recordsInside: RequestRecord[] = []

    for (const rec of records) {
      console.log("[v0] Checking record:", {
        id: rec.id,
        path: rec.recordTypePath,
        filesCount: rec.files.length,
        georefFiles: rec.files.filter((f) => f.status === "Georeferenced").length,
      })

      // A record "counts" if any of its georeferenced files has a centroid inside the polygon
      const hasInside = rec.files.some((f) => {
        if (f.status !== "Georeferenced") {
          console.log("[v0] File not georeferenced:", f.name, f.status)
          return false
        }

        // Prefer stored centroid, otherwise derive from path if available
        let lat: number | undefined = typeof f.lat === "number" ? f.lat : undefined
        let lng: number | undefined = typeof f.lng === "number" ? f.lng : undefined

        if ((lat === undefined || lng === undefined) && Array.isArray(f.path) && f.path.length > 0) {
          const c = centroidOfPath(f.path)
          lat = c.lat
          lng = c.lng
          console.log("[v0] Calculated centroid from path:", { lat, lng, pathLength: f.path.length })
        }

        if (typeof lat !== "number" || typeof lng !== "number") {
          console.log("[v0] No valid coordinates for file:", f.name, { lat, lng })
          return false
        }

        const isInside = pointInPolygon({ lat, lng }, polygon!)
        console.log("[v0] Point-in-polygon check:", {
          fileName: f.name,
          coordinates: { lat, lng },
          isInside,
          polygonVertices: polygon!.length,
        })

        return isInside
      })

      if (hasInside) {
        console.log("[v0] Record has files inside polygon:", rec.recordTypePath)
        presentPaths.add(rec.recordTypePath)
        recordsInside.push(rec)
      }
    }

    console.log("[v0] Analysis results:", {
      presentPaths: Array.from(presentPaths),
      recordsInsideCount: recordsInside.length,
    })

    const categoryGroups = new Map<
      string,
      {
        category: string
        items: Array<{ label: string; owner: string; domain: string; path: string; recordId: string }>
      }
    >()

    // Initialize all categories
    Object.values(CATEGORY_DISPLAY_NAMES).forEach((category) => {
      categoryGroups.set(category.toLowerCase(), { category, items: [] })
    })

    for (const rec of recordsInside) {
      // Extract utility type from the record path (e.g., "water / as built" -> "water")
      const pathParts = rec.recordTypePath.split("/").map((p) => p.trim().toLowerCase())
      const utilityType = pathParts[0] || ""

      // Map utility type to category
      let categoryKey = utilityType
      if (utilityType === "wastewater/sanitary" || utilityType === "wastewater") {
        categoryKey = "wastewater"
      } else if (utilityType === "stormwater") {
        categoryKey = "storm"
      } else if (utilityType === "natural gas") {
        categoryKey = "gas"
      } else if (utilityType === "electric") {
        categoryKey = "power"
      } else if (utilityType === "telco") {
        categoryKey = "telecom"
      }

      const group = categoryGroups.get(categoryKey)
      if (group) {
        group.items.push({
          label: pathParts[1] || rec.recordTypePath, // Use record type (e.g., "as built")
          owner: rec.orgName || "Unknown",
          domain: utilityType,
          path: rec.recordTypePath,
          recordId: rec.id,
        })
        console.log("[v0] Added to category:", categoryKey, rec.recordTypePath)
      } else {
        console.log("[v0] No category found for utility type:", utilityType, "from path:", rec.recordTypePath)
      }
    }

    // Sort items within each category by owner then label
    categoryGroups.forEach((group) => {
      group.items.sort((a, b) => {
        const ownerCompare = a.owner.localeCompare(b.owner)
        if (ownerCompare !== 0) return ownerCompare
        return a.label.localeCompare(b.label)
      })
    })

    // Filter out empty categories and sort by category name
    const nonEmptyCategories = Array.from(categoryGroups.values())
      .filter((group) => group.items.length > 0)
      .sort((a, b) => a.category.localeCompare(b.category))

    const totalPresent = recordsInside.length

    console.log("[v0] Final analysis:", {
      nonEmptyCategories: nonEmptyCategories.length,
      totalPresent,
    })

    return {
      categories: nonEmptyCategories,
      totalPresent,
    }
  }, [active, polygon, records, taxonomy])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Completeness</CardTitle>
        <CardDescription>Draw a polygon to see what utility records are present in the area.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!active ? (
          <div className="text-sm text-muted-foreground">Draw a polygon to see uploaded records.</div>
        ) : !analysis ? (
          <div className="text-sm text-muted-foreground">No analysis available.</div>
        ) : analysis.categories.length === 0 ? (
          <div className="text-sm text-muted-foreground">No records found in the selected area.</div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Records in area</div>
              <div className="text-sm text-muted-foreground">{analysis.totalPresent} records found</div>
            </div>
            <Separator />
            <div className="grid gap-4">
              {analysis.categories.map((categoryGroup) => {
                const firstDomain = categoryGroup.items[0]?.domain || ""
                const colors = getUtilityColorsFromDomain(firstDomain)

                return (
                  <div key={categoryGroup.category} className="rounded-md border p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: colors.stroke }}
                        aria-hidden
                      />
                      <div className="font-medium text-base">{categoryGroup.category}</div>
                      <div className="text-xs text-muted-foreground ml-auto">{categoryGroup.items.length} uploaded</div>
                    </div>

                    <div className="space-y-2">
                      {categoryGroup.items.map((item) => (
                        <div
                          key={`${item.recordId}-${item.path}`}
                          className="flex items-center justify-between text-sm"
                        >
                          <Badge variant="secondary" className="text-xs">
                            {item.label}
                          </Badge>
                          <div className="text-xs text-muted-foreground">{item.owner}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Standard ray-casting algorithm
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
  if (!path || path.length === 0) return { lat: 0, lng: 0 }
  const sum = path.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / path.length, lng: sum.lng / path.length }
}
