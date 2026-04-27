import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Toggle Apoyar ────────────────────────────────────

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

  // Verificar que el obiter existe + traer info de auto-summary
  const obiter = await prisma.obiterDictum.findUnique({
    where: { id: obiterId },
    select: {
      id: true,
      userId: true,
      kind: true,
      citedAnalisisId: true,
      citedEnsayoId: true,
      // citedDebate y citedExpediente no tienen apoyosCount (modelo
      // distinto), no propagamos.
    },
  });

  if (!obiter) {
    return NextResponse.json(
      { error: "Obiter no encontrado" },
      { status: 404 }
    );
  }

  // No se puede apoyar tu propio obiter
  if (obiter.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes apoyar tu propio Obiter" },
      { status: 400 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  const existing = await prisma.obiterApoyo.findUnique({
    where: { obiterId_userId: { obiterId, userId: authUser.id } },
  });

  if (existing) {
    // Des-apoyar
    await prisma.obiterApoyo.delete({ where: { id: existing.id } });
    await prisma.obiterDictum.update({
      where: { id: obiterId },
      data: { apoyosCount: { decrement: 1 } },
    });

    // Sync con el original si es OD-resumen auto-generado
    if (obiter.kind === "analisis_summary" && obiter.citedAnalisisId) {
      await prisma.analisisSentencia
        .update({
          where: { id: obiter.citedAnalisisId },
          data: { apoyosCount: { decrement: 1 } },
        })
        .catch(() => {});
    } else if (obiter.kind === "ensayo_summary" && obiter.citedEnsayoId) {
      await prisma.ensayo
        .update({
          where: { id: obiter.citedEnsayoId },
          data: { apoyosCount: { decrement: 1 } },
        })
        .catch(() => {});
    }

    return NextResponse.json({ apoyado: false });
  } else {
    // Apoyar
    await prisma.obiterApoyo.create({
      data: { obiterId, userId: authUser.id },
    });
    await prisma.obiterDictum.update({
      where: { id: obiterId },
      data: { apoyosCount: { increment: 1 } },
    });

    // Sync con el original si es OD-resumen auto-generado
    if (obiter.kind === "analisis_summary" && obiter.citedAnalisisId) {
      await prisma.analisisSentencia
        .update({
          where: { id: obiter.citedAnalisisId },
          data: { apoyosCount: { increment: 1 } },
        })
        .catch(() => {});
    } else if (obiter.kind === "ensayo_summary" && obiter.citedEnsayoId) {
      await prisma.ensayo
        .update({
          where: { id: obiter.citedEnsayoId },
          data: { apoyosCount: { increment: 1 } },
        })
        .catch(() => {});
    }

    // Notificación al autor (con agrupación de apoyos recientes)
    const actor = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true, lastName: true },
    });

    if (actor) {
      // Buscar notificación reciente no leída de apoyo para este obiter (últimos 5 min)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentNotif = await prisma.notification.findFirst({
        where: {
          type: "OBITER_APOYO",
          targetUserId: obiter.userId,
          createdAt: { gte: fiveMinAgo },
          metadata: { path: ["obiterId"], equals: obiterId },
          userNotifications: { some: { readAt: null } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentNotif) {
        // Agrupar: actualizar el texto de la notificación existente
        const apoyoCount = await prisma.obiterApoyo.count({
          where: { obiterId },
        });
        const body =
          apoyoCount > 2
            ? `${actor.firstName} ${actor.lastName} y ${apoyoCount - 1} más apoyaron tu Obiter`
            : `${actor.firstName} ${actor.lastName} apoyó tu Obiter`;

        await prisma.notification.update({
          where: { id: recentNotif.id },
          data: { body },
        });
      } else {
        // Nueva notificación
        await sendNotification({
          type: "OBITER_APOYO",
          title: "Tu Obiter recibió un apoyo",
          body: `${actor.firstName} ${actor.lastName} apoyó tu Obiter`,
          targetUserId: obiter.userId,
          metadata: {
            obiterId,
            actorId: authUser.id,
            actorName: `${actor.firstName} ${actor.lastName}`,
          },
        });
      }
    }

    return NextResponse.json({ apoyado: true });
  }
}
