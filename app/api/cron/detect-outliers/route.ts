import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── /api/cron/detect-outliers ─────────────────────────────────
//
// Cron horario. Detecta investigaciones con >10 citas internas (no
// auto-citas) en las últimas 48h. Para cada outlier, crea un
// CitacionReporte con reason='outlier_detected' apuntando a la
// última cita recibida (representativa). NO bloquea automáticamente,
// solo marca para revisión por admin.
//
// Idempotencia: si ya existe un reporte 'outlier_detected' reciente
// (dentro de la misma ventana 48h) sobre cualquier cita de la misma
// investigación, no crea otro.
//
// reportedById = "system" (string sentinela). El schema de
// CitacionReporte declara reportedById como String sin @relation, por
// lo que NO hay FK constraint a User. Si en el futuro se agrega una
// FK, hay que seedear un user con id='system' o cambiar la columna a
// nullable.

const OUTLIER_THRESHOLD = 10;
const WINDOW_HOURS = 48;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

  type OutlierRow = { inv_id: string; cnt: bigint };
  const outliers = await prisma.$queryRaw<OutlierRow[]>`
    SELECT "citedInvId" AS inv_id, COUNT(*) AS cnt
    FROM citaciones
    WHERE "createdAt" >= ${since}
      AND "isSelfCitation" = false
    GROUP BY "citedInvId"
    HAVING COUNT(*) > ${OUTLIER_THRESHOLD}
  `;

  const flagged: Array<{ invId: string; cites: number }> = [];

  for (const row of outliers) {
    // ¿Ya existe un reporte 'outlier_detected' reciente sobre esta inv?
    const existing = await prisma.citacionReporte.findFirst({
      where: {
        citacion: { citedInvId: row.inv_id },
        reason: "outlier_detected",
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (existing) continue;

    // Tomar la última cita recibida (no auto) como representativa
    const lastCita = await prisma.citacion.findFirst({
      where: {
        citedInvId: row.inv_id,
        isSelfCitation: false,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!lastCita) continue;

    const count = Number(row.cnt);
    await prisma.citacionReporte.create({
      data: {
        citacionId: lastCita.id,
        reportedById: "system",
        reason: "outlier_detected",
        details: `Investigación recibió ${count} citas en últimas ${WINDOW_HOURS}h. Revisión recomendada.`,
        status: "abierto",
      },
    });
    flagged.push({ invId: row.inv_id, cites: count });
  }

  return NextResponse.json({
    threshold: OUTLIER_THRESHOLD,
    windowHours: WINDOW_HOURS,
    flagged: flagged.length,
    items: flagged,
  });
}
