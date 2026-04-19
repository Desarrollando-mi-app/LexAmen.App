/**
 * Integradores — títulos especiales que agrupan materia transversal.
 * ─────────────────────────────────────────────────────────────────
 * Estos títulos NO son párrafos del código en sí, sino agrupaciones
 * editoriales que combinan múltiples libros/títulos. Los ejercicios
 * asignados a estos títulos se marcan con `esIntegrador=true` y se
 * presentan en un flujo de estudio separado ("Integradores") para no
 * contaminar la browse por título/párrafo.
 *
 * Política definida en Fase 3 de la migración. Fuente única de verdad
 * para: scripts de clasificación (fase5-dry-run.ts), UI de "Estudiar"
 * (study-mode-toggle.tsx), y cualquier filtro de catastro.
 */

export const INTEGRADOR_TITULOS: ReadonlyArray<string> = [
  // Derecho Procesal Civil — integradores por juicio
  "CPC_JUICIO_ORDINARIO",
  "CPC_JUICIOS_ESPECIALES",
  "CPC_ACTOS_NO_CONTENCIOSOS",
  "CPC_JUICIO_EJECUTIVO",
  "CPC_INTEGRADOR",
  "CPC_COMPLETO",
  // Derecho Orgánico — integradores del COT
  "COT_INTEGRADOR",
  "COT_INTEGRADOR_FINAL",
  // Transversal
  "JURISPRUDENCIA",
];

export const INTEGRADOR_TITULOS_SET: ReadonlySet<string> = new Set(INTEGRADOR_TITULOS);

export function isIntegradorTitulo(titulo: string | null | undefined): boolean {
  return titulo != null && INTEGRADOR_TITULOS_SET.has(titulo);
}

/**
 * Labels display para cada integrador. Usado por la UI de "Estudiar — Integradores"
 * para mostrar el título del integrador en lugar del código interno.
 */
export const INTEGRADOR_LABELS: Record<string, string> = {
  CPC_JUICIO_ORDINARIO: "Juicio Ordinario — integrador",
  CPC_JUICIOS_ESPECIALES: "Juicios Especiales — integrador",
  CPC_ACTOS_NO_CONTENCIOSOS: "Actos No Contenciosos — integrador",
  CPC_JUICIO_EJECUTIVO: "Juicio Ejecutivo — integrador",
  CPC_INTEGRADOR: "CPC — integrador completo",
  CPC_COMPLETO: "CPC — completo",
  COT_INTEGRADOR: "COT — integrador",
  COT_INTEGRADOR_FINAL: "COT — integrador final",
  JURISPRUDENCIA: "Jurisprudencia — integrador",
};

export function integradorLabel(titulo: string): string {
  return INTEGRADOR_LABELS[titulo] ?? titulo;
}
