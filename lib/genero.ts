// ─── Géneros — set canónico para concordancia gramatical ─────
//
// La columna `User.gender` en BD es String? sin enum (legacy, virgen
// hasta Sprint 2). Este módulo encapsula el set canónico y normaliza
// cualquier valor crudo que pudiera existir.
//
// Decisiones cerradas:
//   - 4 valores: femenino · masculino · no_binario · prefiere_no_decir
//   - Forma neutra: "Egresade", "Abogade" (camino A español inclusivo)
//   - Fallback de gender null o prefiere_no_decir → masculino genérico

export const GENEROS = [
  "femenino",
  "masculino",
  "no_binario",
  "prefiere_no_decir",
] as const;

export type Genero = (typeof GENEROS)[number];

export const GENERO_LABELS: Record<Genero, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  no_binario: "No binario",
  prefiere_no_decir: "Prefiero no decir",
};

/**
 * Normaliza valores legacy en BD (la columna es String? sin enum,
 * podría tener valores antiguos en formato libre). Devuelve null si
 * no matchea ningún valor canónico — el caller decide el fallback.
 */
export function normalizeGenero(
  raw: string | null | undefined,
): Genero | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower === "f" || lower === "femenino" || lower === "female") {
    return "femenino";
  }
  if (lower === "m" || lower === "masculino" || lower === "male") {
    return "masculino";
  }
  if (
    lower === "nb" ||
    lower === "no_binario" ||
    lower === "no binario" ||
    lower === "non-binary"
  ) {
    return "no_binario";
  }
  if (lower === "prefiere_no_decir" || lower === "pnd") {
    return "prefiere_no_decir";
  }
  return null;
}

export function isGenero(value: unknown): value is Genero {
  return typeof value === "string" && (GENEROS as readonly string[]).includes(value);
}
