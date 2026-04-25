// ─── Helpers para "Mis publicaciones" V4 (unificado) ────
//
// Normaliza ayudantías, pasantías y ofertas en un solo tipo
// `Publication` para listarlas juntas con un mismo lenguaje
// editorial. Cada publicación lleva `kind` y `subkind` para
// que el tile sepa qué accent y qué CTAs mostrar.

export type PublicationKind = "ayudantia" | "pasantia" | "oferta";

/**
 * subkind diferencia "ofrezco/busco" en ayudantías y pasantías;
 * ofertas no tienen subkind (siempre es publicador).
 */
export type PublicationSubkind = "ofrezco" | "busco" | null;

export interface Publication {
  id: string;
  kind: PublicationKind;
  subkind: PublicationSubkind;
  /** Título visible en la fila (siempre tiene fallback). */
  title: string;
  /** Eyebrow corto: materia / área / cargo, según kind. */
  eyebrow: string;
  /** Línea secundaria: ciudad, universidad, formato, etc. */
  meta: string;
  /** Estado para badges: activa / oculta. */
  isActive: boolean;
  isHidden: boolean;
  /** Fecha ISO. */
  createdAt: string;
  updatedAt: string;
  /** Ruta pública para "Ver detalle". */
  detailHref: string;
  /** Ruta legacy para edición (Fase 3 eliminará este fallback). */
  editHref: string;
  /** Endpoint REST para PATCH/DELETE. */
  apiHref: string;
}

export const KIND_LABELS: Record<PublicationKind, string> = {
  ayudantia: "Ayudantía",
  pasantia: "Pasantía",
  oferta: "Oferta laboral",
};

export const SUBKIND_LABELS: Record<NonNullable<PublicationSubkind>, string> = {
  ofrezco: "Ofrezco",
  busco: "Busco",
};

/**
 * Glifos editoriales por kind — sirven de "ornamento de tipo" en
 * los tiles. Mantenemos paleta cream/ink/gold + burgundy como acento
 * para "busco".
 */
export const KIND_GLYPHS: Record<PublicationKind, string> = {
  ayudantia: "§",
  pasantia: "¶",
  oferta: "⚖",
};

/** Color de acento por kind, usado en bordes y eyebrows. */
export function kindAccent(kind: PublicationKind, subkind: PublicationSubkind) {
  if (subkind === "busco") return "burgundy"; // estudiante busca → burgundy
  if (kind === "oferta") return "ink"; // oferta laboral → ink
  return "gold"; // ayudantía/pasantía ofrezco → gold
}
