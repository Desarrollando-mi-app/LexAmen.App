import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Check event exists and is approved
  const evento = await prisma.eventoAcademico.findUnique({
    where: { id },
    select: {
      id: true,
      isActive: true,
      approvalStatus: true,
      titulo: true,
      userId: true,
    },
  });

  if (!evento || !evento.isActive || evento.approvalStatus !== "aprobado") {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  // Toggle interest
  const existing = await prisma.eventoInteres.findUnique({
    where: { eventoId_userId: { eventoId: id, userId: authUser.id } },
  });

  if (existing) {
    await prisma.eventoInteres.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ interesado: false });
  }

  await prisma.eventoInteres.create({
    data: { eventoId: id, userId: authUser.id },
  });

  // ── Notify event creator (if not self) with 30-min grouping ──
  if (evento.userId && evento.userId !== authUser.id) {
    // Check for recent EVENTO_INTERES notification for this event (30-min window)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentNotification = await prisma.notification.findFirst({
      where: {
        type: "EVENTO_INTERES",
        targetUserId: evento.userId,
        createdAt: { gte: thirtyMinAgo },
        metadata: { path: ["eventoId"], equals: id },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!recentNotification) {
      // Get the interested user's name
      const interestedUser = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { firstName: true, lastName: true },
      });

      const userName = interestedUser
        ? `${interestedUser.firstName} ${interestedUser.lastName}`
        : "Alguien";

      await sendNotification({
        type: "EVENTO_INTERES",
        title: "Interés en tu evento",
        body: `${userName} marcó "Me interesa" en tu evento "${evento.titulo}".`,
        targetUserId: evento.userId,
        metadata: { eventoId: id, eventoTitulo: evento.titulo },
      }).catch(() => {
        // Silent fail — don't break the interest toggle
      });
    }
  }

  return NextResponse.json({ interesado: true });
}
