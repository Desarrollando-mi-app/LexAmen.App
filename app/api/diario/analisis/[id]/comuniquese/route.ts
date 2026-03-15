import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Toggle Comuníquese Análisis ─────────────────────

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
    select: { id: true, userId: true },
  });

  if (!analisis) {
    return NextResponse.json(
      { error: "Análisis no encontrado" },
      { status: 404 }
    );
  }

  // No se puede comunicar tu propio análisis
  if (analisis.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes comunicar tu propio análisis" },
      { status: 400 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  const existing = await prisma.analisisComuniquese.findUnique({
    where: {
      analisisId_userId: { analisisId, userId: authUser.id },
    },
  });

  if (existing) {
    // Des-comunicar
    await prisma.analisisComuniquese.delete({ where: { id: existing.id } });
    await prisma.analisisSentencia.update({
      where: { id: analisisId },
      data: { comuniqueseCount: { decrement: 1 } },
    });

    return NextResponse.json({ comunicado: false });
  } else {
    // Comunicar
    await prisma.analisisComuniquese.create({
      data: { analisisId, userId: authUser.id },
    });
    await prisma.analisisSentencia.update({
      where: { id: analisisId },
      data: { comuniqueseCount: { increment: 1 } },
    });

    // XP +3 al autor del análisis (su contenido fue amplificado)
    if (analisis.userId !== authUser.id) {
      await prisma.user.update({
        where: { id: analisis.userId },
        data: { xp: { increment: 3 } },
      });
    }

    // Notificación al autor
    const actor = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true, lastName: true },
    });

    if (actor) {
      await sendNotification({
        type: "ANALISIS_COMUNIQUESE",
        title: "Tu análisis fue comunicado",
        body: `${actor.firstName} ${actor.lastName} comunicó y publicó tu análisis`,
        targetUserId: analisis.userId,
        metadata: {
          analisisId,
          actorId: authUser.id,
          actorName: `${actor.firstName} ${actor.lastName}`,
        },
      });
    }

    return NextResponse.json({ comunicado: true });
  }
}
