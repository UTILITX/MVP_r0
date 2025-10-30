import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = "Records_Private"

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const sb = createClient(URL, SERVICE)

  // Validate share token
  const { data: link, error: linkErr } = await sb
    .from("share_links")
    .select("work_area_id, expires_at")
    .eq("token", params.token)
    .single()

  if (linkErr || !link || (link.expires_at && new Date(link.expires_at) < new Date())) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 })
  }

  // Fetch all records for this work area
  const { data: recs, error: recErr } = await sb
    .from("records")
    .select("id,file_name,file_url,mime_type,size_bytes,created_at")
    .eq("work_area_id", link.work_area_id)
    .order("created_at", { ascending: false })

  if (recErr) {
    return NextResponse.json({ error: recErr.message }, { status: 500 })
  }

  // Generate signed URLs for each file (10 minutes)
  const signed = await Promise.all(
    (recs ?? []).map(async (r) => {
      const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(r.file_url, 600)
      return {
        ...r,
        viewUrl: data?.signedUrl ?? null,
        _err: error?.message ?? null,
      }
    }),
  )

  return NextResponse.json({ workAreaId: link.work_area_id, records: signed })
}
