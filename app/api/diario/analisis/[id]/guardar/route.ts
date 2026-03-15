import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── POST: Toggle Guardar Análisis ─────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: analisisId } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar que el análisis existe
  const analisis = await prisma.analisisSentencia.findUnique({
    where: { id: analisisId, isActive: true },
    select: { id: true },
  });

  if (!analisis) {
    return NextResponse.json(
      { error: "Análisis no encontrado" },
      { status: 404 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  // SÍ se puede guardar tu propio análisis
  const existing = await prisma.analisisGuardado.findUnique({
    where: {
      analisisId_userId: { analisisId, userId: authUser.id },
    },
  });

  if (existing) {
    await prisma.analisisGuardado.delete({ where: { id: existing.id } });
    await prisma.analisisSentencia.update({
      where: { id: analisisId },
      data: { guardadosCount: { decrement: 1 } },
    });

    return NextResponse.json({ guardado: false });
  } else {
    await prisma.analisisGuardado.create({
      data: { analisisId, userId: authUser.id },
    });
    await prisma.analisisSentencia.update({
      where: { id: analisisId },
      data: { guardadosCount: { increment: 1 } },
    });

    return NextResponse.json({ guardado: true });
  }
}
