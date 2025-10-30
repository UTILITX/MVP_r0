"use client"

import * as React from "react"
import { Check, ChevronsUpDown, FolderTree } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { groupRecordTypes, type RecordTypeId, type RecordType } from "@/lib/record-types"
import { iconForRecordLabel } from "@/lib/record-type-icons"

type Props = {
  value: RecordTypeId | null
  onChange: (v: RecordTypeId | null) => void
  placeholder?: string
}

export function RecordTypeCombobox({ value, onChange, placeholder = "Select record type" }: Props) {
  const [open, setOpen] = React.useState(false)
  const grouped = groupRecordTypes()

  const selected: RecordType | undefined = React.useMemo(() => {
    const all = grouped.flatMap((g) => g.categories.flatMap((c) => c.items))
    return all.find((i) => i.id === value)
  }, [grouped, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-transparent"
        >
          <div className="flex items-center gap-2">
            {selected ? (
              <>
                {(() => {
                  const icon = iconForRecordLabel(selected.name)
                  return (
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded-full border " + icon.bubbleClass
                      }
                      aria-hidden="true"
                      title={icon.kind}
                    >
                      <icon.Icon className="h-3.5 w-3.5" />
                    </span>
                  )
                })()}
                <span className="text-left">
                  {selected.owner} / {selected.category} / {selected.name} — P{selected.priority}
                </span>
              </>
            ) : (
              <>
                <FolderTree className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{placeholder}</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search types..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {grouped.map((group) => (
              <CommandGroup key={group.owner} heading={group.owner}>
                {group.categories.map((cat) => (
                  <div key={cat.name} className="py-1">
                    <div className="px-2 text-xs text-muted-foreground">{cat.name}</div>
                    {cat.items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${item.owner} ${item.category} ${item.name} P${item.priority}`}
                        onSelect={() => {
                          onChange(item.id)
                          setOpen(false)
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                        {(() => {
                          const icon = iconForRecordLabel(item.name)
                          return (
                            <span
                              className={
                                "mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border " +
                                icon.bubbleClass
                              }
                              aria-hidden="true"
                              title={icon.kind}
                            >
                              <icon.Icon className="h-3.5 w-3.5" />
                            </span>
                          )
                        })()}
                        <span className="flex-1">
                          {item.name} — Priority {item.priority}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.owner} / {item.category}
                        </span>
                      </CommandItem>
                    ))}
                  </div>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
