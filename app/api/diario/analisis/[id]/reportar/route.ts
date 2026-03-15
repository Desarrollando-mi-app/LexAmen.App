import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkAndAutoHide } from "@/lib/sala-reportes";

const MOTIVOS_VALIDOS = [
  "spam",
  "informacion_falsa",
  "contenido_inapropiado",
  "otro",
];

// ─── POST: Reportar Análisis ────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { motivo, descripcion } = body;

  if (!motivo || !MOTIVOS_VALIDOS.includes(motivo)) {
    return NextResponse.json({ error: "Motivo no válido" }, { status: 400 });
  }

  // Verificar que el análisis existe
  const analisis = await prisma.analisisSentencia.findUnique({
    where: { id, isActive: true },
    select: { id: true, userId: true },
  });

  if (!analisis) {
    return NextResponse.json(
      { error: "Análisis no encontrado" },
      { status: 404 }
    );
  }

  // No puedes reportar tu propia publicación
  if (analisis.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes reportar tu propia publicación" },
      { status: 400 }
    );
  }

  // Verificar si ya reportó
  const existingReport = await prisma.salaReporte.findFirst({
    where: { userId: authUser.id, analisisId: id },
  });

  if (existingReport) {
    return NextResponse.json(
      { error: "Ya reportaste esta publicación" },
      { status: 400 }
    );
  }

  // Crear reporte
  const reporte = await prisma.salaReporte.create({
    data: {
      userId: authUser.id,
      analisisId: id,
      motivo,
      descripcion: descripcion?.trim() || null,
    },
  });

  // Verificar si debe auto-ocultarse
  const { hidden } = await checkAndAutoHide({ analisisId: id });

  return NextResponse.json({ reporte, hidden }, { status: 201 });
}
