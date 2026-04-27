// ─── Ramas del Derecho — taxonomía única del Diario ────────────
//
// Source of truth para el campo `materia` que comparten ObiterDictum,
// AnalisisSentencia, Ensayo y compañía. Antes había sub-áreas del
// derecho civil (acto_juridico, obligaciones, contratos…) — ahora
// usamos las ramas canónicas del derecho chileno para que las
// publicaciones de cualquier área puedan clasificarse sin forzar.
//
// Los valores antiguos siguen renderizándose vía LEGACY_LABELS
// para no romper publicaciones históricas, pero los formularios solo
// muestran las RAMAS nuevas. Una migración de datos remapea los
// valores antiguos a la rama equivalente más cercana.

export type RamaValue =
  | "civil"
  | "penal"
  | "procesal"
  | "comercial"
  | "laboral"
  | "administrativo"
  | "constitucional"
  | "tributario"
  | "familia"
  | "internacional"
  | "otro";

export const RAMAS: { value: RamaValue; label: string }[] = [
  { value: "civil", label: "Derecho Civil" },
  { value: "penal", label: "Derecho Penal" },
  { value: "procesal", label: "Derecho Procesal" },
  { value: "comercial", label: "Derecho Comercial" },
  { value: "laboral", label: "Derecho Laboral" },
  { value: "administrativo", label: "Derecho Administrativo" },
  { value: "constitucional", label: "Derecho Constitucional" },
  { value: "tributario", label: "Derecho Tributario" },
  { value: "familia", label: "Derecho de Familia" },
  { value: "internacional", label: "Derecho Internacional" },
  { value: "otro", label: "Otro" },
];

// Labels rápidos por valor — incluye legacy para publicaciones
// antiguas que aún no fueron migradas.
export const RAMA_LABELS: Record<string, string> = Object.fromEntries(
  RAMAS.map((r) => [r.value, r.label]),
);

// Compat con publicaciones legacy: si alguna fila quedó con un valor
// de la taxonomía antigua, se renderiza con su label original.
const LEGACY_LABELS: Record<string, string> = {
  acto_juridico: "Acto Jurídico",
  obligaciones: "Obligaciones",
  contratos: "Contratos",
  procesal_civil: "Procesal Civil",
  bienes: "Bienes",
  sucesiones: "Sucesiones",
};

/**
 * Devuelve el label legible para un valor de materia/rama,
 * tolerando valores legacy o desconocidos.
 */
export function getRamaLabel(value: string | null | undefined): string {
  if (!value) return "";
  return RAMA_LABELS[value] ?? LEGACY_LABELS[value] ?? value;
}

/**
 * Mapeo de valores legacy → rama nueva. Usado por la migración SQL.
 * Todo lo civil sub-area cae a "civil"; familia se mantiene; procesal
 * civil sube a "procesal" (genérico, abarca civil + penal).
 */
export const LEGACY_TO_RAMA: Record<string, RamaValue> = {
  acto_juridico: "civil",
  obligaciones: "civil",
  contratos: "civil",
  bienes: "civil",
  sucesiones: "civil",
  familia: "familia",
  procesal_civil: "procesal",
  otro: "otro",
};
