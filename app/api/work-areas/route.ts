import { NextResponse } from "next/server";
import { getSvc } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const supa = getSvc();
    const body = await req.json();

    console.log("Request body:", body);

    const { name, geojson } = body;

    const { data: id, error } = await supa.rpc("insert_work_area", {
      p_name: name,
      p_geojson: geojson
    });

    if (error) {
      console.error("Supabase RPC Error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });

  } catch (err: any) {
    console.error("Unhandled Error:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
