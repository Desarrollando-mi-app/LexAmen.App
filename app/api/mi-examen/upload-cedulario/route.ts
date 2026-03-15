/**
 * POST /api/mi-examen/upload-cedulario — Subir PDF de cedulario
 * Sube el PDF a Supabase Storage (bucket: cedularios) y actualiza ExamenConfig
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars faltantes");
  return createAdminClient(url, key);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No se proporcionó archivo" },
      { status: 400 }
    );
  }

  // Validate MIME type
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Solo se aceptan archivos PDF" },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo excede el límite de 10MB" },
      { status: 400 }
    );
  }

  // Ensure user has an ExamenConfig
  let config = await prisma.examenConfig.findUnique({
    where: { userId: user.id },
  });

  if (!config) {
    return NextResponse.json(
      {
        error:
          "Primero debes configurar tu examen (universidad) antes de subir un cedulario",
      },
      { status: 400 }
    );
  }

  try {
    // Upload to Supabase Storage
    const admin = getSupabaseAdmin();
    const timestamp = Date.now();
    const storagePath = `${user.id}/${timestamp}.pdf`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("cedularios")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Error al subir el archivo. Verifica que el bucket 'cedularios' exista en Supabase Storage." },
        { status: 500 }
      );
    }

    // Delete old temas when re-uploading
    await prisma.examenTema.deleteMany({
      where: { examenConfigId: config.id },
    });

    // Update config
    config = await prisma.examenConfig.update({
      where: { userId: user.id },
      data: {
        cedularioUrl: storagePath,
        cedularioSource: "pdf",
        cedularioTexto: null, // Clear text if there was one
        parseStatus: "pending",
        parseError: null,
        parsedAt: null,
      },
    });

    return NextResponse.json({ config });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
