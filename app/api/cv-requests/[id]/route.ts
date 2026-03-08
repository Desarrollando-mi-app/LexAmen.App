import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { action } = await request.json();

  if (!["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const cvRequest = await prisma.cvRequest.findUnique({
    where: { id: params.id },
    include: {
      toUser: { select: { firstName: true, lastName: true } },
      fromUser: { select: { firstName: true } },
    },
  });

  if (!cvRequest) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (cvRequest.toUserId !== authUser.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (cvRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Esta solicitud ya fue procesada" },
      { status: 400 }
    );
  }

  const newStatus = action === "accept" ? "accepted" : "declined";

  await prisma.cvRequest.update({
    where: { id: params.id },
    data: { status: newStatus },
  });

  // Notify sender if accepted
  if (action === "accept") {
    await sendNotification({
      type: "CV_REQUEST_ACCEPTED",
      title: "Tu solicitud de CV fue aceptada",
      body: `${cvRequest.toUser.firstName} ${cvRequest.toUser.lastName} aceptó tu solicitud — contacta directamente`,
      targetUserId: cvRequest.fromUserId,
      metadata: {
        cvRequestId: cvRequest.id,
        toUserId: cvRequest.toUserId,
      },
    });
  }

  return NextResponse.json({ status: newStatus });
}
