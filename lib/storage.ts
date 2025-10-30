import type { ShareRequest, RequestRecord } from "./record-types"

const KEY_PREFIX = "utilitx:request:"
const STAGED_KEY = "utilitx:staged:records"

export const PRIVATE_ON = process.env.NEXT_PUBLIC_PRIVATE_STORAGE === "1"
export const PRIVATE_BUCKET = "Records_Private"

console.log("[v0] PRIVATE_ON:", PRIVATE_ON)
console.log("[v0] NEXT_PUBLIC_PRIVATE_STORAGE:", process.env.NEXT_PUBLIC_PRIVATE_STORAGE)
console.log("[v0] PRIVATE_BUCKET:", PRIVATE_BUCKET)

export function saveRequest(data: ShareRequest) {
  try {
    localStorage.setItem(KEY_PREFIX + data.id, JSON.stringify(data))
  } catch (e) {
    console.error("Failed to save request", e)
  }
}

export function loadRequest(id: string): ShareRequest | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw) as ShareRequest
  } catch (e) {
    console.error("Failed to load request", e)
    return null
  }
}

export function saveStagedRecords(records: RequestRecord[]) {
  try {
    sessionStorage.setItem(STAGED_KEY, JSON.stringify(records))
  } catch (e) {
    console.error("Failed to save staged records", e)
  }
}

export function loadStagedRecords(): RequestRecord[] {
  try {
    const raw = sessionStorage.getItem(STAGED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RequestRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error("Failed to load staged records", e)
    return []
  }
}

export function clearStagedRecords() {
  try {
    sessionStorage.removeItem(STAGED_KEY)
  } catch (e) {
    console.error("Failed to clear staged records", e)
  }
}
