import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Enviar notificación (solo admin) ─────────────────

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar isAdmin
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    type: "SYSTEM_BROADCAST" | "SYSTEM_SEGMENTED" | "SYSTEM_INDIVIDUAL";
    title: string;
    body: string;
    targetUserId?: string;
    targetSegment?: string;
    sendEmail?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.title || !body.body || !body.type) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios: type, title, body" },
      { status: 400 }
    );
  }

  const result = await sendNotification({
    type: body.type,
    title: body.title,
    body: body.body,
    targetUserId: body.targetUserId,
    targetSegment: body.targetSegment,
    sendEmail: body.sendEmail ?? false,
  });

  return NextResponse.json(result);
}

// ─── GET: Historial de notificaciones enviadas (solo admin) ──

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      _count: { select: { userNotifications: true } },
    },
  });

  return NextResponse.json({
    items: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      targetUserId: n.targetUserId,
      targetSegment: n.targetSegment,
      sentViaEmail: n.sentViaEmail,
      recipientCount: n._count.userNotifications,
      createdAt: n.createdAt,
    })),
  });
}
