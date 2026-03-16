import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { awardXp, XP_RECIBIR_COMUNIQUESE_OBITER } from "@/lib/xp-config";

// ─── POST: Toggle Comuníquese ───────────────────────────────

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
    select: { id: true, userId: true },
  });

  if (!obiter) {
    return NextResponse.json(
      { error: "Obiter no encontrado" },
      { status: 404 }
    );
  }

  // No se puede Comunicar tu propio obiter
  if (obiter.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes comunicar tu propio Obiter" },
      { status: 400 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  // Comuníquese NO cuenta contra el límite de 5/día (es ilimitado)
  const existing = await prisma.obiterComuniquese.findUnique({
    where: { obiterId_userId: { obiterId, userId: authUser.id } },
  });

  if (existing) {
    // Des-comunicar
    await prisma.obiterComuniquese.delete({ where: { id: existing.id } });
    await prisma.obiterDictum.update({
      where: { id: obiterId },
      data: { comuniqueseCount: { decrement: 1 } },
    });

    return NextResponse.json({ comunicado: false });
  } else {
    // Comunicar
    await prisma.obiterComuniquese.create({
      data: { obiterId, userId: authUser.id },
    });
    await prisma.obiterDictum.update({
      where: { id: obiterId },
      data: { comuniqueseCount: { increment: 1 } },
    });

    // XP al autor del obiter (su contenido fue amplificado)
    if (obiter.userId !== authUser.id) {
      await awardXp({
        userId: obiter.userId,
        amount: XP_RECIBIR_COMUNIQUESE_OBITER,
        category: "publicaciones",
        prisma,
      });
    }

    // Notificación al autor
    const actor = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true, lastName: true },
    });

    if (actor) {
      await sendNotification({
        type: "OBITER_COMUNIQUESE",
        title: "Tu Obiter fue comunicado",
        body: `${actor.firstName} ${actor.lastName} comunicó y publicó tu Obiter`,
        targetUserId: obiter.userId,
        metadata: {
          obiterId,
          actorId: authUser.id,
          actorName: `${actor.firstName} ${actor.lastName}`,
        },
      });
    }

    return NextResponse.json({ comunicado: true });
  }
}
