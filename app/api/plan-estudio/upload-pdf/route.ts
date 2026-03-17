/**
 * POST /api/plan-estudio/upload-pdf — Subir PDF (slot 1, 2 o 3)
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const slot = formData.get("slot") as string | null;

  if (!file) {
    return NextResponse.json(
      { error: "No se proporcionó archivo" },
      { status: 400 }
    );
  }

  if (!slot || !["1", "2", "3"].includes(slot)) {
    return NextResponse.json(
      { error: "Slot inválido. Debe ser 1, 2 o 3" },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Solo se aceptan archivos PDF" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo excede el límite de 10MB" },
      { status: 400 }
    );
  }

  // Must have plan first
  const plan = await prisma.planEstudio.findUnique({
    where: { userId: user.id },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "Primero configura tu plan de estudios" },
      { status: 400 }
    );
  }

  try {
    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer());

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require("pdf-parse/lib/pdf-parse");
    const pdfData = await pdf(buffer);
    const texto = pdfData.text;

    if (!texto || texto.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "No se pudo extraer texto suficiente del PDF. Puede ser un documento escaneado.",
        },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const admin = getSupabaseAdmin();
    const timestamp = Date.now();
    const storagePath = `plan/${user.id}/${timestamp}-slot${slot}.pdf`;

    const { error: uploadError } = await admin.storage
      .from("cedularios")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Error al subir el archivo" },
        { status: 500 }
      );
    }

    // Update the correct slot
    const urlField = `pdf${slot}Url` as const;
    const nombreField = `pdf${slot}Nombre` as const;
    const textoField = `pdf${slot}Texto` as const;

    await prisma.planEstudio.update({
      where: { id: plan.id },
      data: {
        [urlField]: storagePath,
        [nombreField]: file.name,
        [textoField]: texto,
      },
    });

    return NextResponse.json({
      ok: true,
      slot: parseInt(slot),
      nombre: file.name,
      caracteres: texto.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
