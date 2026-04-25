// ─── Helpers V4 para el tab "Academia" ────────────────────
//
// Comparte el lenguaje editorial con La Sala (Ayudantías, Pasantías,
// Ofertas, Networking): tipografías Cormorant + Archivo + IBM Plex Mono,
// paleta cream/ink/gold/burgundy, gradientes desaturados por área de
// práctica. Acá viven los tipos de dominio (Debates, Expediente, Eventos,
// Ranking, Peer Review) y los helpers de presentación que reutilizan los
// 5 sub-módulos de Academia.

import { getAreaLabel as _getAreaLabel } from "./sala-constants";
import { AREA_GRADIENTS } from "./pasantias-helpers";

// ─── Re-exports utilitarios ────────────────────────────────
export const ramaGradient = (rama: string | null | undefined): string => {
  if (!rama) return AREA_GRADIENTS.otro;
  return AREA_GRADIENTS[rama] ?? AREA_GRADIENTS.otro;
};

export function ramaLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return _getAreaLabel(value);
}

// ─── Debates ──────────────────────────────────────────────
export type DebateEstado =
  | "buscando_oponente"
  | "argumentos"
  | "replicas"
  | "votacion"
  | "cerrado";

export const DEBATE_ESTADO_LABELS: Record<DebateEstado, string> = {
  buscando_oponente: "Buscando oponente",
  argumentos: "Argumentando",
  replicas: "Réplicas",
  votacion: "Votación",
  cerrado: "Cerrado",
};

export function debateEstadoLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (DEBATE_ESTADO_LABELS as Record<string, string>)[value] ?? value;
}

/** Token Tailwind para el badge de estado en el cover del tile.
 *  Cream/ink para estados pasivos, gold para activos, burgundy para
 *  votación (urgencia editorial). */
export function debateEstadoBadgeClass(value: string | null | undefined): string {
  switch (value) {
    case "buscando_oponente":
      return "bg-gz-cream/95 text-gz-ink-mid border border-gz-rule";
    case "argumentos":
    case "replicas":
      return "bg-gz-gold text-gz-ink";
    case "votacion":
      return "bg-gz-burgundy text-gz-cream";
    case "cerrado":
    default:
      return "bg-gz-ink/90 text-gz-cream";
  }
}

// ─── Expediente ───────────────────────────────────────────
export type ExpedienteEstado = "abierto" | "cerrado";

export function expedienteEstadoLabel(value: string | null | undefined): string {
  if (value === "abierto") return "Abierto";
  if (value === "cerrado") return "Cerrado";
  return value ?? "—";
}

/** Cover en "media-luna" para diferenciar Expediente de Debates: cada
 *  bando recibe medio gradient distinto (demandante / demandado). */
export function expedienteSplitGradient(rama: string | null | undefined): {
  demandante: string;
  demandado: string;
} {
  // Heredamos el gradient base de la rama y derivamos un complemento navy/burgundy
  // para mantener la paleta editorial pero distinguir bandos.
  return {
    demandante: ramaGradient(rama),
    demandado: "linear-gradient(135deg, #6b3a48, #4d2733 55%, #2a141c)",
  };
}

// ─── Eventos académicos ───────────────────────────────────
export type EventoFormato = "presencial" | "online" | "hibrido";
export type EventoCosto = "gratis" | "pagado";

export const FORMATO_EVENTO_LABELS: Record<EventoFormato, string> = {
  presencial: "Presencial",
  online: "Online",
  hibrido: "Híbrido",
};

export function eventoFormatoLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (FORMATO_EVENTO_LABELS as Record<string, string>)[value] ?? value;
}

/** Gradiente del cover según formato — sage/navy/gold para distinguir
 *  visualmente el modo de asistencia sin depender solo del texto. */
export function eventoFormatoGradient(value: string | null | undefined): string {
  switch (value) {
    case "presencial":
      return "linear-gradient(135deg, #5a7a55 0%, #3f5a3a 55%, #223a22 100%)";
    case "online":
      return "linear-gradient(135deg, #4a6a95 0%, #324e75 55%, #12203a 100%)";
    case "hibrido":
      return "linear-gradient(135deg, #c49a50 0%, #b88840 55%, #8a6428 100%)";
    default:
      return AREA_GRADIENTS.otro;
  }
}

// ─── Ranking de autores ───────────────────────────────────
export type RankingPeriodo = "semana" | "mes" | "todo";

export const RANKING_PERIODO_LABELS: Record<RankingPeriodo, string> = {
  semana: "Esta semana",
  mes: "Este mes",
  todo: "Todo el tiempo",
};

export function rankingPeriodoLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (RANKING_PERIODO_LABELS as Record<string, string>)[value] ?? value;
}

// ─── Comunes ──────────────────────────────────────────────

/** Iniciales del nombre — "Juana Pinto" → "JP". Usado en monogramas de
 *  cover cuando no hay avatar. */
export function userInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const a = (firstName ?? "").trim().charAt(0);
  const b = (lastName ?? "").trim().charAt(0);
  const result = `${a}${b}`.toUpperCase();
  return result.length > 0 ? result : "—";
}

/** Formato editorial corto para fechas — "JUE · 8 MAY". Útil en covers
 *  de eventos o headers de debates. */
export function formatFechaEditorial(input: Date | string | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const dias = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const meses = [
    "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
    "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
  ];
  return `${dias[d.getDay()]} · ${d.getDate()} ${meses[d.getMonth()]}`;
}

/** Pluralización editorial común: "1 publicación" / "12 publicaciones". */
export function pluralEditorial(n: number, singular: string, plural: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
}

/** Convierte enteros 1-50 a romanos para el grado en covers. */
export function toRoman(num: number): string {
  if (num <= 0) return "";
  const map: Array<[number, string]> = [
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"],
    [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
