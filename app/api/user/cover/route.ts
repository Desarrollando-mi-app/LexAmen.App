import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB (covers are larger than avatars)
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// Admin client with service role key — bypasses RLS for Storage uploads
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars faltantes para Storage");
  return createSupabaseClient(url, key);
}

export async function POST(request: Request) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Tipo de archivo no permitido. Usa JPG, PNG, WebP o HEIC." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "El archivo excede el límite de 8 MB." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Convert to 1600x400 WebP (4:1 banner ratio, similar a X/Facebook)
  const converted = await sharp(buffer)
    .resize(1600, 400, { fit: "cover", position: "center" })
    .webp({ quality: 85 })
    .toBuffer();

  const path = `${authUser.id}/cover.webp`;

  const supabaseAdmin = getSupabaseAdmin();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("covers")
    .upload(path, converted, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Error al subir: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("covers")
    .getPublicUrl(path);

  const coverUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await prisma.user.update({
    where: { id: authUser.id },
    data: { coverUrl },
  });

  return NextResponse.json({ coverUrl });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const path = `${authUser.id}/cover.webp`;
  const supabaseAdmin = getSupabaseAdmin();

  // Best-effort: remove from storage (ignore if missing)
  await supabaseAdmin.storage.from("covers").remove([path]).catch(() => {});

  // Clear DB field — UI falls back to procedural banner
  await prisma.user.update({
    where: { id: authUser.id },
    data: { coverUrl: null },
  });

  return NextResponse.json({ ok: true });
}
