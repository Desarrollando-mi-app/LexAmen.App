// ─── Helpers compartidos para la vista V4 de Pasantías ──
//
// La vista V4 de Pasantías usa el mismo lenguaje editorial que Ayudantías:
// masthead tipográfico, tiles con cover degradé por área, filete dorado,
// diferenciación cromática entre OFREZCO (estudio ofrece) y BUSCO
// (estudiante busca). Este archivo concentra los helpers y tipos
// reutilizables entre server components y componentes cliente.

import { getAreaLabel, getFormatoLabel, getRemuneracionLabel } from "./sala-constants";

export type PasantiaType = "ofrezco" | "busco";

export type PostulacionEstado =
  | "ENVIADA"
  | "REVISADA"
  | "ACEPTADA"
  | "RECHAZADA"
  | "COMPLETADA";

export type PostulacionTipo = "INTERNA" | "EXTERNA";

export const PASANTIA_JORNADAS = [
  { value: "completa", label: "Jornada completa" },
  { value: "media", label: "Media jornada" },
  { value: "parcial", label: "Parcial" },
  { value: "flexible", label: "Flexible" },
] as const;

export const ESTUDIO_TAMANOS = [
  { value: "1-5", label: "1–5 personas" },
  { value: "6-20", label: "6–20 personas" },
  { value: "21-50", label: "21–50 personas" },
  { value: "51-200", label: "51–200 personas" },
  { value: "200+", label: "200+ personas" },
] as const;

export const ESTUDIO_ROLES = [
  { value: "socio", label: "Socio/a" },
  { value: "asociado", label: "Asociado/a" },
  { value: "pasante", label: "Pasante" },
  { value: "admin_plataforma", label: "Admin (plataforma)" },
] as const;

/** Gradients por área — misma paleta desaturada editorial de ayudantías. */
export const AREA_GRADIENTS: Record<string, string> = {
  civil: "linear-gradient(135deg, #c49a50, #b88840 55%, #8a6428)",
  procesal_civil: "linear-gradient(135deg, #6a5a4a, #4d4032 55%, #2a221a)",
  penal: "linear-gradient(135deg, #c2485a, #9a3040 55%, #6b1d2a)",
  procesal_penal: "linear-gradient(135deg, #8a3b4a, #6a2835 55%, #3d1620)",
  laboral: "linear-gradient(135deg, #5a7a55, #3f5a3a 55%, #223a22)",
  tributario: "linear-gradient(135deg, #8c7550, #6a5636 55%, #3a2e1e)",
  constitucional: "linear-gradient(135deg, #4a6a95, #324e75 55%, #12203a)",
  administrativo: "linear-gradient(135deg, #6a6a55, #4e4e3c 55%, #2a2a22)",
  comercial: "linear-gradient(135deg, #7a5a3a, #5e432c 55%, #3a2a1c)",
  familia: "linear-gradient(135deg, #b07c6e, #8a5e52 55%, #5a3a32)",
  ambiental: "linear-gradient(135deg, #617d5c, #445e40 55%, #253f22)",
  inmobiliario: "linear-gradient(135deg, #8a7558, #6a583e 55%, #3a2e1e)",
  propiedad_intelectual: "linear-gradient(135deg, #7a5f8a, #5a4268 55%, #322244)",
  internacional: "linear-gradient(135deg, #4a7080, #2e5868 55%, #1a3544)",
  otro: "linear-gradient(135deg, #5f5245, #463b30 55%, #28211a)",
};

export function areaGradient(area: string | null | undefined): string {
  if (!area) return AREA_GRADIENTS.otro;
  return AREA_GRADIENTS[area] ?? AREA_GRADIENTS.otro;
}

/** Re-export para ergonomía en componentes de pasantías. */
export function areaLabel(value: string): string {
  return getAreaLabel(value);
}

export function formatoLabel(value: string): string {
  return getFormatoLabel(value);
}

export function remuneracionLabel(
  remuneracion: string,
  monto: string | null | undefined,
): string {
  if (remuneracion === "pagada") {
    if (monto && monto.trim()) return monto.trim();
    return "Remunerada";
  }
  if (remuneracion === "no_pagada") return "No remunerada";
  return getRemuneracionLabel(remuneracion);
}

export function jornadaLabel(value: string | null | undefined): string {
  if (!value) return "A convenir";
  return PASANTIA_JORNADAS.find((j) => j.value === value)?.label ?? value;
}

export function tamanoLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return ESTUDIO_TAMANOS.find((t) => t.value === value)?.label ?? value;
}

export function rolLabel(value: string): string {
  return ESTUDIO_ROLES.find((r) => r.value === value)?.label ?? value;
}

/** Estados de postulación con etiqueta humana y color semántico. */
export const ESTADO_POSTULACION = {
  ENVIADA: { label: "Enviada", tone: "neutral" as const },
  REVISADA: { label: "Revisada", tone: "info" as const },
  ACEPTADA: { label: "Aceptada", tone: "success" as const },
  RECHAZADA: { label: "Rechazada", tone: "danger" as const },
  COMPLETADA: { label: "Completada", tone: "accent" as const },
} as const;

export function estadoPostulacionLabel(estado: string): string {
  return ESTADO_POSTULACION[estado as PostulacionEstado]?.label ?? estado;
}

/** Slugify ASCII para páginas de estudios (ej: "Carey & Cía." → "carey-cia"). */
export function slugifyEstudio(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "Carey" → "C", "Carey & Cía." → "C" (sólo primera letra alfabética). */
export function estudioInitial(nombre: string | null | undefined): string {
  if (!nombre) return "—";
  const match = nombre.trim().match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/);
  return (match?.[0] ?? "—").toUpperCase();
}

/** Fecha compacta "22 abr" sin año; usa año sólo si difiere del actual. */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const now = new Date();
  const core = `${d.getDate()} ${months[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear()
    ? core
    : `${core} ${d.getFullYear()}`;
}

/** Días restantes vs deadline — negativo significa vencido. */
export function daysUntil(deadline: Date | string | null | undefined): number | null {
  if (!deadline) return null;
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Etiqueta humana para deadline: "Cierra en 5 días" | "Cerrada" | "Hoy". */
export function deadlineLabel(
  deadline: Date | string | null | undefined,
): string | null {
  const d = daysUntil(deadline);
  if (d === null) return null;
  if (d < 0) return "Postulación cerrada";
  if (d === 0) return "Cierra hoy";
  if (d === 1) return "Cierra mañana";
  if (d <= 7) return `Cierra en ${d} días`;
  return `Cierra ${formatDateShort(deadline as Date | string)}`;
}

/** ¿Deadline vencido? */
export function isDeadlinePassed(
  deadline: Date | string | null | undefined,
): boolean {
  const d = daysUntil(deadline);
  return d !== null && d < 0;
}

/**
 * Regla de negocio: una postulación puede recibir reseña sólo cuando está
 * COMPLETADA. Se aplica en servidor Y cliente para mantener consistencia.
 */
export function puedeResenar(estado: string): boolean {
  return estado === "COMPLETADA";
}

/**
 * Identidad de autoría en reseñas: si `isAnonymous`, usamos el
 * `authorDisplay` tal cual (ej: "Egresada · UDP · 2025"); si no, nombre real.
 */
export function reviewAuthorLabel(review: {
  isAnonymous: boolean;
  authorDisplay: string;
  author?: { firstName: string; lastName: string } | null;
}): string {
  if (review.isAnonymous) return review.authorDisplay;
  if (review.author) {
    return `${review.author.firstName} ${review.author.lastName}`.trim();
  }
  return review.authorDisplay;
}
