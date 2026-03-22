// ═══════════════════════════════════════════════════════════════
// LIGA — La Vida del Derecho — 5 Niveles, 33 Grados
// Studio Iuris · Progresión híbrida XP + liga semanal
// ═══════════════════════════════════════════════════════════════

// ─── Backward compat: tier constants (deprecated) ────────────
// Se mantienen para queries legacy que aún referencian tier.

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

/** @deprecated Use grado system instead */
export function tierUp(tier: string): string | null {
  const idx = TIER_ORDER.indexOf(tier as TierName);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

/** @deprecated Use grado system instead */
export function tierDown(tier: string): string | null {
  const idx = TIER_ORDER.indexOf(tier as TierName);
  if (idx <= 0) return null;
  return TIER_ORDER[idx - 1];
}

// Mapeo de tiers viejos a grados nuevos (para migración)
export const TIER_TO_GRADO: Record<string, number> = {
  CARTON: 1,
  HIERRO: 3,
  BRONCE: 5,
  COBRE: 7,
  PLATA: 10,
  ORO: 14,
  DIAMANTE: 18,
  PLATINO: 25,
  JURISCONSULTO: 33,
};

// ═══════════════════════════════════════════════════════════════
// 5 NIVELES, 33 GRADOS
// ═══════════════════════════════════════════════════════════════

export type NivelLiga = "ESCUELA" | "PRACTICA" | "ESTRADO" | "MAGISTRATURA" | "CONSEJO";

export interface GradoLiga {
  grado: number;         // 1-33
  nombre: string;        // "Oyente", "Alumno Regular", etc.
  nivel: NivelLiga;      // A qué nivel pertenece
  emoji: string;         // Emoji representativo
  xpMinimo: number;      // XP acumulado mínimo para desbloquear este grado
  color: string;         // Color para la UI
}

export const GRADOS: GradoLiga[] = [
  // ═══ NIVEL I: LA ESCUELA (Grados 1-3) ═══
  { grado: 1,  nombre: "Oyente",                  nivel: "ESCUELA",       emoji: "👂",  xpMinimo: 0,       color: "#8a8073" },
  { grado: 2,  nombre: "Alumno Regular",           nivel: "ESCUELA",       emoji: "📖",  xpMinimo: 600,     color: "#8a8073" },
  { grado: 3,  nombre: "Egresado",                 nivel: "ESCUELA",       emoji: "🎓",  xpMinimo: 1500,    color: "#8a8073" },

  // ═══ NIVEL II: LA PRÁCTICA (Grados 4-14) ═══
  { grado: 4,  nombre: "Postulante",               nivel: "PRACTICA",      emoji: "📋",  xpMinimo: 3000,    color: "#9a7230" },
  { grado: 5,  nombre: "Practicante",              nivel: "PRACTICA",      emoji: "⚙",   xpMinimo: 5000,    color: "#9a7230" },
  { grado: 6,  nombre: "Procurador",               nivel: "PRACTICA",      emoji: "📜",  xpMinimo: 8000,    color: "#9a7230" },
  { grado: 7,  nombre: "Receptor",                 nivel: "PRACTICA",      emoji: "📨",  xpMinimo: 11500,   color: "#9a7230" },
  { grado: 8,  nombre: "Oficial de Sala",          nivel: "PRACTICA",      emoji: "🏛",  xpMinimo: 15500,   color: "#9a7230" },
  { grado: 9,  nombre: "Defensor Público",         nivel: "PRACTICA",      emoji: "🛡",  xpMinimo: 20000,   color: "#9a7230" },
  { grado: 10, nombre: "Abogado Habilitado",       nivel: "PRACTICA",      emoji: "⚖",   xpMinimo: 25000,   color: "#9a7230" },
  { grado: 11, nombre: "Abogado Patrocinante",     nivel: "PRACTICA",      emoji: "👔",  xpMinimo: 30500,   color: "#9a7230" },
  { grado: 12, nombre: "Relator",                  nivel: "PRACTICA",      emoji: "🗣",  xpMinimo: 36500,   color: "#9a7230" },
  { grado: 13, nombre: "Árbitro",                  nivel: "PRACTICA",      emoji: "⚔",   xpMinimo: 43000,   color: "#9a7230" },
  { grado: 14, nombre: "Maestro del Foro",         nivel: "PRACTICA",      emoji: "🏆",  xpMinimo: 50000,   color: "#9a7230" },

  // ═══ NIVEL III: EL ESTRADO (Grados 15-18) ═══
  { grado: 15, nombre: "Juez Suplente",            nivel: "ESTRADO",       emoji: "👨‍⚖️", xpMinimo: 58000,   color: "#1e4080" },
  { grado: 16, nombre: "Juez de Letras",           nivel: "ESTRADO",       emoji: "📝",  xpMinimo: 66500,   color: "#1e4080" },
  { grado: 17, nombre: "Juez de Garantía",         nivel: "ESTRADO",       emoji: "🔒",  xpMinimo: 75500,   color: "#1e4080" },
  { grado: 18, nombre: "Juez de Tribunal Oral",    nivel: "ESTRADO",       emoji: "🎤",  xpMinimo: 85000,   color: "#1e4080" },

  // ═══ NIVEL IV: LA MAGISTRATURA (Grados 19-30) ═══
  { grado: 19, nombre: "Secretario de Corte",      nivel: "MAGISTRATURA",  emoji: "📑",  xpMinimo: 95000,   color: "#6b1d2a" },
  { grado: 20, nombre: "Fiscal Adjunto",           nivel: "MAGISTRATURA",  emoji: "🔍",  xpMinimo: 105500,  color: "#6b1d2a" },
  { grado: 21, nombre: "Fiscal Regional",          nivel: "MAGISTRATURA",  emoji: "🏴",  xpMinimo: 116500,  color: "#6b1d2a" },
  { grado: 22, nombre: "Ministro Suplente",        nivel: "MAGISTRATURA",  emoji: "⭐",  xpMinimo: 118000,  color: "#6b1d2a" },
  { grado: 23, nombre: "Ministro de Corte",        nivel: "MAGISTRATURA",  emoji: "🌟",  xpMinimo: 121000,  color: "#6b1d2a" },
  { grado: 24, nombre: "Presidente de Sala",       nivel: "MAGISTRATURA",  emoji: "💫",  xpMinimo: 125000,  color: "#6b1d2a" },
  { grado: 25, nombre: "Presidente de Corte",      nivel: "MAGISTRATURA",  emoji: "👑",  xpMinimo: 130000,  color: "#6b1d2a" },
  { grado: 26, nombre: "Fiscal Nacional",          nivel: "MAGISTRATURA",  emoji: "🦅",  xpMinimo: 136000,  color: "#6b1d2a" },
  { grado: 27, nombre: "Ministro de Corte Suprema",nivel: "MAGISTRATURA",  emoji: "🏛",  xpMinimo: 142500,  color: "#6b1d2a" },
  { grado: 28, nombre: "Presidente de Sala CS",    nivel: "MAGISTRATURA",  emoji: "💎",  xpMinimo: 149500,  color: "#6b1d2a" },
  { grado: 29, nombre: "Fiscal Judicial",          nivel: "MAGISTRATURA",  emoji: "⚡",  xpMinimo: 152000,  color: "#6b1d2a" },
  { grado: 30, nombre: "Decano de la Corte Suprema",nivel: "MAGISTRATURA", emoji: "🌿",  xpMinimo: 155000,  color: "#6b1d2a" },

  // ═══ NIVEL V: EL CONSEJO (Grados 31-33) ═══
  { grado: 31, nombre: "Presidente de la Corte Suprema", nivel: "CONSEJO", emoji: "🏆",  xpMinimo: 158000,  color: "#12203a" },
  { grado: 32, nombre: "Contralor General",              nivel: "CONSEJO", emoji: "🗡",   xpMinimo: 160000,  color: "#12203a" },
  { grado: 33, nombre: "Jurisconsulto de la República",  nivel: "CONSEJO", emoji: "⚜",   xpMinimo: 165000,  color: "#12203a" },
];

// ─── Niveles con metadata ────────────────────────────────────

export const NIVELES: Record<NivelLiga, {
  label: string;
  emoji: string;
  grados: string;
  color: string;
  description: string;
}> = {
  ESCUELA:      { label: "La Escuela",      emoji: "📖", grados: "1-3",   color: "#8a8073", description: "Formación fundamental" },
  PRACTICA:     { label: "La Práctica",     emoji: "⚖",  grados: "4-14",  color: "#9a7230", description: "Perfeccionamiento y dominio" },
  ESTRADO:      { label: "El Estrado",      emoji: "🏛", grados: "15-18", color: "#1e4080", description: "Autoridad jurisdiccional" },
  MAGISTRATURA: { label: "La Magistratura", emoji: "👑", grados: "19-30", color: "#6b1d2a", description: "Justicia y liderazgo" },
  CONSEJO:      { label: "El Consejo",      emoji: "⚜",  grados: "31-33", color: "#12203a", description: "La autoridad suprema" },
};

// ═══ HELPERS ═════════════════════════════════════════════════

/** Dado el XP total, ¿cuál es el grado máximo alcanzable? */
export function getGradoMaximoPorXp(xp: number): GradoLiga {
  let maxGrado = GRADOS[0];
  for (const grado of GRADOS) {
    if (xp >= grado.xpMinimo) {
      maxGrado = grado;
    } else {
      break;
    }
  }
  return maxGrado;
}

/** Dado un número de grado, obtener su info */
export function getGradoInfo(grado: number): GradoLiga {
  return GRADOS.find(g => g.grado === grado) ?? GRADOS[0];
}

/** Dado un grado actual, ¿cuál es el siguiente? */
export function getSiguienteGrado(gradoActual: number): GradoLiga | null {
  return GRADOS.find(g => g.grado === gradoActual + 1) || null;
}

/** Dado un grado, ¿a qué nivel pertenece? */
export function getNivel(grado: number): NivelLiga {
  const g = GRADOS.find(g2 => g2.grado === grado);
  return g?.nivel || "ESCUELA";
}

/** XP necesario para el siguiente grado */
export function getXpParaSiguienteGrado(gradoActual: number): number | null {
  const siguiente = getSiguienteGrado(gradoActual);
  return siguiente ? siguiente.xpMinimo : null;
}

/** Porcentaje de progreso hacia el siguiente grado */
export function getProgresoGrado(xp: number, gradoActual: number): number {
  const gradoInfo = GRADOS.find(g => g.grado === gradoActual);
  const siguiente = getSiguienteGrado(gradoActual);
  if (!gradoInfo || !siguiente) return 100;
  const xpEnGrado = xp - gradoInfo.xpMinimo;
  const xpNecesario = siguiente.xpMinimo - gradoInfo.xpMinimo;
  if (xpNecesario <= 0) return 100;
  return Math.min(100, Math.round((xpEnGrado / xpNecesario) * 100));
}

// ─── Ascenso / Descenso ──────────────────────────────────────

export const PROMOTION_SPOTS = 3;   // Top 3 suben 1 grado
export const RELEGATION_SPOTS = 3;  // Bottom 3 bajan 1 grado
export const MAX_LEAGUE_SIZE = 30;   // Máx jugadores por liga

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
