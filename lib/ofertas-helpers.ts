// ─── Helpers compartidos para la vista V4 de Ofertas laborales ──
//
// Misma estética editorial que Pasantías V4: masthead tipográfico, tiles
// con cover degradé por área, filete dorado, paleta cream/ink/gold.
// A diferencia de Pasantías, las ofertas son siempre de tipo OFREZCO
// (un empleador busca un profesional), así que no hay branching busco/ofrezco.

import {
  getAreaLabel,
  getFormatoLabel,
  getContratoLabel,
  getRemuneracionLabel,
} from "./sala-constants";
import { AREA_GRADIENTS } from "./pasantias-helpers";

/** Reuso el mismo set de gradientes para mantener un sistema visual unificado. */
export { AREA_GRADIENTS };

export function areaGradient(area: string | null | undefined): string {
  if (!area) return AREA_GRADIENTS.otro;
  return AREA_GRADIENTS[area] ?? AREA_GRADIENTS.otro;
}

export function areaLabel(value: string): string {
  return getAreaLabel(value);
}

export function formatoLabel(value: string): string {
  return getFormatoLabel(value);
}

export function contratoLabel(value: string): string {
  return getContratoLabel(value);
}

/** Si la remuneración tiene monto crudo lo mostramos tal cual; si no, label. */
export function remuneracionLabel(
  remuneracion: string | null | undefined,
): string {
  if (!remuneracion) return "A convenir";
  // Si ya viene como string libre con números o $/CLP, lo dejamos pasar.
  if (/[\d$]/.test(remuneracion)) return remuneracion.trim();
  return getRemuneracionLabel(remuneracion);
}

export const EXPERIENCIA_LABELS: Record<string, string> = {
  sin_experiencia: "Sin experiencia",
  "1_2_anios": "1–2 años",
  "3_5_anios": "3–5 años",
  "5_plus": "5+ años",
};

export function experienciaLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return EXPERIENCIA_LABELS[value] ?? value;
}

/** Inicial editorial para el cover cuando no hay logo. "Estudio Pérez" → "E". */
export function empresaInitial(nombre: string | null | undefined): string {
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

/** "Hace 3 días", "Hoy", "Ayer". */
export function postedAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
  return formatDateShort(d);
}

/**
 * Tipo serializado que circula entre server → client. Reflejo el subset
 * realmente usado en tiles + listing; el detalle puede cargar más datos
 * de OfertaTrabajo directamente.
 */
export interface OfertaTileData {
  id: string;
  userId: string;
  empresa: string;
  cargo: string;
  areaPractica: string;
  ciudad: string;
  formato: string;
  tipoContrato: string;
  experienciaReq: string | null;
  remuneracion: string | null;
  createdAt: string;
}
