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
    type?: "SYSTEM_BROADCAST" | "SYSTEM_SEGMENTED" | "SYSTEM_INDIVIDUAL";
    title: string;
    body: string;
    targetUserId?: string;
    targetSegment?: string;
    segment?: string;
    sendEmail?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.title || !body.body) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios: title, body" },
      { status: 400 }
    );
  }

  // Support both legacy `type` field and new `segment` field
  let notifType = body.type;
  let targetSegment = body.targetSegment;

  if (!notifType && body.segment) {
    if (body.segment === "all") {
      notifType = "SYSTEM_BROADCAST";
    } else {
      notifType = "SYSTEM_SEGMENTED";
      targetSegment = body.segment;
    }
  }

  if (!notifType) {
    notifType = "SYSTEM_BROADCAST";
  }

  const result = await sendNotification({
    type: notifType,
    title: body.title,
    body: body.body,
    targetUserId: body.targetUserId,
    targetSegment: targetSegment,
    sendEmail: body.sendEmail ?? false,
  });

  // Log the action
  await prisma.adminLog.create({
    data: {
      adminId: authUser.id,
      action: "SEND_NOTIFICATION",
      target: result.notificationId ?? null,
      metadata: {
        title: body.title,
        segment: body.segment ?? notifType,
        recipientCount: result.recipientCount ?? 0,
      },
    },
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
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: {
        type: {
          in: ["SYSTEM_BROADCAST", "SYSTEM_SEGMENTED", "SYSTEM_INDIVIDUAL"],
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        userNotifications: {
          select: { readAt: true },
        },
      },
    }),
    prisma.notification.count({
      where: {
        type: {
          in: ["SYSTEM_BROADCAST", "SYSTEM_SEGMENTED", "SYSTEM_INDIVIDUAL"],
        },
      },
    }),
  ]);

  return NextResponse.json({
    history: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      targetSegment: n.targetSegment,
      createdAt: n.createdAt.toISOString(),
      recipientCount: n.userNotifications.length,
      readCount: n.userNotifications.filter((un) => un.readAt !== null).length,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
