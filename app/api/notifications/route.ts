import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getUnreadCount } from "@/lib/notifications";

// ─── GET: Listar notificaciones del usuario (paginado) ──────

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  const userNotifications = await prisma.userNotification.findMany({
    where: { userId: authUser.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      notification: {
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  });

  const hasMore = userNotifications.length > limit;
  const items = hasMore ? userNotifications.slice(0, limit) : userNotifications;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const unreadCount = await getUnreadCount(authUser.id);

  return NextResponse.json({
    items: items.map((un) => ({
      id: un.id,
      notificationId: un.notification.id,
      type: un.notification.type,
      title: un.notification.title,
      body: un.notification.body,
      metadata: un.notification.metadata,
      readAt: un.readAt,
      createdAt: un.createdAt,
    })),
    nextCursor,
    unreadCount,
  });
}
