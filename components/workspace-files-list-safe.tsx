"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Item = {
  id: string
  file_name: string
  file_url: string // "<workAreaId>/<file>"
  mime_type: string | null
  size_bytes: number | null
  created_at: string
  viewUrl?: string // signed url
}

export default function WorkspaceFilesListSafe({ workAreaId }: { workAreaId: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()

    async function load() {
      try {
        setLoading(true)
        setErr(null)

        // 1) fetch records
        const { data, error } = await supabase
          .from("records")
          .select("id,file_name,file_url,mime_type,size_bytes,created_at")
          .eq("work_area_id", workAreaId)
          .order("created_at", { ascending: false })
        if (error) throw error

        // 2) sign each path (private bucket)
        const signed: Item[] = []
        for (const r of data ?? []) {
          const { data: sig, error: sigErr } = await supabase.storage
            .from("Records_Private")
            .createSignedUrl(r.file_url, 600) // 10 min
          signed.push({ ...r, viewUrl: sig?.signedUrl ?? "" })
          if (sigErr) console.warn("sign error", sigErr.message)
        }

        if (!cancelled) setItems(signed)
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [workAreaId])

  if (loading) return <div className="p-3 text-sm opacity-70">Loading files…</div>
  if (err) return <div className="p-3 text-sm text-red-600">Error: {err}</div>
  if (!items.length) return <div className="p-3 text-sm opacity-70">No files yet.</div>

  return (
    <div className="p-3 space-y-2">
      {items.map((r) => (
        <div key={r.id} className="border rounded p-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{r.file_name}</div>
            <div className="text-xs opacity-70">
              {r.mime_type || "unknown"} • {new Date(r.created_at).toLocaleString()}
            </div>
          </div>
          <div className="flex gap-2">
            <a href={r.viewUrl} target="_blank" rel="noopener noreferrer" className="underline text-sm">
              View
            </a>
            <a href={r.viewUrl} target="_blank" rel="noopener noreferrer" download={r.file_name} className="text-sm">
              Download
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
