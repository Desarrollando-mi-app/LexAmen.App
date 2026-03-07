// ─── Ligas Semanales — constantes y helpers ─────────────────

export const TIER_ORDER = [
  "CARTON",
  "HIERRO",
  "BRONCE",
  "COBRE",
  "PLATA",
  "ORO",
  "DIAMANTE",
  "PLATINO",
  "JURISCONSULTO",
] as const;

export type TierName = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<string, string> = {
  CARTON: "Cartón",
  HIERRO: "Hierro",
  BRONCE: "Bronce",
  COBRE: "Cobre",
  PLATA: "Plata",
  ORO: "Oro",
  DIAMANTE: "Diamante",
  PLATINO: "Platino",
  JURISCONSULTO: "Jurisconsulto",
};

export const TIER_EMOJIS: Record<string, string> = {
  CARTON: "📦",
  HIERRO: "🔩",
  BRONCE: "🥉",
  COBRE: "🟤",
  PLATA: "🥈",
  ORO: "🥇",
  DIAMANTE: "💎",
  PLATINO: "⚜️",
  JURISCONSULTO: "⚖️",
};

// ─── Ascenso / Descenso ─────────────────────────────────────

export const PROMOTION_SPOTS = 3;
export const RELEGATION_SPOTS = 3;

// ─── Helpers de tier ────────────────────────────────────────

export function tierUp(tier: string): string | null {
  const idx = TIER_ORDER.indexOf(tier as TierName);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

export function tierDown(tier: string): string | null {
  const idx = TIER_ORDER.indexOf(tier as TierName);
  if (idx <= 0) return null;
  return TIER_ORDER[idx - 1];
}

// ─── Helpers de semana ──────────────────────────────────────
// Semana: Lunes 00:00:00.000 → Domingo 23:59:59.999 (UTC)

export function getCurrentWeekBounds(): {
  weekStart: Date;
  weekEnd: Date;
} {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Domingo, 1=Lunes...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diffToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

export function getPreviousWeekBounds(): {
  weekStart: Date;
  weekEnd: Date;
} {
  const { weekStart: currentStart } = getCurrentWeekBounds();

  const weekEnd = new Date(currentStart);
  weekEnd.setUTCMilliseconds(-1); // Domingo 23:59:59.999 anterior

  const weekStart = new Date(weekEnd);
  weekStart.setUTCDate(weekEnd.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);

  return { weekStart, weekEnd };
}

export function getDaysRemaining(): number {
  const { weekEnd } = getCurrentWeekBounds();
  const now = new Date();
  const diffMs = weekEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
