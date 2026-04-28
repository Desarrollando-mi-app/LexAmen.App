// ─── Etapa profesional con concordancia de género ────────────
//
// Helper de dominio Studio Iuris: convierte (etapaActual, gender) en el
// label legible con concordancia gramatical correcta para mostrar al
// autor en publicaciones.
//
// Reemplaza el `capitalize(user.etapaActual)` bruto que el Sprint 1
// introdujo (que no respetaba género). Ver Bloque A.6 del prompt.

import { type Genero, normalizeGenero } from "./genero";

export const ETAPAS = ["estudiante", "egresado", "abogado"] as const;
export type Etapa = (typeof ETAPAS)[number];

// Tabla de formas conjugadas. Estudiante es invariable.
const ETAPA_FORMS: Record<Etapa, Record<Genero, string>> = {
  estudiante: {
    femenino: "Estudiante",
    masculino: "Estudiante",
    no_binario: "Estudiante",
    prefiere_no_decir: "Estudiante",
  },
  egresado: {
    femenino: "Egresada",
    masculino: "Egresado",
    no_binario: "Egresade",
    prefiere_no_decir: "Egresado",
  },
  abogado: {
    femenino: "Abogada",
    masculino: "Abogado",
    no_binario: "Abogade",
    prefiere_no_decir: "Abogado",
  },
};

export function isEtapa(value: unknown): value is Etapa {
  return typeof value === "string" && (ETAPAS as readonly string[]).includes(value);
}

/**
 * Devuelve la etapa profesional con concordancia de género.
 *
 * - Si etapaRaw es null/undefined o no es una etapa válida → null
 * - Si generoRaw es null o "prefiere_no_decir" → masculino genérico
 *   (forma estándar del español jurídico clásico)
 * - capitalize=false para frases corridas embebidas
 *   ("U. de Chile · egresada 2025")
 *
 * Ejemplos:
 *   formatEtapa("egresado", "femenino")   → "Egresada"
 *   formatEtapa("egresado", "no_binario") → "Egresade"
 *   formatEtapa("egresado", null)         → "Egresado"
 *   formatEtapa("estudiante", "femenino") → "Estudiante"
 *   formatEtapa(null, "femenino")         → null
 *   formatEtapa("egresado", "femenino", { capitalize: false }) → "egresada"
 */
export function formatEtapa(
  etapaRaw: string | null | undefined,
  generoRaw: string | null | undefined,
  options: { capitalize?: boolean } = {},
): string | null {
  if (!etapaRaw) return null;
  const etapa = etapaRaw.toLowerCase().trim();
  if (!isEtapa(etapa)) return null;

  const genero: Genero = normalizeGenero(generoRaw) ?? "masculino";
  const form = ETAPA_FORMS[etapa][genero];

  return options.capitalize === false ? form.toLowerCase() : form;
}

// TODO: tests del helper (formatEtapa) cuando se configure Vitest/Jest.
// Casos clave a cubrir:
//   - Concordancia femenino/masculino/no_binario en cada etapa
//   - "Estudiante" invariable
//   - Fallback a masculino genérico para null/undefined/prefiere_no_decir
//   - capitalize=false devuelve lowercase
//   - Normalización legacy ("F", "female", "NB" → género canónico)
//   - etapa null/inválida → null

