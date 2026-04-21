/**
 * Helper: construir el filtro de rama que respeta ramasAdicionales (Fase 7).
 *
 * Un ejercicio puede tener una rama primaria (`rama`) y ramas adicionales
 * (`ramasAdicionales`) donde también aplica. Para las queries de browse,
 * queremos mostrar el ejercicio cuando cualquiera de las dos coincida.
 *
 * Devuelve siempre un objeto spreadable — vacío si no aplica filtro.
 *
 * Uso:
 *   const where = { activo: true, ...buildRamaFilter(rama) };
 */
export function buildRamaFilter(
  rama: string | null | undefined,
): Record<string, unknown> {
  if (!rama || rama === "ALL") return {};
  return {
    OR: [
      { rama },
      { ramasAdicionales: { has: rama } },
    ],
  };
}
