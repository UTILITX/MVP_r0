import { NextResponse } from "next/server";
import { getSvc } from "@/lib/supabase";

export async function POST(req: Request) {
  const supa = getSvc();
  const { name, geojson } = await req.json();

  const { data: id, error } = await supa.rpc("insert_work_area", {
    p_name: name,
    p_geojson: geojson
  });

  if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok:true, id }, { status: 201 });
}

export const dynamic = "force-dynamic";
