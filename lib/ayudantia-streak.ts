// ─── Lógica de racha de ayudantías (server-only) ──────────
import { prisma } from "@/lib/prisma";

/**
 * Calcula el mes anterior en formato "YYYY-MM".
 */
function getPreviousMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const date = new Date(y, m - 2, 1); // m-1 es el mes actual (0-indexed), m-2 es el anterior
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Obtiene el mes actual en formato "YYYY-MM".
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Actualiza la racha de ayudantía de un tutor.
 * Se llama cada vez que publica o reactiva una ayudantía de tipo OFREZCO.
 *
 * Lógica:
 * - Si no existe: crea con monthsActive=1
 * - Si lastActiveMonth es el mes actual: no hace nada (ya contado)
 * - Si lastActiveMonth es el mes anterior: incrementa monthsActive
 * - Si hay gap mayor a 1 mes: resetea monthsActive=1
 *
 * Retorna el streak actualizado.
 */
export async function updateAyudantiaStreak(userId: string) {
  const currentMonth = getCurrentMonth();

  const existing = await prisma.ayudantiaStreak.findUnique({
    where: { userId },
  });

  if (!existing) {
    // Primera vez — crear streak
    return prisma.ayudantiaStreak.create({
      data: {
        userId,
        monthsActive: 1,
        lastActiveMonth: currentMonth,
        longestStreak: 1,
      },
    });
  }

  // Ya activo este mes — no hacer nada
  if (existing.lastActiveMonth === currentMonth) {
    return existing;
  }

  const previousMonth = getPreviousMonth(currentMonth);

  if (existing.lastActiveMonth === previousMonth) {
    // Mes consecutivo — incrementar racha
    const newMonthsActive = existing.monthsActive + 1;
    const newLongestStreak = Math.max(existing.longestStreak, newMonthsActive);

    return prisma.ayudantiaStreak.update({
      where: { userId },
      data: {
        monthsActive: newMonthsActive,
        lastActiveMonth: currentMonth,
        longestStreak: newLongestStreak,
      },
    });
  }

  // Gap mayor a 1 mes — resetear
  return prisma.ayudantiaStreak.update({
    where: { userId },
    data: {
      monthsActive: 1,
      lastActiveMonth: currentMonth,
      longestStreak: Math.max(existing.longestStreak, 1),
    },
  });
}
