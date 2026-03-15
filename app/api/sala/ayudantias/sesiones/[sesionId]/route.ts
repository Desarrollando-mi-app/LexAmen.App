import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sesionId: string }> }
) {
  const { sesionId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { status } = body;

  if (!["confirmada", "completada", "cancelada"].includes(status)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  const sesion = await prisma.ayudantiaSesion.findUnique({
    where: { id: sesionId },
    include: {
      tutor: { select: { id: true, firstName: true, lastName: true } },
      estudiante: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!sesion) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const isParticipant = sesion.tutorId === authUser.id || sesion.estudianteId === authUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "No eres participante de esta sesión" }, { status: 403 });
  }

  // Validate transitions
  const validTransitions: Record<string, string[]> = {
    pendiente: ["confirmada", "cancelada"],
    confirmada: ["completada", "cancelada"],
  };

  if (!validTransitions[sesion.status]?.includes(status)) {
    return NextResponse.json(
      { error: `No se puede cambiar de "${sesion.status}" a "${status}"` },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = { status };

  if (status === "completada") {
    updateData.completadaAt = new Date();
  } else if (status === "cancelada") {
    updateData.canceladaAt = new Date();
    updateData.canceladaPor = authUser.id;
  }

  const updated = await prisma.ayudantiaSesion.update({
    where: { id: sesionId },
    data: updateData,
  });

  // Determine the other participant
  const otherUserId = authUser.id === sesion.tutorId ? sesion.estudianteId : sesion.tutorId;
  const currentName = authUser.id === sesion.tutorId
    ? sesion.tutor.firstName
    : sesion.estudiante.firstName;

  if (status === "completada") {
    // Notify both participants
    for (const uid of [sesion.tutorId, sesion.estudianteId]) {
      await sendNotification({
        type: "SYSTEM_INDIVIDUAL",
        title: "Sesión completada",
        body: `Tu sesión de ${sesion.materia} ha sido marcada como completada. ¡Evalúa a tu compañero!`,
        targetUserId: uid,
        metadata: { sesionId },
      });
    }
  } else if (status === "cancelada") {
    await sendNotification({
      type: "SYSTEM_INDIVIDUAL",
      title: "Sesión cancelada",
      body: `${currentName} canceló la sesión de ${sesion.materia}`,
      targetUserId: otherUserId,
      metadata: { sesionId },
    });
  } else if (status === "confirmada") {
    await sendNotification({
      type: "SYSTEM_INDIVIDUAL",
      title: "Sesión confirmada",
      body: `${currentName} confirmó la sesión de ${sesion.materia}`,
      targetUserId: otherUserId,
      metadata: { sesionId },
    });
  }

  return NextResponse.json({ sesion: updated });
}
