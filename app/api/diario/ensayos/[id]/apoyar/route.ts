import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Toggle Apoyar Ensayo ─────────────────────────────

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

  // No se puede apoyar tu propio ensayo
  if (ensayo.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes apoyar tu propio ensayo" },
      { status: 400 }
    );
  }

  // Toggle: existe → eliminar, no existe → crear
  const existing = await prisma.ensayoApoyo.findUnique({
    where: { ensayoId_userId: { ensayoId, userId: authUser.id } },
  });

  if (existing) {
    // Des-apoyar
    await prisma.ensayoApoyo.delete({ where: { id: existing.id } });
    await prisma.ensayo.update({
      where: { id: ensayoId },
      data: { apoyosCount: { decrement: 1 } },
    });

    return NextResponse.json({ apoyado: false });
  } else {
    // Apoyar
    await prisma.ensayoApoyo.create({
      data: { ensayoId, userId: authUser.id },
    });
    await prisma.ensayo.update({
      where: { id: ensayoId },
      data: { apoyosCount: { increment: 1 } },
    });

    // Notificación al autor (con agrupación de apoyos recientes)
    const actor = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true, lastName: true },
    });

    if (actor) {
      // Buscar notificación reciente no leída de apoyo para este ensayo (últimos 5 min)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentNotif = await prisma.notification.findFirst({
        where: {
          type: "ENSAYO_APOYO",
          targetUserId: ensayo.userId,
          createdAt: { gte: fiveMinAgo },
          metadata: { path: ["ensayoId"], equals: ensayoId },
          userNotifications: { some: { readAt: null } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentNotif) {
        // Agrupar: actualizar el texto de la notificación existente
        const apoyoCount = await prisma.ensayoApoyo.count({
          where: { ensayoId },
        });
        const body =
          apoyoCount > 2
            ? `${actor.firstName} ${actor.lastName} y ${apoyoCount - 1} más apoyaron tu ensayo`
            : `${actor.firstName} ${actor.lastName} apoyó tu ensayo`;

        await prisma.notification.update({
          where: { id: recentNotif.id },
          data: { body },
        });
      } else {
        // Nueva notificación
        await sendNotification({
          type: "ENSAYO_APOYO",
          title: "Tu ensayo recibió un apoyo",
          body: `${actor.firstName} ${actor.lastName} apoyó tu ensayo`,
          targetUserId: ensayo.userId,
          metadata: {
            ensayoId,
            actorId: authUser.id,
            actorName: `${actor.firstName} ${actor.lastName}`,
          },
        });
      }
    }

    return NextResponse.json({ apoyado: true });
  }
}
