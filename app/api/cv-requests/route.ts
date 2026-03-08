import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { toUserId, message } = await request.json();

  if (!toUserId || toUserId === authUser.id) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  // Verify target user has CV available
  const targetUser = await prisma.user.findUnique({
    where: { id: toUserId },
    select: { cvAvailable: true, firstName: true, lastName: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (!targetUser.cvAvailable) {
    return NextResponse.json(
      { error: "Este usuario no acepta solicitudes de CV" },
      { status: 400 }
    );
  }

  // Check no existing request
  const existing = await prisma.cvRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: authUser.id, toUserId } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya existe una solicitud previa", status: existing.status },
      { status: 409 }
    );
  }

  // Create request
  const cvRequest = await prisma.cvRequest.create({
    data: {
      fromUserId: authUser.id,
      toUserId,
      message: message?.slice(0, 500) || null,
    },
  });

  // Get sender name
  const sender = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, lastName: true },
  });

  // Send notification
  await sendNotification({
    type: "CV_REQUEST",
    title: `${sender?.firstName ?? "Alguien"} solicita tu CV`,
    body: message || "Te han enviado una solicitud de CV",
    targetUserId: toUserId,
    metadata: { cvRequestId: cvRequest.id, fromUserId: authUser.id },
  });

  return NextResponse.json({ requestId: cvRequest.id });
}
