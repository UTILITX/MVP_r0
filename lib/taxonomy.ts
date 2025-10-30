export type Priority = 1 | 2 | 3

export type TaxonomyRecord = {
  id: string
  label: string
  priority: Priority
}

export type TaxonomyGroup = {
  domain: string
  records: TaxonomyRecord[]
}

export type TaxonomyOwner = {
  owner: string
  groups: TaxonomyGroup[]
}

export type Taxonomy = TaxonomyOwner[]

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
}

export function withGeneratedIds(
  taxonomy: (Omit<TaxonomyOwner, "groups"> & {
    groups: (Omit<TaxonomyGroup, "records"> & { records: Omit<TaxonomyRecord, "id">[] })[]
  })[]
): Taxonomy {
  return taxonomy.map((o) => ({
    owner: o.owner,
    groups: o.groups.map((g) => ({
      domain: g.domain,
      records: g.records.map((r) => ({
        id: `${slugify(o.owner)}__${slugify(g.domain)}__${slugify(r.label)}`,
        label: r.label,
        priority: r.priority as Priority,
      })),
    })),
  }))
}

export function flattenTaxonomy(t: Taxonomy) {
  return t.flatMap((o) =>
    o.groups.flatMap((g) =>
      g.records.map((r) => ({
        ...r,
        owner: o.owner,
        domain: g.domain,
        path: `${o.owner} / ${g.domain} / ${r.label}`,
      }))
    )
  )
}

// ---------- New: Build taxonomy from provided flat dataset ----------

type FlatItem = {
  owner: string
  domain: string
  recordType: string
  priority: 1
}

const EXCLUDED_OWNERS = new Set<string>([
  "Upper Tier Municipality",
  "Contractor / Consultant",
  "Coordination & System Generated Intelligence",
])

const flatDataset: FlatItem[] = [
  { owner: "Local Municipality", domain: "Water", recordType: "As-Builts", priority: 1 },
  { owner: "Local Municipality", domain: "Water", recordType: "Locates", priority: 1 },
  { owner: "Local Municipality", domain: "Water", recordType: "Municipal Activity Record (Permit)", priority: 1 },
  { owner: "Local Municipality", domain: "Water", recordType: "Work Orders", priority: 1 },

  { owner: "Local Municipality", domain: "Wastewater/Sanitary", recordType: "As-Builts", priority: 1 },
  { owner: "Local Municipality", domain: "Wastewater/Sanitary", recordType: "Locates", priority: 1 },
  { owner: "Local Municipality", domain: "Wastewater/Sanitary", recordType: "Municipal Activity Record (Permit)", priority: 1 },
  { owner: "Local Municipality", domain: "Wastewater/Sanitary", recordType: "Work Orders", priority: 1 },

  { owner: "Local Municipality", domain: "Stormwater", recordType: "As-Builts", priority: 1 },
  { owner: "Local Municipality", domain: "Stormwater", recordType: "Locates", priority: 1 },
  { owner: "Local Municipality", domain: "Stormwater", recordType: "Municipal Activity Record (Permit)", priority: 1 },
  { owner: "Local Municipality", domain: "Stormwater", recordType: "Work Orders", priority: 1 },

  { owner: "Upper Tier Municipality", domain: "Water", recordType: "As-Builts", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Water", recordType: "Locates", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Water", recordType: "Municipal Activity Record (Permit)", priority: 1 },

  { owner: "Upper Tier Municipality", domain: "Wastewater", recordType: "As-Builts", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Wastewater", recordType: "Locates", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Wastewater", recordType: "Municipal Activity Record (Permit)", priority: 1 },

  { owner: "Upper Tier Municipality", domain: "Stormwater", recordType: "As-Builts", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Stormwater", recordType: "Locates", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Stormwater", recordType: "Municipal Activity Record (Permit)", priority: 1 },

  { owner: "Upper Tier Municipality", domain: "Roads & Surface", recordType: "As-Builts", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Roads & Surface", recordType: "Locates", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Roads & Surface", recordType: "Municipal Activity Record (Permit)", priority: 1 },
  { owner: "Upper Tier Municipality", domain: "Roads & Surface", recordType: "Road Centre Lines", priority: 1 },

  { owner: "Gas Utility", domain: "Natural Gas", recordType: "As-Built Drawings", priority: 1 },
  { owner: "Gas Utility", domain: "Natural Gas", recordType: "Issued Permits", priority: 1 },
  { owner: "Gas Utility", domain: "Natural Gas", recordType: "Locates", priority: 1 },

  { owner: "Telecom Utility", domain: "Telco", recordType: "As-Built Drawings", priority: 1 },
  { owner: "Telecom Utility", domain: "Telco", recordType: "Issued Permits", priority: 1 },
  { owner: "Telecom Utility", domain: "Telco", recordType: "Locates", priority: 1 },

  { owner: "Hydro / Electric Utility", domain: "Power", recordType: "As-Built Drawings", priority: 1 },
  { owner: "Hydro / Electric Utility", domain: "Power", recordType: "Issued Permits", priority: 1 },
  { owner: "Hydro / Electric Utility", domain: "Power", recordType: "Locates", priority: 1 },

  { owner: "Contractor / Consultant", domain: "Third Party", recordType: "IFC (Issued for Construction) Drawings", priority: 1 },
  { owner: "Contractor / Consultant", domain: "Third Party", recordType: "Final As-Built Drawings", priority: 1 },

  { owner: "Coordination & System Generated Intelligence", domain: "Analytics", recordType: "Conflicting Permits in the Zone", priority: 1 },
  { owner: "Coordination & System Generated Intelligence", domain: "Analytics", recordType: "Completeness", priority: 1 },
  { owner: "Coordination & System Generated Intelligence", domain: "Analytics", recordType: "High-Risk Zones (Historic Strike Density)", priority: 1 },
  { owner: "Coordination & System Generated Intelligence", domain: "Analytics", recordType: "GPT-Generated Confidence Summary (optional)", priority: 1 },
]

// Build hierarchical structure: Owner -> Domain -> Records
function buildTaxonomyFromFlat(items: FlatItem[]) {
  const owners = new Map<string, Map<string, { label: string; priority: Priority }[]>>()

  for (const it of items) {
    if (EXCLUDED_OWNERS.has(it.owner)) continue
    const ownerMap = owners.get(it.owner) ?? new Map()
    const recs = ownerMap.get(it.domain) ?? []
    recs.push({ label: it.recordType, priority: it.priority })
    ownerMap.set(it.domain, recs)
    owners.set(it.owner, ownerMap)
  }

  // Sort records alphabetically within a domain for consistent UX
  const ownersArr = Array.from(owners.entries()).map(([owner, domainMap]) => {
    const groups = Array.from(domainMap.entries())
      .map(([domain, recs]) => ({
        domain,
        records: recs
          .slice()
          .sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .sort((a, b) => a.domain.localeCompare(b.domain))

    return { owner, groups }
  })

  return withGeneratedIds(ownersArr)
}

// Expose as default taxonomy used by the selector
export const defaultTaxonomy: Taxonomy = buildTaxonomyFromFlat(flatDataset)
