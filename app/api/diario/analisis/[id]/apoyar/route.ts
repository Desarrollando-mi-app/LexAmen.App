import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Toggle Apoyar Análisis ──────────────────────────

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

  // No se puede apoyar tu propio análisis
  if (analisis.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes apoyar tu propio análisis" },
      { status: 400 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  const existing = await prisma.analisisApoyo.findUnique({
    where: {
      analisisId_userId: { analisisId, userId: authUser.id },
    },
  });

  if (existing) {
    // Des-apoyar
    await prisma.analisisApoyo.delete({ where: { id: existing.id } });
    await prisma.analisisSentencia.update({
      where: { id: analisisId },
      data: { apoyosCount: { decrement: 1 } },
    });

    return NextResponse.json({ apoyado: false });
  } else {
    // Apoyar
    await prisma.analisisApoyo.create({
      data: { analisisId, userId: authUser.id },
    });
    await prisma.analisisSentencia.update({
      where: { id: analisisId },
      data: { apoyosCount: { increment: 1 } },
    });

    // Notificación al autor (con agrupación de apoyos recientes)
    const actor = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true, lastName: true },
    });

    if (actor) {
      // Buscar notificación reciente no leída de apoyo para este análisis (últimos 5 min)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentNotif = await prisma.notification.findFirst({
        where: {
          type: "ANALISIS_APOYO",
          targetUserId: analisis.userId,
          createdAt: { gte: fiveMinAgo },
          metadata: { path: ["analisisId"], equals: analisisId },
          userNotifications: { some: { readAt: null } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentNotif) {
        // Agrupar: actualizar el texto de la notificación existente
        const apoyoCount = await prisma.analisisApoyo.count({
          where: { analisisId },
        });
        const body =
          apoyoCount > 2
            ? `${actor.firstName} ${actor.lastName} y ${apoyoCount - 1} más apoyaron tu análisis`
            : `${actor.firstName} ${actor.lastName} apoyó tu análisis`;

        await prisma.notification.update({
          where: { id: recentNotif.id },
          data: { body },
        });
      } else {
        // Nueva notificación
        await sendNotification({
          type: "ANALISIS_APOYO",
          title: "Tu análisis recibió un apoyo",
          body: `${actor.firstName} ${actor.lastName} apoyó tu análisis`,
          targetUserId: analisis.userId,
          metadata: {
            analisisId,
            actorId: authUser.id,
            actorName: `${actor.firstName} ${actor.lastName}`,
          },
        });
      }
    }

    return NextResponse.json({ apoyado: true });
  }
}
