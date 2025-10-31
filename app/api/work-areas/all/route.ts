import { NextResponse } from "next/server";
import { getSvc } from "../../../../lib/supabase-client";

export async function GET() {
  const supa = getSvc();

  const { data, error } = await supa
    .from("work_areas")
    .select("id, name, geom, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("🔴 Supabase fetch error:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const workAreas = (data || []).map((feature) => {
    const coordinates = feature.geom?.coordinates?.[0];
    const polygon = coordinates?.map(([lng, lat]: [number, number]) => ({ lat, lng })) || [];

    return {
      id: feature.id,
      name: feature.name,
      created_at: feature.created_at,
      polygon,
    };
  });

  return NextResponse.json({ ok: true, workAreas });
}
