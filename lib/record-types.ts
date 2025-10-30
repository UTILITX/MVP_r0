export type LatLng = { lat: number; lng: number }

// Georeference geometry types
export type GeomType = "Point" | "LineString" | "Polygon"

export type Priority = 1 | 2 | 3

export type RecordType = {
  id: RecordTypeId
  owner: "Local Municipality" | "Gas Utility"
  category: "Water" | "Roads" | "General"
  name: string
  priority: Priority
}

export type RecordTypeId =
  | "lm-water-asbuilts"
  | "lm-water-locates"
  | "lm-roads-road-cut-permits"
  | "lm-roads-surface-restoration-plans"
  | "gas-asbuilts"
  | "gas-field-photos"

export const recordTypes: RecordType[] = [
  { id: "lm-water-asbuilts", owner: "Local Municipality", category: "Water", name: "As-Builts", priority: 1 },
  { id: "lm-water-locates", owner: "Local Municipality", category: "Water", name: "Locates", priority: 1 },
  {
    id: "lm-roads-road-cut-permits",
    owner: "Local Municipality",
    category: "Roads",
    name: "Road Cut Permits",
    priority: 2,
  },
  {
    id: "lm-roads-surface-restoration-plans",
    owner: "Local Municipality",
    category: "Roads",
    name: "Surface Restoration Plans",
    priority: 3,
  },
  { id: "gas-asbuilts", owner: "Gas Utility", category: "General", name: "As-Builts", priority: 1 },
  { id: "gas-field-photos", owner: "Gas Utility", category: "General", name: "Field Photos", priority: 3 },
]

export function groupRecordTypes() {
  const byOwner = new Map<RecordType["owner"], RecordType[]>()
  recordTypes.forEach((rt) => {
    const list = byOwner.get(rt.owner) || []
    list.push(rt)
    byOwner.set(rt.owner, list)
  })
  return Array.from(byOwner.entries()).map(([owner, items]) => {
    const byCategory = new Map<RecordType["category"], RecordType[]>()
    items.forEach((it) => {
      const arr = byCategory.get(it.category) || []
      arr.push(it)
      byCategory.set(it.category, arr)
    })
    return {
      owner,
      categories: Array.from(byCategory.entries()).map(([name, arr]) => ({
        name,
        items: arr.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
      })),
    }
  })
}

export function getRecordTypeById(id: RecordTypeId | string | null | undefined): RecordType | undefined {
  if (!id) return undefined
  return recordTypes.find((r) => r.id === id)
}

export type FileStatus = "Not Georeferenced" | "Georeferenced"

export type FileStub = {
  id: string
  name: string
  size: number
  type: string
  status: FileStatus

  // Point geometry (legacy support)
  lat?: number
  lng?: number

  // New generalized geometry
  geomType?: GeomType
  path?: LatLng[] // for LineString or Polygon (Polygon is assumed closed by renderer)

  georefAt?: string // ISO timestamp
  georefBy?: string
}

export type RequestRecord = {
  id: string
  uploaderName: string
  uploadedAt: string // ISO
  recordTypeId: RecordTypeId
  recordTypePath: string
  priority: Priority
  orgName?: string
  notes?: string // Added optional notes field for additional record information
  files: FileStub[]
}

export type ShareRequest = {
  id: string
  createdAt: string
  polygon: LatLng[]
  areaSqMeters?: number
  title?: string
  deadline?: string
  records: RequestRecord[]
}
