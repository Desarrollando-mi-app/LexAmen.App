// ─── Sistema de Notificaciones (server-only) ────────────────────
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lexamen.cl";

// ─── Types ────────────────────────────────────────────────

type NotificationType =
  | "SYSTEM_BROADCAST"
  | "SYSTEM_SEGMENTED"
  | "SYSTEM_INDIVIDUAL"
  | "LEAGUE_RESULT"
  | "CAUSA_FINISHED"
  | "NEW_CONTENT"
  | "BADGE_EARNED"
  | "COLEGA_REQUEST"
  | "COLEGA_ACCEPTED"
  | "CV_REQUEST"
  | "CV_REQUEST_ACCEPTED";

interface SendNotificationOptions {
  type: NotificationType;
  title: string;
  body: string;
  targetUserId?: string;
  targetSegment?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
}

// ─── Core: enviar notificación ────────────────────────────

export async function sendNotification({
  type,
  title,
  body,
  targetUserId,
  targetSegment,
  metadata,
  sendEmail = false,
}: SendNotificationOptions): Promise<{
  notificationId: string;
  recipientCount: number;
}> {
  // 1. Crear registro Notification
  const notification = await prisma.notification.create({
    data: {
      type,
      title,
      body,
      targetUserId,
      targetSegment,
      metadata: metadata ? (metadata as object) : undefined,
      sentViaEmail: sendEmail,
    },
  });

  // 2. Resolver destinatarios
  let userIds: string[] = [];

  if (targetUserId) {
    // Individual
    userIds = [targetUserId];
  } else if (targetSegment) {
    userIds = await resolveSegment(targetSegment);
  } else {
    // Broadcast: todos
    const allUsers = await prisma.user.findMany({
      select: { id: true },
    });
    userIds = allUsers.map((u) => u.id);
  }

  // 3. Batch insert UserNotification
  if (userIds.length > 0) {
    await prisma.userNotification.createMany({
      data: userIds.map((userId) => ({
        userId,
        notificationId: notification.id,
      })),
      skipDuplicates: true,
    });
  }

  // 4. Enviar email si corresponde
  if (sendEmail && userIds.length > 0) {
    // Enviar en background (no bloquear)
    sendEmailsInBackground(userIds, title, body).catch(() => {
      // Log silencioso
    });
  }

  return {
    notificationId: notification.id,
    recipientCount: userIds.length,
  };
}

// ─── Resolver segmento ────────────────────────────────────

async function resolveSegment(segment: string): Promise<string[]> {
  if (segment === "free") {
    const users = await prisma.user.findMany({
      where: {
        subscriptions: { none: { status: "ACTIVE" } },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (segment === "premium") {
    const users = await prisma.user.findMany({
      where: {
        subscriptions: { some: { status: "ACTIVE" } },
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  if (segment.startsWith("tier:")) {
    const tier = segment.replace("tier:", "");
    const members = await prisma.leagueMember.findMany({
      where: {
        league: { tier: tier as never },
      },
      select: { userId: true },
      distinct: ["userId"],
    });
    return members.map((m) => m.userId);
  }

  return [];
}

// ─── Enviar emails en background ──────────────────────────

async function sendEmailsInBackground(
  userIds: string[],
  title: string,
  body: string
) {
  // Limitar a 50 emails por batch para no sobrecargar
  const batchSize = 50;
  const batches = [];
  for (let i = 0; i < userIds.length; i += batchSize) {
    batches.push(userIds.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const users = await prisma.user.findMany({
      where: { id: { in: batch } },
      select: { id: true, email: true, firstName: true },
    });

    for (const user of users) {
      try {
        await sendNotificationEmail(user.email, user.firstName, title, body);
      } catch {
        // Silently fail per email
      }
    }
  }
}

// ─── Enviar email individual ──────────────────────────────

async function sendNotificationEmail(
  email: string,
  firstName: string,
  title: string,
  body: string
) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#F6F1E9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background-color:#12203A;padding:24px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Iuris Studio</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="color:#12203A;font-size:16px;margin:0 0 8px;">Hola ${firstName},</p>
        <h2 style="color:#12203A;font-size:20px;margin:16px 0 8px;">${title}</h2>
        <p style="color:#12203A;font-size:15px;line-height:1.6;margin:0 0 24px;">${body}</p>
        <a href="${APP_URL}/dashboard" style="display:inline-block;background-color:#9A7230;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
          Abrir Iuris Studio
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;border-top:1px solid #D4C9B4;text-align:center;">
        <p style="color:#12203A;opacity:0.5;font-size:12px;margin:0;">
          Iuris Studio · Derecho Civil & Procesal Civil
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from: "Iuris Studio <noreply@lexamen.cl>",
    to: email,
    subject: `[Iuris Studio] ${title}`,
    html,
  });
}

// ─── Utilidades de lectura ────────────────────────────────

export async function markAsRead(
  userId: string,
  notificationId: string
) {
  await prisma.userNotification.updateMany({
    where: { userId, notificationId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.userNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.userNotification.count({
    where: { userId, readAt: null },
  });
}
