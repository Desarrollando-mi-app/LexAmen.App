/**
 * Exercise code utilities
 *
 * Maps exercise types to short, human-readable codes derived from CUID:
 * - Flashcard cmnq8r001abc... → FC-q8r001
 * - MCQ cmn3zfy4x2k... → MCQ-fy4x2k
 *
 * Stable: same CUID always produces same code (last 6 chars).
 */

export type ExerciseType =
  | "FLASHCARD"
  | "MCQ"
  | "TRUEFALSE"
  | "DEFINICION"
  | "FILLBLANK"
  | "ERROR_IDENTIFICATION"
  | "ORDER_SEQUENCE"
  | "MATCH_COLUMNS"
  | "CASO_PRACTICO"
  | "DICTADO"
  | "TIMELINE";

export const EXERCISE_TYPE_PREFIX: Record<ExerciseType, string> = {
  FLASHCARD: "FC",
  MCQ: "MCQ",
  TRUEFALSE: "VF",
  DEFINICION: "DEF",
  FILLBLANK: "FB",
  ERROR_IDENTIFICATION: "ERR",
  ORDER_SEQUENCE: "ORD",
  MATCH_COLUMNS: "REL",
  CASO_PRACTICO: "CP",
  DICTADO: "DICT",
  TIMELINE: "TL",
};

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  FLASHCARD: "Flashcard",
  MCQ: "MCQ",
  TRUEFALSE: "Verdadero/Falso",
  DEFINICION: "Definición",
  FILLBLANK: "Completar Espacios",
  ERROR_IDENTIFICATION: "Identificar Errores",
  ORDER_SEQUENCE: "Ordenar Secuencias",
  MATCH_COLUMNS: "Relacionar Columnas",
  CASO_PRACTICO: "Caso Práctico",
  DICTADO: "Dictado Jurídico",
  TIMELINE: "Línea de Tiempo",
};

const ALL_TYPES = Object.keys(EXERCISE_TYPE_PREFIX) as ExerciseType[];

export function isValidExerciseType(t: string): t is ExerciseType {
  return (ALL_TYPES as string[]).includes(t);
}

/**
 * Generate a stable display code from an exercise type and CUID.
 * Returns "FC-q8r001" style codes.
 */
export function exerciseCode(type: ExerciseType, cuid: string): string {
  const prefix = EXERCISE_TYPE_PREFIX[type];
  if (!cuid) return prefix;
  const tail = cuid.slice(-6).toLowerCase();
  return `${prefix}-${tail}`;
}

/**
 * Map exerciseType → prisma model name (for delegate access).
 * Used by API endpoints to look up exercise records dynamically.
 */
export const TYPE_TO_PRISMA_MODEL: Record<ExerciseType, string> = {
  FLASHCARD: "flashcard",
  MCQ: "mCQ",
  TRUEFALSE: "trueFalse",
  DEFINICION: "definicion",
  FILLBLANK: "fillBlank",
  ERROR_IDENTIFICATION: "errorIdentification",
  ORDER_SEQUENCE: "orderSequence",
  MATCH_COLUMNS: "matchColumns",
  CASO_PRACTICO: "casoPractico",
  DICTADO: "dictadoJuridico",
  TIMELINE: "timeline",
};

export const REPORT_REASONS = [
  { value: "respuesta_incorrecta", label: "Respuesta incorrecta" },
  { value: "mal_redactada", label: "Pregunta mal redactada" },
  { value: "opciones_confusas", label: "Opciones confusas" },
  { value: "duplicado", label: "Contenido duplicado" },
  { value: "error_articulo", label: "Error en el artículo citado" },
  { value: "otro", label: "Otro" },
] as const;
