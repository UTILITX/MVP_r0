export type UtilityColors = {
  stroke: string
  fill: string
}

// APWA-inspired palette (bright, map-friendly)
const COLORS = {
  red: { stroke: "#dc2626", fill: "#f87171" }, // Electric
  yellow: { stroke: "#ca8a04", fill: "#facc15" }, // Gas/Oil/Steam
  orange: { stroke: "#ea580c", fill: "#fb923c" }, // Telecom/CATV
  blue: { stroke: "#2563eb", fill: "#60a5fa" }, // Potable Water
  green: { stroke: "#059669", fill: "#34d399" }, // Sewer/Drain/Storm
  purple: { stroke: "#9333ea", fill: "#c084fc" }, // Reclaimed/irrigation (not used in current taxonomy)
  pink: { stroke: "#db2777", fill: "#f472b6" }, // Survey (not used in current taxonomy)
  whiteGray: { stroke: "#6b7280", fill: "#ffffff" }, // Roads & Surface (white-like but visible)
  slate: { stroke: "#475569", fill: "#94a3b8" }, // Fallback
}

// Normalize to safe lookups
function normalize(s: string) {
  return s.toLowerCase()
}

export function getUtilityColorsFromDomain(domain: string | undefined | null): UtilityColors {
  const d = normalize(domain || "")
  // Electric power
  if (d.includes("power") || d.includes("electric")) return COLORS.red
  // Gas
  if (d.includes("gas") || d.includes("natural gas")) return COLORS.yellow
  // Communications / Telco
  if (d.includes("telecom") || d.includes("telco") || d.includes("comm")) return COLORS.orange
  // Potable water
  if (d.includes("water") && !d.includes("waste")) return COLORS.blue
  // Sanitary / Stormwater / Wastewater
  if (d.includes("wastewater") || d.includes("sanitary") || d.includes("stormwater") || d.includes("storm"))
    return COLORS.green
  // Roads
  if (d.includes("roads") || d.includes("surface") || d.includes("road")) return COLORS.whiteGray
  return COLORS.slate
}

// New function to get colors directly from utility type
export function getUtilityColorsFromUtilityType(utilityType: string | undefined | null): UtilityColors {
  const u = normalize(utilityType || "")

  // Map utility types to APWA colors
  switch (u) {
    case "water":
      return COLORS.blue // APWA Blue for potable water
    case "wastewater":
    case "storm":
      return COLORS.green // APWA Green for sewer/storm
    case "gas":
      return COLORS.yellow // APWA Yellow for gas
    case "telecom":
      return COLORS.orange // APWA Orange for telecom
    case "electric":
      return COLORS.red // APWA Red for electric
    default:
      return COLORS.slate // Fallback
  }
}

// Convenience: infer from "Owner / Domain / Label" path or "UtilityType / RecordType" format
export function getUtilityColorsFromPath(path: string | undefined | null): UtilityColors {
  if (!path) return COLORS.slate
  const parts = path.split("/").map((p) => p.trim())

  // Handle new format: "UtilityType / RecordType"
  if (parts.length === 2) {
    return getUtilityColorsFromUtilityType(parts[0])
  }

  // Handle old format: "Owner / Domain / Record"
  const domain = parts[1] || ""
  return getUtilityColorsFromDomain(domain)
}
