/**
 * Genera la key compuesta para identificar el progreso de un título.
 * Compartido entre Server Components (page.tsx) y Client Components (curriculum-progress).
 */
export function progressKey(rama: string, libro: string, tituloId: string): string {
  return `${rama}|${libro}|${tituloId}`;
}
