console.log("🟡 API route loaded");

import { NextResponse } from "next/server";
import { getSvc } from "@/lib/supabase-client";

// --- GET: Load most recent work area ---
export async function GET() {
  try {
    const supa = getSvc();

    const { data, error } = await supa
      .from("work_areas")
      .select("id, name, geom")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("🔴 Supabase fetch error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ ok: true, workAreas: [] }, { status: 200 });
    }

    const feature = data[0];

    // geom should already be in GeoJSON format if Supabase is set up with `geometry` → `GeoJSON`
    const coordinates = feature.geom?.coordinates?.[0];
    if (!coordinates || coordinates.length < 3) {
      return NextResponse.json({ ok: false, error: "Invalid polygon geometry" }, { status: 400 });
    }

    const polygon = coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));

    return NextResponse.json({
      ok: true,
      workAreas: [
        {
          id: feature.id,
          name: feature.name,
          polygon,
        },
      ],
    });
  } catch (err: any) {
    console.error("🔥 Unhandled GET error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

// --- POST: Insert a new work area via RPC ---
export async function POST(req: Request) {
  try {
    const supa = getSvc();
    const body = await req.json();
    console.log("🟡 Received POST /api/work-areas with body:", body);

    const { name, geojson } = body;

    const { data: id, error } = await supa.rpc("insert_work_area", {
      p_geojson: geojson,
      p_name: name,
    });

    if (error) {
      console.error("🔴 Supabase RPC Error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.log("🟢 Inserted work area ID:", id);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    console.error("🔥 Unhandled POST error:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
