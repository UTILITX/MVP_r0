import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc  = process.env.SUPABASE_SERVICE_ROLE!;

export async function GET() {
  try {
    // 1) anon client (RLS on)
    const anonClient = createClient(url, anon);
    const { data: anonData, error: anonErr } = await anonClient.rpc("select_now"); // add SQL below

    // 2) service client (RLS bypass)
    const svcClient = createClient(url, svc, { auth: { persistSession: false } });
    const { data: svcData, error: svcErr } = await svcClient.rpc("select_now");

    return NextResponse.json({
      ok: true,
      hasEnv: { url: !!url, anon: !!anon, svc: !!svc },
      anon: { ok: !anonErr, error: anonErr?.message, data: anonData },
      svc:  { ok: !svcErr,  error: svcErr?.message,  data: svcData  },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
