// ─── Investigaciones — constantes compartidas ─────────────────
//
// Source of truth para tipos de investigación, áreas del derecho y
// límites de validación. Las áreas se alinean con InstitucionJuridica.area
// pero amplían el set para abarcar ramas del derecho que no tienen
// instituciones seedeadas (penal, comercial, laboral, etc.).

export const TIPOS_INVESTIGACION = [
  "memoria_tesis",
  "articulo_doctrinal",
  "comentario_sentencia",
  "comentario_reforma",
  "ensayo_academico",
] as const;

export type TipoInvestigacion = (typeof TIPOS_INVESTIGACION)[number];

export const TIPOS_INVESTIGACION_LABELS: Record<TipoInvestigacion, string> = {
  memoria_tesis: "Memoria o Tesis",
  articulo_doctrinal: "Artículo Doctrinal",
  comentario_sentencia: "Comentario de Sentencia",
  comentario_reforma: "Comentario de Reforma",
  ensayo_academico: "Ensayo Académico",
};

// Para chips/labels cortas en cards y pills
export const TIPOS_INVESTIGACION_LABELS_CORTOS: Record<
  TipoInvestigacion,
  string
> = {
  memoria_tesis: "Memorias",
  articulo_doctrinal: "Artículos",
  comentario_sentencia: "Comentarios",
  comentario_reforma: "Reformas",
  ensayo_academico: "Ensayos",
};

// Áreas — alineadas con InstitucionJuridica.area + extensiones
export const AREAS_DERECHO = [
  "civil",          // → InstitucionJuridica.area === "CIVIL"
  "procesal_civil", // → "PROCESAL"
  "cot",            // → "ORGANICO"
  "transversal",    // → "TRANSVERSAL"
  "constitucional",
  "penal",
  "procesal_penal",
  "comercial",
  "laboral",
  "tributario",
  "internacional",
  "administrativo",
] as const;

export type AreaDerecho = (typeof AREAS_DERECHO)[number];

export const AREAS_DERECHO_LABELS: Record<AreaDerecho, string> = {
  civil: "Derecho Civil",
  procesal_civil: "Derecho Procesal Civil",
  cot: "Código Orgánico de Tribunales",
  transversal: "Transversal",
  constitucional: "Derecho Constitucional",
  penal: "Derecho Penal",
  procesal_penal: "Derecho Procesal Penal",
  comercial: "Derecho Comercial",
  laboral: "Derecho Laboral",
  tributario: "Derecho Tributario",
  internacional: "Derecho Internacional",
  administrativo: "Derecho Administrativo",
};

// Versión corta (para chips/cards)
export const AREAS_DERECHO_LABELS_CORTOS: Record<AreaDerecho, string> = {
  civil: "Civil",
  procesal_civil: "Procesal Civil",
  cot: "COT",
  transversal: "Transversal",
  constitucional: "Constitucional",
  penal: "Penal",
  procesal_penal: "Procesal Penal",
  comercial: "Comercial",
  laboral: "Laboral",
  tributario: "Tributario",
  internacional: "Internacional",
  administrativo: "Administrativo",
};

export const MIN_WORDS_BY_TYPE: Record<TipoInvestigacion, number> = {
  memoria_tesis: 3000,
  articulo_doctrinal: 1500,
  comentario_sentencia: 800,
  comentario_reforma: 800,
  ensayo_academico: 1000,
};

export const ABSTRACT_MIN_WORDS = 150;
export const ABSTRACT_MAX_WORDS = 250;
export const MIN_KEYWORDS = 3;
export const MAX_KEYWORDS = 7;

// Helpers tolerantes a valores fuera de tipo
export function getTipoLabel(tipo: string | null | undefined): string {
  if (!tipo) return "";
  return TIPOS_INVESTIGACION_LABELS[tipo as TipoInvestigacion] ?? tipo;
}
export function getTipoLabelCorto(tipo: string | null | undefined): string {
  if (!tipo) return "";
  return TIPOS_INVESTIGACION_LABELS_CORTOS[tipo as TipoInvestigacion] ?? tipo;
}
export function getAreaLabel(area: string | null | undefined): string {
  if (!area) return "";
  return AREAS_DERECHO_LABELS[area as AreaDerecho] ?? area;
}
export function getAreaLabelCorto(area: string | null | undefined): string {
  if (!area) return "";
  return AREAS_DERECHO_LABELS_CORTOS[area as AreaDerecho] ?? area;
}

// ─── Numeración romana — solo decorativa en encabezados/rankings ──

const ROMAN_PAIRS: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

/**
 * Convierte un número arábigo (1..3999) a romano. Para 0 o negativos
 * devuelve "—". Útil solo para etiquetas decorativas (cifras de
 * portada, rankings cortos, ediciones). DATOS CUANTITATIVOS REALES
 * (citas, lecturas, palabras, h-index) deben mostrarse SIEMPRE en
 * arábigos por legibilidad.
 */
export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 4000) return String(n);
  let num = Math.floor(n);
  let out = "";
  for (const [v, s] of ROMAN_PAIRS) {
    while (num >= v) {
      out += s;
      num -= v;
    }
  }
  return out;
}

// Romano en minúsculas (para ítems numerados de pliego: i, ii, iii)
export function toRomanLower(n: number): string {
  return toRoman(n).toLowerCase();
}
