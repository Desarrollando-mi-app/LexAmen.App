import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── POST: Toggle Guardar Ensayo ────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ensayoId } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar que el ensayo existe
  const ensayo = await prisma.ensayo.findUnique({
    where: { id: ensayoId, isActive: true },
    select: { id: true },
  });

  if (!ensayo) {
    return NextResponse.json(
      { error: "Ensayo no encontrado" },
      { status: 404 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  // SÍ se puede guardar tu propio ensayo
  const existing = await prisma.ensayoGuardado.findUnique({
    where: { ensayoId_userId: { ensayoId, userId: authUser.id } },
  });

  if (existing) {
    await prisma.ensayoGuardado.delete({ where: { id: existing.id } });
    await prisma.ensayo.update({
      where: { id: ensayoId },
      data: { guardadosCount: { decrement: 1 } },
    });

    return NextResponse.json({ guardado: false });
  } else {
    await prisma.ensayoGuardado.create({
      data: { ensayoId, userId: authUser.id },
    });
    await prisma.ensayo.update({
      where: { id: ensayoId },
      data: { guardadosCount: { increment: 1 } },
    });

    return NextResponse.json({ guardado: true });
  }
}
