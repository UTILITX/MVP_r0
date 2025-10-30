"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Info, Search } from "@/lib/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { type Priority, type Taxonomy, type TaxonomyOwner, defaultTaxonomy } from "@/lib/taxonomy"
import { cn } from "@/lib/utils"
import { iconForRecordLabel } from "@/lib/record-type-icons"

type OnSelectPayload = {
  id: string
  owner: string
  domain: string
  label: string
  priority: Priority
  path: string
}

type Props = {
  taxonomy?: Taxonomy
  selectedId?: string | null
  onSelect?: (record: OnSelectPayload) => void
  className?: string
  scrollHeightClass?: string
}

const priorityColors: Record<Priority, string> = {
  1: "bg-red-50 text-red-700 border-red-200",
  2: "bg-amber-50 text-amber-700 border-amber-200",
  3: "bg-slate-50 text-slate-700 border-slate-200",
}

function PriorityBadge({ p }: { p: Priority }) {
  return (
    <span
      className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium", priorityColors[p])}
    >
      P{p}
    </span>
  )
}

function PriorityChips({
  selected,
  onToggle,
  onAll,
}: {
  selected: Set<Priority>
  onToggle: (p: Priority) => void
  onAll: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" className={selected.size === 3 ? "bg-muted" : ""} onClick={onAll}>
        All
      </Button>
      {[1, 2, 3].map((p) => (
        <Button
          key={p}
          size="sm"
          variant={selected.has(p as Priority) ? "default" : "outline"}
          onClick={() => onToggle(p as Priority)}
          className={selected.has(p as Priority) ? "" : "bg-background"}
        >
          <PriorityBadge p={p as Priority} />
        </Button>
      ))}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Priority legend">
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-xs text-xs">
            <div className="space-y-1">
              <div>
                <b>P1</b> — Critical: Needed to approve or avoid risk
              </div>
              <div>
                <b>P2</b> — Important: Adds context or clarity
              </div>
              <div>
                <b>P3</b> — Nice to Have: Helpful, not urgent
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

export function RecordSelectorTable({
  taxonomy = defaultTaxonomy,
  selectedId = null,
  onSelect,
  className,
  scrollHeightClass = "h-[420px]",
}: Props) {
  const [openOwners, setOpenOwners] = React.useState<Record<string, boolean>>({})
  const [openDomains, setOpenDomains] = React.useState<Record<string, boolean>>({})
  const [query, setQuery] = React.useState("")
  const [priorities, setPriorities] = React.useState<Set<Priority>>(new Set([1, 2, 3]))

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return taxonomy
      .map((owner) => ({
        ...owner,
        groups: owner.groups
          .map((g) => ({
            ...g,
            records: g.records.filter((r) => {
              const matchesPriority = priorities.has(r.priority)
              const matchesQuery =
                !q ||
                r.label.toLowerCase().includes(q) ||
                g.domain.toLowerCase().includes(q) ||
                owner.owner.toLowerCase().includes(q)
              return matchesPriority && matchesQuery
            }),
          }))
          .filter((g) => g.records.length > 0),
      }))
      .filter((o) => o.groups.length > 0)
  }, [taxonomy, query, priorities])

  const toggleOwner = (owner: string) => setOpenOwners((s) => ({ ...s, [owner]: !s[owner] }))
  const toggleDomain = (owner: string, domain: string) =>
    setOpenDomains((s) => ({ ...s, [`${owner}__${domain}`]: !s[`${owner}__${domain}`] }))

  const handleTogglePriority = (p: Priority) => {
    setPriorities((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      if (next.size === 0) return new Set([p]) // never empty
      return next
    })
  }

  const handleAllPriorities = () => setPriorities(new Set([1, 2, 3]))

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Record Selector</CardTitle>
            <div className="text-sm text-muted-foreground">Stakeholder → Domain → Record Type</div>
          </div>
          <PriorityChips selected={priorities} onToggle={handleTogglePriority} onAll={handleAllPriorities} />
        </div>
        <div className="mt-3 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search owner, domain, or record type…"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Separator />
        <ScrollArea className={scrollHeightClass}>
          <div className="p-3">
            {filtered.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No results. Adjust filters or search.</div>
            ) : (
              filtered.map((o) => (
                <OwnerSection
                  key={o.owner}
                  owner={o}
                  isOpen={!!openOwners[o.owner]}
                  onToggle={() => toggleOwner(o.owner)}
                  openDomains={openDomains}
                  onToggleDomain={toggleDomain}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

function OwnerSection({
  owner,
  isOpen,
  onToggle,
  openDomains,
  onToggleDomain,
  selectedId,
  onSelect,
}: {
  owner: TaxonomyOwner
  isOpen: boolean
  onToggle: () => void
  openDomains: Record<string, boolean>
  onToggleDomain: (owner: string, domain: string) => void
  selectedId?: string | null
  onSelect?: (p: OnSelectPayload) => void
}) {
  return (
    <div className="mb-2 rounded-md border">
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium">{owner.owner}</span>
          <Badge variant="outline">{owner.groups.reduce((acc, g) => acc + g.records.length, 0)} types</Badge>
        </div>
      </button>
      {isOpen ? (
        <div className="divide-y">
          {owner.groups.map((g) => {
            const key = `${owner.owner}__${g.domain}`
            const isDomainOpen = !!openDomains[key]
            return (
              <div key={key}>
                <button
                  className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-muted/30"
                  onClick={() => onToggleDomain(owner.owner, g.domain)}
                  aria-expanded={isDomainOpen}
                >
                  <div className="flex items-center gap-2">
                    {isDomainOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span>{g.domain}</span>
                    <Badge variant="secondary">{g.records.length}</Badge>
                  </div>
                </button>
                {isDomainOpen ? (
                  <div className="grid gap-1 p-2 sm:p-3">
                    {g.records.map((r) => {
                      const isSelected = selectedId === r.id
                      const path = `${owner.owner} / ${g.domain} / ${r.label}`
                      const icon = iconForRecordLabel(r.label)

                      return (
                        <div
                          key={r.id}
                          className={cn(
                            "grid grid-cols-12 items-center rounded-md px-2 py-2 hover:bg-muted/40",
                            isSelected && "bg-muted",
                          )}
                        >
                          <div className="col-span-6 sm:col-span-7 flex items-center gap-2 min-w-0">
                            <span
                              className={
                                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border " +
                                icon.bubbleClass
                              }
                              aria-hidden="true"
                              title={icon.kind}
                            >
                              <icon.Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{r.label}</div>
                              <div className="text-xs text-muted-foreground truncate">{path}</div>
                            </div>
                          </div>
                          <div className="col-span-3 sm:col-span-2">
                            <PriorityBadge p={r.priority} />
                          </div>
                          <div className="col-span-3 sm:col-span-3 flex justify-end">
                            <Button
                              size="sm"
                              variant={isSelected ? "secondary" : "outline"}
                              onClick={() =>
                                onSelect?.({
                                  id: r.id,
                                  owner: owner.owner,
                                  domain: g.domain,
                                  label: r.label,
                                  priority: r.priority,
                                  path,
                                })
                              }
                            >
                              {isSelected ? "Selected" : "Select"}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
