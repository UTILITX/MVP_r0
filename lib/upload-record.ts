import { createClient } from "@supabase/supabase-js"
import { PRIVATE_ON, PRIVATE_BUCKET } from "@/lib/storage"

type UploadRecordParams = {
  file: File
  workAreaId: string
  recordType: string
  orgName?: string
  uploaderName?: string
  geojson?: any
}

/**
 * Uploads a file to Supabase Storage and creates a record in the database.
 * - If PRIVATE_ON: uploads to private bucket, stores PATH only
 * - If legacy mode: uploads to public bucket, stores full public URL
 */
export async function uploadRecord({
  file,
  workAreaId,
  recordType,
  orgName,
  uploaderName,
  geojson,
}: UploadRecordParams) {
  console.log("[v0] [uploadRecord] start", {
    bucket: PRIVATE_ON ? PRIVATE_BUCKET : "records",
    workAreaId,
    fileName: file.name,
    fileSize: file.size,
    recordType,
    privateMode: PRIVATE_ON,
  })

  console.log("[v0] PRIVATE_ON:", PRIVATE_ON)
  console.log("[v0] Target bucket:", PRIVATE_ON ? PRIVATE_BUCKET : "records")

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const path = `${workAreaId}/${file.name}`
  console.log("[v0] Upload path:", path)

  if (PRIVATE_ON) {
    console.log("[v0] Using PRIVATE mode - uploading to:", PRIVATE_BUCKET)

    // Upload to private bucket
    const { error: upErr } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) {
      console.error("[v0] Private upload failed:", upErr)
      throw upErr
    }

    console.log("[v0] Private upload successful ✅, storing path:", path)

    // Store PATH only (not public URL)
    const { data, error } = await supabase
      .from("records")
      .insert([
        {
          work_area_id: workAreaId,
          record_type: recordType,
          file_name: file.name,
          file_url: path, // ✅ store PATH only
          mime_type: file.type,
          size_bytes: file.size,
          geojson: geojson || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] DB insert failed:", error)
      throw error
    }

    console.log("[v0] Record created:", data)
    return data
  }

  // Legacy public mode (kept for rollback)
  console.log("[v0] Using LEGACY mode - uploading to: records")

  const { data: up, error: upErr } = await supabase.storage
    .from("records")
    .upload(path, file, { upsert: true, contentType: file.type })

  if (upErr) {
    console.error("[v0] Legacy upload failed:", upErr)
    throw upErr
  }

  const publicUrl = supabase.storage.from("records").getPublicUrl(up.path).data.publicUrl
  console.log("[v0] Legacy upload successful, public URL:", publicUrl)

  const { data, error } = await supabase
    .from("records")
    .insert([
      {
        work_area_id: workAreaId,
        record_type: recordType,
        file_name: file.name,
        file_url: publicUrl, // ✅ store full public URL
        mime_type: file.type,
        size_bytes: file.size,
        geojson: geojson || null,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("[v0] DB insert failed:", error)
    throw error
  }

  console.log("[v0] Record created:", data)
  return data
}
