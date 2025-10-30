import { type LucideIcon, DraftingCompass, FileCheck, Layers, MapPin, Search, Wrench } from "@/lib/icons"

export type RecordIconInfo = {
  Icon: LucideIcon
  bubbleClass: string
  kind: "as-builts" | "locates" | "permits" | "work-orders" | "field-data" | "gis" | "other"
}

const AS_BUILT_BUBBLE = "bg-green-50 text-green-700 border-green-200"
const LOCATE_BUBBLE = "bg-red-50 text-red-700 border-red-200"
const PERMIT_BUBBLE = "bg-blue-50 text-blue-700 border-blue-200"
const WORK_ORDER_BUBBLE = "bg-orange-50 text-orange-700 border-orange-200"
const FIELD_DATA_BUBBLE = "bg-purple-50 text-purple-700 border-purple-200"
const GIS_BUBBLE = "bg-gray-50 text-gray-700 border-gray-200"
const NEUTRAL_BUBBLE = "bg-background text-muted-foreground border-border"

function hasAny(label: string, parts: string[]) {
  const l = label.toLowerCase()
  return parts.some((p) => l.includes(p))
}

export function iconForRecordLabel(label: string): RecordIconInfo {
  const l = label.toLowerCase()

  if (hasAny(l, ["as-built", "as built"])) {
    return { Icon: DraftingCompass, bubbleClass: NEUTRAL_BUBBLE, kind: "as-builts" }
  }
  if (l.includes("locate")) {
    return { Icon: MapPin, bubbleClass: NEUTRAL_BUBBLE, kind: "locates" }
  }
  if (l.includes("permit")) {
    return { Icon: FileCheck, bubbleClass: NEUTRAL_BUBBLE, kind: "permits" }
  }
  if (l.includes("work order")) {
    return { Icon: Wrench, bubbleClass: NEUTRAL_BUBBLE, kind: "work-orders" }
  }
  if (hasAny(l, ["field", "photo", "inspection"])) {
    return { Icon: Search, bubbleClass: NEUTRAL_BUBBLE, kind: "field-data" }
  }
  if (
    hasAny(l, [
      "gis",
      "centre line",
      "center line",
      "road centre lines",
      "map",
      "shapefile",
      "centerline",
      "centreline",
    ])
  ) {
    return { Icon: Layers, bubbleClass: NEUTRAL_BUBBLE, kind: "gis" }
  }
  return { Icon: Layers, bubbleClass: NEUTRAL_BUBBLE, kind: "other" }
}

export function emojiForRecordLabel(label: string): string {
  const k = iconForRecordLabel(label).kind
  switch (k) {
    case "as-builts":
      return "🏗️"
    case "locates":
      return "📍"
    case "permits":
      return "📄"
    case "work-orders":
      return "🛠️"
    case "field-data":
      return "🔍"
    case "gis":
      return "🗺️"
    default:
      return "🗂️"
  }
}
