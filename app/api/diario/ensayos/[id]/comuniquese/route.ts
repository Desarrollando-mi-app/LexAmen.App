import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { awardXp, XP_RECIBIR_COMUNIQUESE_DIARIO } from "@/lib/xp-config";

// ─── POST: Toggle Comuníquese Ensayo ────────────────────────

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
    select: { id: true, userId: true },
  });

  if (!ensayo) {
    return NextResponse.json(
      { error: "Ensayo no encontrado" },
      { status: 404 }
    );
  }

  // No se puede comunicar tu propio ensayo
  if (ensayo.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes comunicar tu propio ensayo" },
      { status: 400 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  const existing = await prisma.ensayoComuniquese.findUnique({
    where: { ensayoId_userId: { ensayoId, userId: authUser.id } },
  });

  if (existing) {
    // Des-comunicar
    await prisma.ensayoComuniquese.delete({ where: { id: existing.id } });
    await prisma.ensayo.update({
      where: { id: ensayoId },
      data: { comuniqueseCount: { decrement: 1 } },
    });

    return NextResponse.json({ comunicado: false });
  } else {
    // Comunicar
    await prisma.ensayoComuniquese.create({
      data: { ensayoId, userId: authUser.id },
    });
    await prisma.ensayo.update({
      where: { id: ensayoId },
      data: { comuniqueseCount: { increment: 1 } },
    });

    // XP al autor del ensayo (su contenido fue amplificado)
    if (ensayo.userId !== authUser.id) {
      await awardXp({
        userId: ensayo.userId,
        amount: XP_RECIBIR_COMUNIQUESE_DIARIO,
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
        type: "ENSAYO_COMUNIQUESE",
        title: "Tu ensayo fue comunicado",
        body: `${actor.firstName} ${actor.lastName} comunicó tu ensayo`,
        targetUserId: ensayo.userId,
        metadata: {
          ensayoId,
          actorId: authUser.id,
          actorName: `${actor.firstName} ${actor.lastName}`,
        },
      });
    }

    return NextResponse.json({ comunicado: true });
  }
}
