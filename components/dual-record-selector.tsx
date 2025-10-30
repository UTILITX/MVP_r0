"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { iconForRecordLabel } from "@/lib/record-type-icons"

export type UtilityType = "water" | "wastewater" | "storm" | "gas" | "telecom" | "electric"
export type RecordType = "as built" | "permit" | "locate" | "other"

type Selection = {
  utilityType: UtilityType | null
  recordType: RecordType | null
}

type Props = {
  selection: Selection
  onSelectionChange: (selection: Selection) => void
  className?: string
}

const utilityTypes: { value: UtilityType; label: string; color: string }[] = [
  {
    value: "water",
    label: "Water",
    color: "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200", // Softer APWA Blue
  },
  {
    value: "wastewater",
    label: "Wastewater",
    color: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200", // Softer APWA Green
  },
  {
    value: "storm",
    label: "Storm",
    color: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200", // Softer APWA Green
  },
  {
    value: "gas",
    label: "Gas",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200", // Softer APWA Yellow
  },
  {
    value: "telecom",
    label: "Telecom",
    color: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200", // Softer APWA Orange
  },
  {
    value: "electric",
    label: "Electric",
    color: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200", // Softer APWA Red
  },
]

const recordTypes: { value: RecordType; label: string }[] = [
  { value: "as built", label: "As Built" },
  { value: "permit", label: "Permit" },
  { value: "locate", label: "Locate" },
  { value: "other", label: "Other" },
]

export function DualRecordSelector({ selection, onSelectionChange, className }: Props) {
  const handleUtilitySelect = (utilityType: UtilityType) => {
    onSelectionChange({
      ...selection,
      utilityType: selection.utilityType === utilityType ? null : utilityType,
    })
  }

  const handleRecordSelect = (recordType: RecordType) => {
    onSelectionChange({
      ...selection,
      recordType: selection.recordType === recordType ? null : recordType,
    })
  }

  const isComplete = selection.utilityType && selection.recordType
  const selectedUtility = utilityTypes.find((u) => u.value === selection.utilityType)
  const selectedRecord = recordTypes.find((r) => r.value === selection.recordType)

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Record Selector
          {isComplete && (
            <Badge variant="secondary" className="ml-2">
              {selectedUtility?.label} • {selectedRecord?.label}
            </Badge>
          )}
        </CardTitle>
        <div className="text-sm text-muted-foreground">Select utility type and record type</div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h3 className="font-medium text-sm">1. Utility Type</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {utilityTypes.map((utility) => {
              const isSelected = selection.utilityType === utility.value

              return (
                <Button
                  key={utility.value}
                  variant="outline"
                  className={cn(
                    "h-auto p-3 flex flex-col items-center gap-2 border-2 transition-all",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : utility.color,
                  )}
                  onClick={() => handleUtilitySelect(utility.value)}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-current/20",
                    )}
                  >
                    {utility.label.charAt(0)}
                  </div>
                  <span className="text-xs font-medium">{utility.label}</span>
                </Button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-sm">2. Record Type</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {recordTypes.map((record) => {
              const isSelected = selection.recordType === record.value
              const icon = iconForRecordLabel(record.label)

              return (
                <Button
                  key={record.value}
                  variant="outline"
                  className={cn(
                    "h-auto p-3 flex flex-col items-center gap-2 border-2 transition-all",
                    isSelected ? "bg-primary/10 text-primary border-primary hover:bg-primary/20" : "hover:bg-muted/50",
                  )}
                  onClick={() => handleRecordSelect(record.value)}
                >
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full border",
                      isSelected ? "bg-primary/20 text-primary border-primary" : icon.bubbleClass,
                    )}
                  >
                    <icon.Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium">{record.label}</span>
                </Button>
              )
            })}
          </div>
        </div>

        {isComplete && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium">Selected:</div>
            <div className="text-sm text-muted-foreground">
              {selectedUtility?.label} {selectedRecord?.label}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
