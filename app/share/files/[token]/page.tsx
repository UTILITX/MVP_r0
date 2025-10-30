"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileIcon, DownloadIcon } from "lucide-react"

type SharedRecord = {
  id: string
  file_name: string
  file_url: string
  mime_type: string
  size_bytes: number
  created_at: string
  viewUrl: string
}

export default function SharePage({ params }: { params: { token: string } }) {
  const [items, setItems] = useState<SharedRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/share/${params.token}/records`)
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || "Failed to load shared records")
          return
        }
        setItems(json.records || [])
      } catch (err) {
        setError("Network error. Please try again.")
      } finally {
        setLoading(false)
      }
    })()
  }, [params.token])

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading shared records...</CardTitle>
          </CardHeader>
        </Card>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Error</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This link may have expired or been revoked. Please contact the person who shared this link with you.
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Records Found</CardTitle>
            <CardDescription>This work area doesn't have any records yet.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Shared Records</CardTitle>
          <CardDescription>View and download files shared with you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((record) => (
              <div key={record.id} className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/50">
                <FileIcon className="mt-1 h-5 w-5 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <div className="font-medium">{record.file_name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{record.mime_type}</span>
                    <span>•</span>
                    <span>{(record.size_bytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{new Date(record.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={record.viewUrl} target="_blank" rel="noopener noreferrer">
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    View
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
