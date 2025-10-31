import { createClient } from "@supabase/supabase-js";

export function getSvc() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svc = process.env.SUPABASE_SERVICE_ROLE!;
  if (!url || !svc) throw new Error("Missing Supabase env vars");
  return createClient(url, svc, { auth: { persistSession: false } });
}
