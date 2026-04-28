// ─── Helpers de citaciones — Sprint 2 ─────────────────────────
//
// h-index, recálculo de métricas reputacionales, sparkline mensual y
// autoridad por institución. Todo server-only — usado por POST de
// /api/investigaciones, cron diario y server components del detalle/
// perfil.
//
// Convenciones:
//   - h-index sobre la suma `citationsInternal + citationsExternal` por
//     trabajo. Excluye auto-citas porque ya no entran en
//     `citationsInternal` (el POST las filtra).
//   - Sparkline: 12 meses corridos hacia atrás, rellenando con 0 los
//     meses sin actividad. Ignora `isSelfCitation = true`.

import { prisma } from "@/lib/prisma";

/**
 * Calcula el índice h del autor.
 * h = N tal que el autor tiene al menos N trabajos citados N o más
 * veces. Suma internas + externas verificadas por trabajo.
 *
 * Casos test (verificados en B-checklist):
 *   0 trabajos → 0
 *   [5] → 1
 *   [10, 8, 5, 4, 3] → 4
 *   [3, 3, 3] → 3
 */
export async function calculateHIndex(userId: string): Promise<number> {
  const works = await prisma.investigacion.findMany({
    where: { userId, status: "published" },
    select: { citationsInternal: true, citationsExternal: true },
  });

  const totals = works
    .map((w) => w.citationsInternal + w.citationsExternal)
    .sort((a, b) => b - a);

  let h = 0;
  for (let i = 0; i < totals.length; i++) {
    if (totals[i] >= i + 1) h = i + 1;
    else break;
  }
  return h;
}

/**
 * Recalcula totalCitationsReceived y hIndex del usuario y los persiste
 * en `User`. Llamar después de:
 *   - crear una investigación que cita a otra
 *   - borrar una cita (sprint posterior)
 *   - verificar/rechazar una cita externa (sprint 3)
 *
 * Devuelve los valores nuevos por conveniencia (logging, response).
 */
export async function recalculateUserMetrics(userId: string): Promise<{
  totalCitationsReceived: number;
  hIndex: number;
}> {
  const works = await prisma.investigacion.findMany({
    where: { userId, status: "published" },
    select: { citationsInternal: true, citationsExternal: true },
  });

  const totalCitationsReceived = works.reduce(
    (sum, w) => sum + w.citationsInternal + w.citationsExternal,
    0,
  );
  const hIndex = await calculateHIndex(userId);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalCitationsReceived,
      hIndex,
      hIndexUpdatedAt: new Date(),
    },
  });

  return { totalCitationsReceived, hIndex };
}

/**
 * Sparkline mensual de citas recibidas por una investigación.
 * 12 meses corridos hacia atrás, ordenados ASC. Meses sin citas →
 * count = 0 (mantiene largo fijo). Ignora auto-citas.
 *
 * Formato: [{ month: "2025-05", count: 3 }, ...]
 */
export async function getSparklineData(
  invId: string,
): Promise<{ month: string; count: number }[]> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  // Raw SQL: DATE_TRUNC mensual. Prisma no lo soporta limpio.
  const rows = await prisma.$queryRaw<
    Array<{ month: Date; count: bigint }>
  >`
    SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*) AS count
    FROM citaciones
    WHERE "citedInvId" = ${invId}
      AND "createdAt" >= ${twelveMonthsAgo}
      AND "isSelfCitation" = false
    GROUP BY month
    ORDER BY month ASC
  `;

  // Map de mes "YYYY-MM" → count
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.month.toISOString().slice(0, 7);
    map.set(key, Number(row.count));
  }

  // Construir array de 12 meses con 0s donde no hay datos
  const result: { month: string; count: number }[] = [];
  const cursor = new Date(twelveMonthsAgo);
  for (let i = 0; i < 12; i++) {
    const key = cursor.toISOString().slice(0, 7);
    result.push({ month: key, count: map.get(key) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}

/**
 * Top N instituciones donde el autor recibe más citas. Sumamos citas
 * recibidas (internas + externas) sobre los trabajos del autor que
 * incluyen cada institución. Útil para el bloque "Áreas de autoridad"
 * del perfil (Sprint 3).
 */
export async function getInstitutionAuthority(
  userId: string,
  limit = 5,
): Promise<
  Array<{
    institucionId: number;
    institucionNombre: string;
    citas: number;
    trabajos: number;
  }>
> {
  type Row = {
    institucion_id: number;
    institucion_nombre: string;
    citas: bigint;
    trabajos: bigint;
  };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      ij.id AS institucion_id,
      ij.nombre AS institucion_nombre,
      SUM(i."citationsInternal" + i."citationsExternal") AS citas,
      COUNT(DISTINCT i.id) AS trabajos
    FROM "investigaciones" i
    INNER JOIN "investigacion_instituciones" ii ON ii."investigacionId" = i.id
    INNER JOIN "InstitucionJuridica" ij ON ij.id = ii."institucionId"
    WHERE i."userId" = ${userId}
      AND i.status = 'published'
    GROUP BY ij.id, ij.nombre
    ORDER BY citas DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    institucionId: r.institucion_id,
    institucionNombre: r.institucion_nombre,
    citas: Number(r.citas),
    trabajos: Number(r.trabajos),
  }));
}
