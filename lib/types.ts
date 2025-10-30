export type GeometryType = "point" | "line" | "polygon"

export type GeorefMode = "none" | "point" | "line" | "polygon"

export type PendingDropMeta = {
  files: File[]
  type: {
    utilityType: string
    recordType: string
  }
  org: string
  name: string
  notes?: string
}
