import { createClient } from "@supabase/supabase-js"
import { PRIVATE_ON, PRIVATE_BUCKET } from "@/lib/storage"

/**
 * Resolves a file URL to a viewable URL (server-side).
 * - If PRIVATE_ON: generates a signed URL (10 min expiry)
 * - If legacy mode: returns the public URL as-is
 */
export async function resolveViewUrl(file_url: string): Promise<string | null> {
  if (PRIVATE_ON) {
    // file_url is a PATH like "<workAreaId>/<filename>"
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

    const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(file_url, 60 * 10) // 10 minutes

    if (error) {
      console.error("[v0] Failed to create signed URL:", error)
      return null
    }

    return data.signedUrl
  }

  // legacy: already a public URL
  return file_url
}

/**
 * Client-side version of resolveViewUrl.
 * Uses the browser-compatible supabase client.
 */
export async function resolveViewUrlClient(file_url: string): Promise<string | null> {
  if (PRIVATE_ON) {
    // Dynamic import to avoid SSR issues
    const { supabase } = await import("@/lib/supabase")

    const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(file_url, 60 * 10)

    if (error) {
      console.error("[v0] Failed to create signed URL:", error)
      return null
    }

    return data.signedUrl
  }

  return file_url
}
