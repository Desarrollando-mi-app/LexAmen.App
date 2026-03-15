import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { action, rejectionReason } = body as {
    action: "aprobar" | "rechazar";
    rejectionReason?: string;
  };

  const evento = await prisma.eventoAcademico.findUnique({
    where: { id },
    select: { titulo: true, userId: true, approvalStatus: true },
  });

  if (!evento) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  if (action === "aprobar") {
    await prisma.eventoAcademico.update({
      where: { id },
      data: {
        approvalStatus: "aprobado",
        approvedAt: new Date(),
        approvedBy: authUser.id,
      },
    });

    try {
      await sendNotification({
        type: "SYSTEM_INDIVIDUAL",
        title: "¡Tu evento ha sido aprobado!",
        body: `Tu evento "${evento.titulo}" ha sido aprobado y ya está publicado en La Sala.`,
        targetUserId: evento.userId,
      });
    } catch { /* silent */ }
  } else if (action === "rechazar") {
    if (!rejectionReason?.trim()) {
      return NextResponse.json({ error: "Motivo de rechazo es requerido" }, { status: 400 });
    }

    await prisma.eventoAcademico.update({
      where: { id },
      data: {
        approvalStatus: "rechazado",
        rejectionReason: rejectionReason.trim(),
      },
    });

    try {
      await sendNotification({
        type: "SYSTEM_INDIVIDUAL",
        title: "Evento no aprobado",
        body: `Tu evento "${evento.titulo}" no fue aprobado. Motivo: ${rejectionReason.trim()}`,
        targetUserId: evento.userId,
      });
    } catch { /* silent */ }
  } else {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
