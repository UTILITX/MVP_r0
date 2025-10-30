"use client"

import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RequestRecord, FileStub } from "@/lib/record-types"
import { MapPin } from "@/lib/icons"

type Props = {
  records: RequestRecord[]
  onGeoreference?: (payload: { recordId: string; fileId: string }) => void
}

export function UploadFilesTable({ records, onGeoreference }: Props) {
  const rows = flatten(records)
  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground">No files yet.</div>
  }

  return (
    <Table>
      <TableCaption>Files queued for this space.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Filename</TableHead>
          <TableHead>Record Type</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Org</TableHead>
          <TableHead>Timestamp</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.file.id}>
            <TableCell className="max-w-[240px] truncate">{r.file.name}</TableCell>
            <TableCell className="whitespace-nowrap">{r.record.recordTypePath}</TableCell>
            <TableCell>
              <PriorityBadge p={r.record.priority} />
            </TableCell>
            <TableCell className="whitespace-nowrap">{r.record.orgName || "-"}</TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDistanceToNow(new Date(r.record.uploadedAt), { addSuffix: true })}
            </TableCell>
            <TableCell>
              <StatusBadge status={r.file.status} />
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant={r.file.status === "Georeferenced" ? "secondary" : "default"}
                onClick={() => onGeoreference?.({ recordId: r.record.id, fileId: r.file.id })}
                disabled={r.file.status === "Georeferenced"}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {r.file.status === "Georeferenced" ? "Georeferenced" : "Georeference"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function flatten(records: RequestRecord[]) {
  return records.flatMap((record) => record.files.map((file) => ({ record, file })))
}

function StatusBadge({ status }: { status: FileStub["status"] }) {
  const variant = status === "Georeferenced" ? "default" : "outline"
  return <Badge variant={variant as any}>{status}</Badge>
}

function PriorityBadge({ p }: { p: 1 | 2 | 3 }) {
  const variant = p === 1 ? "default" : p === 2 ? "secondary" : "outline"
  const label = `P${p}`
  return <Badge variant={variant as any}>{label}</Badge>
}
