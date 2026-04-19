// ═══════════════════════════════════════════════════════════════
// LA TOGA — Escalafón Semanal · 11 Tiers por Percentil
// Studio Iuris · Sistema paralelo a La Vida del Derecho (grados)
// ═══════════════════════════════════════════════════════════════
//
// La Toga se calcula semanalmente según el XP ganado en los últimos
// 7 días. Cada usuario cae en un tier del 1 (Auditor) al 11
// (Legislador) según su percentil global entre usuarios activos.
//
// NO confundir con GRADOS (lib/league.ts) — aquellos se basan en
// XP acumulado total y no cambian con este sistema.

export interface TogaTier {
  id: number;                // 1-11
  nombre: string;            // "Auditor", "Amanuense", etc.
  descripcion: string;
  emoji: string;
  color: string;             // clase tailwind para texto/acento
  bgColor: string;           // clase tailwind para fondo
  borderColor: string;       // clase tailwind para borde
  badge: string | null;      // emoji de insignia (pergamino, pluma, toga, laureles, corona)
  minPercentile: number;     // percentil mínimo global (0-100, 0 = menor)
  topLabel: string;          // "Top 1%", "Top 3%", "Inicio", etc.
}

export const LEAGUE_TIERS: TogaTier[] = [
  {
    id: 1,
    nombre: "Auditor",
    descripcion: "Quien escucha y aprende",
    emoji: "👂",
    color: "gz-ink-light",
    bgColor: "gz-ink-light/10",
    borderColor: "gz-ink-light/30",
    badge: null,
    minPercentile: 0,
    topLabel: "Inicio",
  },
  {
    id: 2,
    nombre: "Amanuense",
    descripcion: "Quien copia y transcribe las leyes",
    emoji: "✍️",
    color: "gz-gold/60",
    bgColor: "gz-gold/5",
    borderColor: "gz-gold/20",
    badge: "📜",
    minPercentile: 20,
    topLabel: "Top 80%",
  },
  {
    id: 3,
    nombre: "Leguleyo",
    descripcion: "Conoce la letra pero no el espíritu",
    emoji: "📖",
    color: "gz-gold/80",
    bgColor: "gz-gold/8",
    borderColor: "gz-gold/30",
    badge: "📜",
    minPercentile: 40,
    topLabel: "Top 60%",
  },
  {
    id: 4,
    nombre: "Letrado",
    descripcion: "Versado en las letras del derecho",
    emoji: "🪶",
    color: "gz-gold",
    bgColor: "gz-gold/10",
    borderColor: "gz-gold/40",
    badge: "🪶",
    minPercentile: 55,
    topLabel: "Top 45%",
  },
  {
    id: 5,
    nombre: "Jurista",
    descripcion: "Domina la ciencia jurídica",
    emoji: "⚖️",
    color: "gz-gold",
    bgColor: "gz-gold/12",
    borderColor: "gz-gold/50",
    badge: "🪶",
    minPercentile: 65,
    topLabel: "Top 35%",
  },
  {
    id: 6,
    nombre: "Prudente",
    descripcion: "Iuris prudentia — sabiduría práctica del derecho",
    emoji: "🦉",
    color: "gz-navy",
    bgColor: "gz-navy/8",
    borderColor: "gz-navy/30",
    badge: "👘",
    minPercentile: 75,
    topLabel: "Top 25%",
  },
  {
    id: 7,
    nombre: "Pretor",
    descripcion: "Quien administra justicia — magistratura romana",
    emoji: "🏛️",
    color: "gz-navy",
    bgColor: "gz-navy/10",
    borderColor: "gz-navy/40",
    badge: "👘",
    minPercentile: 82,
    topLabel: "Top 18%",
  },
  {
    id: 8,
    nombre: "Tribuno",
    descripcion: "Defensor del pueblo — voz de la justicia",
    emoji: "🗣️",
    color: "gz-burgundy",
    bgColor: "gz-burgundy/8",
    borderColor: "gz-burgundy/30",
    badge: "🏅",
    minPercentile: 88,
    topLabel: "Top 12%",
  },
  {
    id: 9,
    nombre: "Cónsul",
    descripcion: "Máxima magistratura de la República romana",
    emoji: "🦅",
    color: "gz-burgundy",
    bgColor: "gz-burgundy/10",
    borderColor: "gz-burgundy/40",
    badge: "🏅",
    minPercentile: 93,
    topLabel: "Top 7%",
  },
  {
    id: 10,
    nombre: "Pontífice",
    descripcion: "Guardián del derecho sagrado — custos iuris",
    emoji: "🔱",
    color: "gz-ink",
    bgColor: "gz-ink/5",
    borderColor: "gz-gold",
    badge: "👑",
    minPercentile: 97,
    topLabel: "Top 3%",
  },
  {
    id: 11,
    nombre: "Legislador",
    descripcion: "Quien crea la ley — Bello, Justiniano, Napoleón",
    emoji: "📜",
    color: "gz-ink",
    bgColor: "gz-ink/8",
    borderColor: "gz-gold",
    badge: "⭐",
    minPercentile: 99,
    topLabel: "Top 1%",
  },
];

// ─── Helpers ─────────────────────────────────────────────────

/** Dado un percentil (0-100, donde 100 = mejor), devuelve el tier. */
export function getTogaTierByPercentile(percentile: number): TogaTier {
  let result = LEAGUE_TIERS[0];
  for (const t of LEAGUE_TIERS) {
    if (percentile >= t.minPercentile) result = t;
    else break;
  }
  return result;
}

/** Tier siguiente (para mostrar "faltan X XP para ascender"). */
export function getNextTogaTier(currentId: number): TogaTier | null {
  return LEAGUE_TIERS.find((t) => t.id === currentId + 1) ?? null;
}

/** Info de un tier por ID. */
export function getTogaTierById(id: number): TogaTier {
  return LEAGUE_TIERS.find((t) => t.id === id) ?? LEAGUE_TIERS[0];
}

// ─── Cálculo de percentil desde lista de XP semanales ───────

/**
 * Dado el XP del usuario y la lista completa de XP semanales (todos
 * los usuarios activos esta semana), calcula su percentil global.
 *
 * percentil = (nº de usuarios con xp menor o igual / total) * 100
 *
 * Valores extremos:
 *  - Si no hay suficientes usuarios activos (<5), devuelve 0 (tier 1).
 *  - Si el usuario no está en la lista, devuelve 0.
 */
export function computePercentile(userWeeklyXp: number, allWeeklyXp: number[]): number {
  if (allWeeklyXp.length < 5) return 0;
  const total = allWeeklyXp.length;
  // Nº de usuarios con xp estrictamente menor
  const below = allWeeklyXp.filter((xp) => xp < userWeeklyXp).length;
  return Math.round((below / total) * 100);
}

/**
 * Calcula el XP necesario para llegar al siguiente tier, dado el
 * percentil actual del usuario y la lista completa de XP.
 *
 * Devuelve null si ya está en el tier máximo o no hay datos.
 */
export function getXpToNextTier(
  userWeeklyXp: number,
  allWeeklyXp: number[],
  currentTierId: number
): number | null {
  const next = getNextTogaTier(currentTierId);
  if (!next || allWeeklyXp.length < 5) return null;

  const sorted = [...allWeeklyXp].sort((a, b) => a - b);
  // Índice del umbral para el siguiente tier
  const thresholdIdx = Math.ceil((next.minPercentile / 100) * sorted.length);
  const targetXp = sorted[Math.min(thresholdIdx, sorted.length - 1)] ?? 0;
  const diff = targetXp - userWeeklyXp;
  return diff > 0 ? diff : 0;
}
