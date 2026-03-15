import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
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
  // Auth check with anon key client (respects RLS for auth)
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
      { error: "El archivo excede el límite de 5 MB." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Convert to 400x400 WebP regardless of input format
  const converted = await sharp(buffer)
    .resize(400, 400, { fit: "cover", position: "center" })
    .webp({ quality: 85 })
    .toBuffer();

  const path = `${authUser.id}/avatar.webp`;

  // Upload with service role key to bypass RLS
  const supabaseAdmin = getSupabaseAdmin();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("avatars")
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

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from("avatars")
    .getPublicUrl(path);

  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  // Update user
  await prisma.user.update({
    where: { id: authUser.id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}
