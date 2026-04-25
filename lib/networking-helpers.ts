// ─── Helpers V4 para Networking ──────────────────────────
//
// Mismo lenguaje editorial que Pasantías y Ofertas: cormorant headings,
// archivo body, ibm-mono labels, paleta cream/ink/gold. Acá la "tarjeta"
// de un colega tiene un cover degradado según su etapa actual (estudiante,
// egresado, abogado) y un monogram tipográfico cuando no hay avatar.

import { getAreaLabel } from "./sala-constants";
import { AREA_GRADIENTS } from "./pasantias-helpers";

export type EtapaActual = "estudiante" | "egresado" | "abogado";

/** Gradientes editoriales por etapa profesional. */
export const ETAPA_GRADIENTS: Record<string, string> = {
  estudiante:
    "linear-gradient(135deg, #b9d2c9 0%, #8fb1aa 60%, #5d8a83 100%)",
  egresado:
    "linear-gradient(135deg, #d8c08d 0%, #b89a64 55%, #8a6d3f 100%)",
  abogado:
    "linear-gradient(135deg, #6b4f4a 0%, #4a3431 55%, #2a1f1d 100%)",
  otro: AREA_GRADIENTS.otro,
};

export function etapaGradient(etapa: string | null | undefined): string {
  if (!etapa) return ETAPA_GRADIENTS.otro;
  return ETAPA_GRADIENTS[etapa] ?? ETAPA_GRADIENTS.otro;
}

export const ETAPA_LABELS: Record<string, string> = {
  estudiante: "Estudiante",
  egresado: "Egresado",
  abogado: "Abogado",
};

export function etapaLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return ETAPA_LABELS[value] ?? value;
}

/** Re-export para que los tiles no tengan que importar de otro helper. */
export function areaLabel(value: string): string {
  return getAreaLabel(value);
}

/** Iniciales del nombre — "Pedro Pascal" → "PP". Usado en el monogram del cover. */
export function colegaInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const a = (firstName ?? "").trim().charAt(0);
  const b = (lastName ?? "").trim().charAt(0);
  const result = `${a}${b}`.toUpperCase();
  return result.length > 0 ? result : "—";
}

/** Parsea el campo `especialidades` (JSON-as-string) sin lanzar. */
export function parseEspecialidades(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
    return [];
  } catch {
    return [];
  }
}

/** Línea editorial para el subtítulo del tile. Adapta por etapa. */
export function colegaSummary(props: {
  etapaActual: string | null;
  universidad: string | null;
  cargoActual: string | null;
  empleoActual: string | null;
  universityYear: number | null;
}): string {
  const { etapaActual, universidad, cargoActual, empleoActual, universityYear } =
    props;
  if (etapaActual === "abogado") {
    if (cargoActual && empleoActual) return `${cargoActual} · ${empleoActual}`;
    if (empleoActual) return empleoActual;
    if (cargoActual) return cargoActual;
    if (universidad) return `Egresado de ${universidad}`;
    return "Abogado";
  }
  if (etapaActual === "egresado") {
    if (empleoActual) return `Egresado · ${empleoActual}`;
    if (universidad) return `Egresado de ${universidad}`;
    return "Egresado";
  }
  // estudiante / fallback
  if (universidad && universityYear) {
    return `${universidad} · ${universityYear}° año`;
  }
  if (universidad) return universidad;
  return "Estudiante";
}

/**
 * Tipo serializado server → client para tiles de Networking.
 * Subset deliberadamente minimalista: el detalle vive en /perfil/[userId].
 */
export interface ColegaTileData {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  etapaActual: string | null;
  universidad: string | null;
  universityYear: number | null;
  region: string | null;
  empleoActual: string | null;
  cargoActual: string | null;
  bio: string | null;
  especialidades: string[];
  grado: number;
  xp: number;
  createdAt: string;
}
