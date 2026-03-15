// ─── El Diario — utilidades para publicaciones largas (server-only) ──
import { prisma } from "@/lib/prisma";

// ─── Constantes ─────────────────────────────────────────────

export const LONG_PUBLICATION_DAILY_LIMIT_FREE = 1;
export const LONG_PUBLICATION_XP = 15;

export const TRIBUNALES = [
  "Corte Suprema",
  "Corte de Apelaciones de Santiago",
  "Corte de Apelaciones de Valparaíso",
  "Corte de Apelaciones de Concepción",
  "Corte de Apelaciones de Temuco",
  "Corte de Apelaciones de Antofagasta",
  "Corte de Apelaciones de La Serena",
  "Corte de Apelaciones de Rancagua",
  "Corte de Apelaciones de Talca",
  "Corte de Apelaciones de Chillán",
  "Corte de Apelaciones de Valdivia",
  "Corte de Apelaciones de Puerto Montt",
  "Corte de Apelaciones de Copiapó",
  "Corte de Apelaciones de Arica",
  "Corte de Apelaciones de Iquique",
  "Corte de Apelaciones de Punta Arenas",
  "Corte de Apelaciones de Coyhaique",
  "Corte de Apelaciones de San Miguel",
  "Tribunal Constitucional",
  "Juzgado Civil",
  "Juzgado de Letras",
  "Otro",
] as const;

export const TIPOS_ENSAYO = [
  { value: "opinion", label: "Opinión" },
  { value: "nota_doctrinaria", label: "Nota doctrinaria" },
  { value: "comentario_reforma", label: "Comentario de reforma" },
  { value: "analisis_comparado", label: "Análisis comparado" },
  { value: "tesis", label: "Tesis / Memoria" },
  { value: "otro", label: "Otro" },
] as const;

export const ANALISIS_HECHOS_MAX_CHARS = 2000;
export const ANALISIS_RATIO_MAX_CHARS = 3500;
export const ANALISIS_RESUMEN_MAX_CHARS = 1000;
export const ENSAYO_RESUMEN_MAX_CHARS = 1000;
export const ENSAYO_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const VALID_ENSAYO_TIPOS: string[] = TIPOS_ENSAYO.map((t) => t.value);

// ─── getDailyLongPublicationCount ────────────────────────────

/**
 * Cuenta las publicaciones largas (Análisis + Ensayo) creadas hoy
 * por el usuario (zona horaria Chile).
 */
export async function getDailyLongPublicationCount(
  userId: string
): Promise<number> {
  // Calcular inicio del día en America/Santiago
  const now = new Date();

  const tempDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Santiago" })
  );
  const offset = now.getTime() - tempDate.getTime();

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

  const todayStart = new Date(
    new Date(`${year}-${month}-${day}T00:00:00`).getTime() + offset
  );

  const [analisisCount, ensayoCount] = await Promise.all([
    prisma.analisisSentencia.count({
      where: {
        userId,
        isActive: true,
        createdAt: { gte: todayStart },
      },
    }),
    prisma.ensayo.count({
      where: {
        userId,
        isActive: true,
        createdAt: { gte: todayStart },
      },
    }),
  ]);

  return analisisCount + ensayoCount;
}

// ─── canPublishLongContent ──────────────────────────────────

/**
 * Verifica si el usuario puede publicar contenido largo (Análisis o Ensayo).
 * Premium: sin límite. Free: 1 por día (Análisis + Ensayo combinados).
 */
export async function canPublishLongContent(
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

  const count = await getDailyLongPublicationCount(userId);
  const remaining = Math.max(0, LONG_PUBLICATION_DAILY_LIMIT_FREE - count);

  return {
    allowed: count < LONG_PUBLICATION_DAILY_LIMIT_FREE,
    remaining,
    isPremium: false,
  };
}

// ─── calculateReadingTime ───────────────────────────────────

/**
 * Calcula el tiempo de lectura estimado en minutos.
 * ~200 palabras por minuto.
 */
export function calculateReadingTime(...texts: string[]): number {
  const totalWords = texts
    .filter(Boolean)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(totalWords / 200));
}
