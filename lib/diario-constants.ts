// ─── El Diario — constantes ────────────────────────────

export const MATERIAS_DIARIO = [
  "Derecho Civil",
  "Derecho Procesal Civil",
  "Derecho Penal",
  "Derecho Procesal Penal",
  "Derecho Constitucional",
  "Derecho Administrativo",
  "Derecho Comercial",
  "Derecho del Trabajo",
  "Derecho Internacional",
  "Derecho Tributario",
  "Otro",
] as const;

export const FORMATO_LABELS: Record<string, string> = {
  OBITER_DICTUM: "Obiter Dictum",
  ANALISIS_FALLOS: "Análisis de Fallos",
};

export const VISIBILIDAD_LABELS: Record<string, string> = {
  PUBLICO: "Público",
  COLEGAS: "Solo Colegas",
};

export const OBITER_MAX_WORDS = 30;
