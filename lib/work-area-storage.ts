// lib/work-area-storage.ts

import type { LatLng } from "@/lib/record-types"

const WORK_AREA_KEY = "persistedWorkArea"
const WORK_AREA_AREA_KEY = "persistedWorkAreaArea"

export function saveWorkArea(polygon: LatLng[], areaSqMeters?: number) {
  try {
    if (polygon.length >= 3) {
      localStorage.setItem(WORK_AREA_KEY, JSON.stringify(polygon))
      if (areaSqMeters !== undefined) {
        localStorage.setItem(WORK_AREA_AREA_KEY, areaSqMeters.toString())
      }
    }
  } catch (e) {
    console.warn("Failed to save work area:", e)
  }
}

export function loadWorkArea(): {
  polygon: LatLng[] | null
  areaSqMeters: number | null
} {
  try {
    const polyRaw = localStorage.getItem(WORK_AREA_KEY)
    const areaRaw = localStorage.getItem(WORK_AREA_AREA_KEY)
    const polygon = polyRaw ? (JSON.parse(polyRaw) as LatLng[]) : null
    const areaSqMeters = areaRaw ? parseFloat(areaRaw) : null
    return { polygon, areaSqMeters }
  } catch (e) {
    console.warn("Failed to load work area:", e)
    return { polygon: null, areaSqMeters: null }
  }
}

export function clearWorkArea() {
  localStorage.removeItem(WORK_AREA_KEY)
  localStorage.removeItem(WORK_AREA_AREA_KEY)
}
