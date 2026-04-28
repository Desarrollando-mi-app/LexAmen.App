// ─── Cron diario: recalcular métricas reputacionales ──────────
//
// Recorre todos los autores que recibieron al menos una citación
// (no auto-cita) en los últimos 30 días y recalcula su
// totalCitationsReceived + hIndex. Sirve como red de seguridad por si
// alguno de los hooks de POST/DELETE/verify externa quedó inconsistente.
//
// Configuración: vercel.json crons "0 3 * * *" (3:00 AM cada noche).
// Auth: header Authorization: Bearer <CRON_SECRET>.

import { prisma } from "@/lib/prisma";
import { recalculateUserMetrics } from "@/lib/citations";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  type UserRow = { user_id: string };
  const usersToRecalculate = await prisma.$queryRaw<UserRow[]>`
    SELECT DISTINCT "citedAuthorId" AS user_id
    FROM citaciones
    WHERE "createdAt" >= ${thirtyDaysAgo}
      AND "isSelfCitation" = false
  `;

  const results: Array<{
    userId: string;
    ok: boolean;
    totalCitationsReceived?: number;
    hIndex?: number;
    error?: string;
  }> = [];

  for (const { user_id } of usersToRecalculate) {
    try {
      const metrics = await recalculateUserMetrics(user_id);
      results.push({ userId: user_id, ...metrics, ok: true });
    } catch (error) {
      results.push({
        userId: user_id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ recalculated: results.length, results });
}
