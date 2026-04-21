/**
 * Helper: construir el filtro de rama que respeta ramasAdicionales (Fase 7).
 *
 * Un ejercicio puede tener una rama primaria (`rama`) y ramas adicionales
 * (`ramasAdicionales`) donde también aplica. Para las queries de browse,
 * queremos mostrar el ejercicio cuando cualquiera de las dos coincida.
 *
 * Uso:
 *   const where = { isActive: true };
 *   const ramaFilter = buildRamaFilter(rama);
 *   if (ramaFilter) Object.assign(where, ramaFilter);
 *
 * Devuelve null si `rama` es falsy o "ALL" — no aplica filtro.
 */
export function buildRamaFilter(
  rama: string | null | undefined,
): { OR: Array<Record<string, unknown>> } | null {
  if (!rama || rama === "ALL") return null;
  return {
    OR: [
      { rama },
      { ramasAdicionales: { has: rama } },
    ],
  };
}
