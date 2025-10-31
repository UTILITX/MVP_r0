import { createClient } from "@supabase/supabase-js";

// This is the secure service-role client for server-side use (backend routes)
export function getSvc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc = process.env.SUPABASE_SERVICE_ROLE!;
  return createClient(url, svc, { auth: { persistSession: false } });
}

// Optional: export public anon client for frontend use
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
