import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

// ─── POST /api/investigaciones/[id]/citas-externas ─────────────
//
// Solo el autor de la investigación puede declarar una cita externa
// hacia ella. Acepta multipart/form-data:
//   citingTitle*    string (>=3 chars)
//   citingAuthor*   string (>=3 chars)
//   citingYear      int (1900..currentYear+1, opcional)
//   citingSource    string (opcional, una de las claves predefinidas)
//   citingUrl       string (opcional)
//   pdf             File application/pdf <=10 MB (opcional)
//
// Rate limit: 10 declaraciones/24h por usuario. Si el PDF falla al
// subirse al bucket privado `citaciones-externas`, se revierte la fila.

const MAX_PDF_SIZE = 10 * 1024 * 1024;
const RATE_LIMIT_PER_DAY = 10;
const BUCKET = "citaciones-externas";
const VALID_SOURCES = new Set([
  "memoria_pregrado",
  "tesis_magister",
  "tesis_doctorado",
  "articulo_revista",
  "libro",
  "capitulo_libro",
  "sentencia",
  "otro",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Investigación debe existir y pertenecer al autenticado
  const inv = await prisma.investigacion.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!inv) {
    return NextResponse.json({ error: "Investigación no encontrada." }, { status: 404 });
  }
  if (inv.userId !== authUser.id) {
    return NextResponse.json(
      { error: "Solo el autor puede declarar citas externas." },
      { status: 403 },
    );
  }
  if (inv.status !== "published") {
    return NextResponse.json(
      { error: "La investigación debe estar publicada." },
      { status: 400 },
    );
  }

  // Rate limit
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.citacionExterna.count({
    where: {
      declaredById: authUser.id,
      createdAt: { gte: oneDayAgo },
    },
  });
  if (recent >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      {
        error: `Has alcanzado el límite de ${RATE_LIMIT_PER_DAY} declaraciones por día.`,
      },
      { status: 429 },
    );
  }

  // ─── Parsear formData ──
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido." }, { status: 400 });
  }

  const citingTitle = formData.get("citingTitle")?.toString().trim();
  const citingAuthor = formData.get("citingAuthor")?.toString().trim();
  const citingYearRaw = formData.get("citingYear")?.toString().trim();
  const citingSourceRaw = formData.get("citingSource")?.toString().trim();
  const citingUrlRaw = formData.get("citingUrl")?.toString().trim();
  const pdf = formData.get("pdf");

  if (!citingTitle || citingTitle.length < 3) {
    return NextResponse.json(
      { error: "El título de la obra externa debe tener al menos 3 caracteres." },
      { status: 400 },
    );
  }
  if (!citingAuthor || citingAuthor.length < 3) {
    return NextResponse.json(
      { error: "El autor de la obra externa debe tener al menos 3 caracteres." },
      { status: 400 },
    );
  }

  let citingYear: number | null = null;
  if (citingYearRaw) {
    const n = Number(citingYearRaw);
    if (!Number.isInteger(n) || n < 1900 || n > new Date().getFullYear() + 1) {
      return NextResponse.json({ error: "Año inválido." }, { status: 400 });
    }
    citingYear = n;
  }

  let citingSource: string | null = null;
  if (citingSourceRaw) {
    if (!VALID_SOURCES.has(citingSourceRaw)) {
      return NextResponse.json({ error: "Tipo de fuente inválido." }, { status: 400 });
    }
    citingSource = citingSourceRaw;
  }

  let citingUrl: string | null = null;
  if (citingUrlRaw) {
    try {
      const u = new URL(citingUrlRaw);
      if (!/^https?:$/.test(u.protocol)) throw new Error("scheme");
      citingUrl = u.toString();
    } catch {
      return NextResponse.json({ error: "La URL no es válida." }, { status: 400 });
    }
  }

  let pdfFile: File | null = null;
  if (pdf instanceof File && pdf.size > 0) {
    if (pdf.type !== "application/pdf") {
      return NextResponse.json(
        { error: "El archivo debe ser un PDF." },
        { status: 400 },
      );
    }
    if (pdf.size > MAX_PDF_SIZE) {
      return NextResponse.json(
        { error: "El PDF excede el tamaño máximo de 10 MB." },
        { status: 400 },
      );
    }
    pdfFile = pdf;
  }

  // ─── Crear fila ──
  const cita = await prisma.citacionExterna.create({
    data: {
      investigacionId: inv.id,
      declaredById: authUser.id,
      citingTitle,
      citingAuthor,
      citingYear,
      citingSource,
      citingUrl,
      status: "pendiente",
    },
    select: { id: true },
  });

  // ─── Subir PDF si existe ──
  if (pdfFile) {
    try {
      const buffer = Buffer.from(await pdfFile.arrayBuffer());
      const path = `${authUser.id}/${cita.id}.pdf`;
      const supabaseAdmin = getSupabaseAdmin();
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: "application/pdf",
          upsert: false,
        });
      if (uploadError) {
        // Revertir fila si el upload falla
        await prisma.citacionExterna.delete({ where: { id: cita.id } });
        return NextResponse.json(
          { error: `Error al subir el PDF: ${uploadError.message}` },
          { status: 500 },
        );
      }
      await prisma.citacionExterna.update({
        where: { id: cita.id },
        data: { citingPdfUrl: path }, // path, NO URL pública
      });
    } catch (e) {
      // Revertir fila ante cualquier excepción
      await prisma.citacionExterna.delete({ where: { id: cita.id } });
      const msg = e instanceof Error ? e.message : "Error desconocido al subir PDF.";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ id: cita.id }, { status: 201 });
}
