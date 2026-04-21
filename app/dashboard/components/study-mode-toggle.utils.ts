/**
 * Utilidades server-safe para el toggle de pool de estudio.
 *
 * Vive aparte del componente `StudyPoolToggle` (que es `"use client"`) para
 * que los Server Components de cada módulo puedan llamar `resolveStudyPool`
 * al parsear `searchParams` sin arrastrar el cliente al servidor.
 *
 * Motivo: Next 14 App Router reemplaza los exports non-component de un módulo
 * `"use client"` por stubs cuando los importa un Server Component, y llamarlos
 * en runtime falla con `is not a function`.
 */

export type StudyPool = "normal" | "integradores";

/**
 * Normaliza el searchParam "pool" a uno de los dos valores válidos.
 * Cualquier valor inesperado colapsa a "normal".
 */
export function resolveStudyPool(
  raw: string | string[] | undefined
): StudyPool {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "integradores" ? "integradores" : "normal";
}
