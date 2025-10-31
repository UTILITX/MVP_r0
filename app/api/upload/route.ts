// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { getSvc } from "@/lib/supabase-client";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const supa = getSvc();

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const workAreaId = formData.get("workAreaId") as string;
  const metadata = formData.get("metadata");

  if (!file || !workAreaId) {
    return NextResponse.json({ ok: false, error: "Missing file or workAreaId" }, { status: 400 });
  }

  const filename = `${randomUUID()}-${file.name}`;
  const path = `${workAreaId}/${filename}`;

  // Upload to Supabase bucket
  const { error: uploadError } = await supa.storage
    .from("Records_Private")
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ ok: false, error: uploadError.message }, { status: 500 });
  }

  // Insert metadata into DB
  const { error: insertError } = await supa.from("record_files").insert({
    work_area_id: workAreaId,
    file_name: file.name,
    file_path: path,
    content_type: file.type,
    metadata: metadata ? JSON.parse(metadata.toString()) : {},
  });

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path }, { status: 200 });
}

export const dynamic = "force-dynamic";
