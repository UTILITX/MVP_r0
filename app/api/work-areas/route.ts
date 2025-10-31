console.log("🟡 API route loaded");
import { NextResponse } from "next/server";
import { getSvc } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const supa = getSvc(); // make sure .env is set correctly
    const body = await req.json();
    console.log("🟡 Received POST /api/work-areas with body:", body);

    const { name, geojson } = body;

    const { data: id, error } = await supa.rpc("insert_work_area", {
        p_geojson: geojson,
        p_name: name
      });
      

    if (error) {
      console.error("🔴 Supabase RPC Error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.log("🟢 Inserted work area ID:", id);
    return NextResponse.json({ ok: true, id }, { status: 201 });

  } catch (err: any) {
    console.error("🔥 Unhandled error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
