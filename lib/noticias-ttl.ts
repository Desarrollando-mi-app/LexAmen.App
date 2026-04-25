// ─── TTL de Noticias Jurídicas ────────────────────────────
//
// Las noticias aprobadas permanecen visibles en el feed público durante
// NOTICIA_TTL_HOURS. Pasado ese plazo:
//   - El cron diario marca `archivada = true` + setea `fechaArchivo` (housekeeping).
//   - Las queries públicas filtran por `fechaAprobacion >= cutoff` para mantener
//     precisión a la minuto sin depender de cuándo corrió el cron.
//
// Esta política fuerza al admin a mantener el feed activo seleccionando
// noticias en el panel (cumple pedido del usuario: "incentivarme a
// mantenerla actualizada").

export const NOTICIA_TTL_HOURS = 48;

/**
 * Devuelve el timestamp límite: fechaAprobacion debe ser >= a este valor
 * para que la noticia cuente como "vigente" en el feed público.
 */
export function getNoticiaCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - NOTICIA_TTL_HOURS * 60 * 60 * 1000);
}

/**
 * Cláusula Prisma reutilizable para filtrar noticias visibles al público.
 *
 * Reglas finales (cuando la migración 20260425_noticia_contenido_pinned
 * esté aplicada en producción):
 *   - Aprobada y no archivada (siempre).
 *   - Aparece en feed si: dentro del TTL 48h estándar, O `pinnedTop=true`,
 *     O `pinnedUntil` aún en el futuro (cartas/columnas pinneadas 1 semana,
 *     editoriales pinneadas indefinidamente).
 *
 * NOTA TRANSICIONAL (2026-04-25): se incluye sólo el filtro TTL clásico
 * porque algunos entornos aún no tienen las columnas `pinnedTop` /
 * `pinnedUntil`. Una vez que migrate deploy esté garantizado en cada build,
 * descomentar el bloque OR de abajo.
 *
 * Uso:
 *   where: { ...noticiasVigentesWhere(), <otros filtros> }
 */
export function noticiasVigentesWhere() {
  const now = new Date();
  return {
    estado: "aprobada",
    archivada: false,
    fechaAprobacion: { gte: getNoticiaCutoff(now) },
    // OR: [
    //   { fechaAprobacion: { gte: getNoticiaCutoff(now) } },
    //   { pinnedTop: true },
    //   { pinnedUntil: { gt: now } },
    // ],
  };
}
