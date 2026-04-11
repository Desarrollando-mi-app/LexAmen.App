// ─── Obiter Dictum — utilidades (server-only) ─────────────────
import { prisma } from "@/lib/prisma";

// ─── Constantes ─────────────────────────────────────────────

export const OBITER_MAX_CHARS = 128;
export const OBITER_MAX_WORDS = 30;
export const OBITER_DAILY_LIMIT_FREE = 5;
export const OBITER_MAX_THREAD_PARTS = 10;

export const OBITER_MATERIAS = [
  "acto_juridico",
  "obligaciones",
  "contratos",
  "responsabilidad_civil",
  "derechos_reales",
  "sucesiones",
  "familia",
  "procesal",
  "procesal_civil",
  "constitucional",
  "penal",
  "laboral",
  "comercial",
  "administrativo",
  "tributario",
  "internacional",
  "otro",
] as const;

export const OBITER_TIPOS = [
  "reflexion",
  "pregunta",
  "cita_doctrinal",
  "opinion",
  "dato",
] as const;

// ─── getDailyObiterCount ────────────────────────────────────

/**
 * Cuenta los obiters publicados por el usuario HOY (zona horaria Chile).
 * Solo cuenta obiters raíz (threadOrder IS NULL o threadOrder = 1).
 * Las partes de hilo (2+) no cuentan contra el límite diario.
 */
export async function getDailyObiterCount(userId: string): Promise<number> {
  // Calcular inicio del día en America/Santiago
  const now = new Date();

  // Obtener offset dinámico Chile (maneja verano/invierno)
  const tempDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Santiago" })
  );
  const offset = now.getTime() - tempDate.getTime();

  // Obtener la fecha actual en zona Santiago
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  // Medianoche en Santiago → convertido a UTC
  const todayStart = new Date(
    new Date(`${year}-${month}-${day}T00:00:00`).getTime() + offset
  );

  return prisma.obiterDictum.count({
    where: {
      userId,
      createdAt: { gte: todayStart },
      OR: [{ threadOrder: null }, { threadOrder: 1 }],
    },
  });
}

// ─── canPublishObiter ───────────────────────────────────────

/**
 * Verifica si el usuario puede publicar un nuevo obiter.
 * Premium: sin límite. Free: máx 5 obiters/día.
 */
export async function canPublishObiter(
  userId: string
): Promise<{ allowed: boolean; remaining: number; isPremium: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (!user) {
    return { allowed: false, remaining: 0, isPremium: false };
  }

  const isPremium = user.plan !== "FREE";

  if (isPremium) {
    return { allowed: true, remaining: Infinity, isPremium: true };
  }

  const count = await getDailyObiterCount(userId);
  const remaining = Math.max(0, OBITER_DAILY_LIMIT_FREE - count);

  return {
    allowed: count < OBITER_DAILY_LIMIT_FREE,
    remaining,
    isPremium: false,
  };
}

// ─── getColegaIdsForUser ────────────────────────────────────

/**
 * Obtiene los IDs de colegas aceptados de un usuario.
 * Reutilizable por feed y acciones sociales.
 */
export async function getColegaIdsForUser(
  userId: string
): Promise<string[]> {
  const requests = await prisma.colegaRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: { senderId: true, receiverId: true },
  });

  const ids: string[] = [];
  for (const r of requests) {
    if (r.senderId !== userId) ids.push(r.senderId);
    if (r.receiverId !== userId) ids.push(r.receiverId);
  }
  return ids;
}
