import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getColegaStatus } from "@/lib/colegas";
import { sendNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { targetUserId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { targetUserId } = body;

  if (!targetUserId) {
    return NextResponse.json(
      { error: "targetUserId es requerido" },
      { status: 400 }
    );
  }

  if (targetUserId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes enviarte solicitud a ti mismo" },
      { status: 400 }
    );
  }

  // Verificar que el usuario existe
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, firstName: true },
  });

  if (!target) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  // Verificar estado actual
  const currentStatus = await getColegaStatus(authUser.id, targetUserId);

  if (currentStatus.status === "accepted") {
    return NextResponse.json(
      { error: "Ya son colegas" },
      { status: 409 }
    );
  }

  if (currentStatus.status === "pending_sent") {
    return NextResponse.json(
      { error: "Ya tienes una solicitud pendiente" },
      { status: 409 }
    );
  }

  // Si hay una solicitud pendiente del otro hacia mí, auto-aceptar
  if (currentStatus.status === "pending_received" && currentStatus.requestId) {
    await prisma.colegaRequest.update({
      where: { id: currentStatus.requestId },
      data: { status: "ACCEPTED" },
    });

    const sender = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true },
    });

    sendNotification({
      type: "COLEGA_ACCEPTED",
      title: "¡Nuevo Colega!",
      body: `${sender?.firstName ?? "Alguien"} aceptó tu solicitud de colega`,
      targetUserId,
    }).catch(() => {});

    return NextResponse.json({
      requestId: currentStatus.requestId,
      autoAccepted: true,
    });
  }

  // Si fue rechazada, borrar la anterior y crear nueva
  if (currentStatus.status === "rejected" && currentStatus.requestId) {
    await prisma.colegaRequest.delete({
      where: { id: currentStatus.requestId },
    });
  }

  // Crear nueva solicitud
  const colegaRequest = await prisma.colegaRequest.create({
    data: {
      senderId: authUser.id,
      receiverId: targetUserId,
    },
  });

  // Enviar notificación
  const sender = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true },
  });

  sendNotification({
    type: "COLEGA_REQUEST",
    title: "Nueva solicitud de Colega",
    body: `${sender?.firstName ?? "Alguien"} quiere agregarte como Colega`,
    targetUserId,
    metadata: { requestId: colegaRequest.id, senderId: authUser.id },
  }).catch(() => {});

  return NextResponse.json({ requestId: colegaRequest.id });
}
