import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// ─── PATCH /api/admin/peer-review/postulaciones/[id] ───────
//
// Resuelve una postulación: aprobar o rechazar. Aprobar marca el flag
// `User.isPeerReviewer = true` y registra `peerReviewerSince`. Rechazar
// requiere una nota (visible para el usuario).
//
// Body: { action: "aprobar" | "rechazar", nota?: string }

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

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
  const action = body.action as "aprobar" | "rechazar" | undefined;
  const nota = typeof body.nota === "string" ? body.nota.trim() : "";

  if (action !== "aprobar" && action !== "rechazar") {
    return NextResponse.json(
      { error: "action debe ser 'aprobar' o 'rechazar'." },
      { status: 400 }
    );
  }

  if (action === "rechazar" && nota.length < 10) {
    return NextResponse.json(
      { error: "Una nota de al menos 10 caracteres es obligatoria al rechazar." },
      { status: 400 }
    );
  }

  const postulacion = await prisma.peerReviewPostulacion.findUnique({
    where: { id },
    select: { id: true, userId: true, estado: true },
  });

  if (!postulacion) {
    return NextResponse.json(
      { error: "Postulación no encontrada." },
      { status: 404 }
    );
  }

  if (postulacion.estado !== "pendiente") {
    return NextResponse.json(
      { error: "La postulación ya fue resuelta." },
      { status: 400 }
    );
  }

  const ahora = new Date();
  const nuevoEstado = action === "aprobar" ? "aprobada" : "rechazada";

  // Transacción: actualizar postulación + (si aprobada) marcar usuario.
  await prisma.$transaction(async (tx) => {
    await tx.peerReviewPostulacion.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        resueltoPorId: authUser.id,
        resueltaAt: ahora,
        resolucionNota: nota || null,
      },
    });

    if (action === "aprobar") {
      await tx.user.update({
        where: { id: postulacion.userId },
        data: {
          isPeerReviewer: true,
          peerReviewerSince: ahora,
        },
      });
    }
  });

  // Notificar al usuario.
  try {
    if (action === "aprobar") {
      await sendNotification({
        type: "SYSTEM_INDIVIDUAL",
        title: "¡Postulación a Peer Reviewer aprobada!",
        body: "Ya formas parte del cuerpo de revisores de Iuris. Recibirás solicitudes de revisión cuando otros autores las pidan.",
        targetUserId: postulacion.userId,
      });
    } else {
      await sendNotification({
        type: "SYSTEM_INDIVIDUAL",
        title: "Postulación a Peer Reviewer no aprobada",
        body: nota
          ? `Tu postulación fue revisada. Nota del editor: ${nota}`
          : "Tu postulación fue revisada y no fue aprobada en esta oportunidad.",
        targetUserId: postulacion.userId,
      });
    }
  } catch {
    /* notificación es best-effort */
  }

  return NextResponse.json({ ok: true, estado: nuevoEstado });
}
