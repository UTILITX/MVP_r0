"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DualRecordSelector, type UtilityType, type RecordType } from "@/components/dual-record-selector"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function TaxonomyDemoPage() {
  const [selection, setSelection] = React.useState<{
    utilityType: UtilityType | null
    recordType: RecordType | null
  }>({
    utilityType: null,
    recordType: null,
  })

  const isComplete = selection.utilityType && selection.recordType

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">UTILITX — Record Selector Demo</h1>
          <p className="text-muted-foreground">Simplified dual-list selector: Utility Type + Record Type</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Selector</CardTitle>
            <CardDescription>Choose utility type and record type</CardDescription>
          </CardHeader>
          <CardContent>
            <DualRecordSelector selection={selection} onSelectionChange={setSelection} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected</CardTitle>
            <CardDescription>The chosen record type appears here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isComplete ? (
              <>
                <div className="text-sm">
                  <div className="font-medium">
                    {selection.utilityType} • {selection.recordType}
                  </div>
                  <div className="mt-1">
                    <Badge variant="secondary">Selected</Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Wire this selection into your form by storing the utility type and record type. For example, attach it
                  to an upload or a request record.
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Nothing selected yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
