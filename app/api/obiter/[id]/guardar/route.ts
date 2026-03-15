import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── POST: Toggle Guardar ───────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: obiterId } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar que el obiter existe
  const obiter = await prisma.obiterDictum.findUnique({
    where: { id: obiterId },
    select: { id: true },
  });

  if (!obiter) {
    return NextResponse.json(
      { error: "Obiter no encontrado" },
      { status: 404 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  // SÍ se puede guardar tu propio obiter
  const existing = await prisma.obiterGuardado.findUnique({
    where: { obiterId_userId: { obiterId, userId: authUser.id } },
  });

  if (existing) {
    await prisma.obiterGuardado.delete({ where: { id: existing.id } });
    await prisma.obiterDictum.update({
      where: { id: obiterId },
      data: { guardadosCount: { decrement: 1 } },
    });

    return NextResponse.json({ guardado: false });
  } else {
    await prisma.obiterGuardado.create({
      data: { obiterId, userId: authUser.id },
    });
    await prisma.obiterDictum.update({
      where: { id: obiterId },
      data: { guardadosCount: { increment: 1 } },
    });

    return NextResponse.json({ guardado: true });
  }
}
