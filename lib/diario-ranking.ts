// ═══ RANKING DE AUTORES ═══

export interface AutorStats {
  obiters: number;
  miniAnalisis: number;
  analisisCompletos: number;
  ensayos: number;
  investigaciones: number;
  argumentosExpediente: number;
  debatesParticipados: number;
  debatesGanados: number;
  apoyosRecibidos: number;
  citasRecibidas: number;
  mejorAnalisisSemana: number;
  mejorAlegatoExpediente: number;
  reviewsCompletados: number;
}

// ═══ PESOS DEL RANKING ═══
//
// La jerarquía la fija el esfuerzo y rigor del aporte. De menor a mayor:
//
//   Obiter (1)  <  Argumento (3)  <  Mini Análisis (4)
//      <  Debate participado (6)  <  Análisis Completo (8)
//      <  Debate ganado (12)      <  Ensayo (15)
//      <  Investigación (30)
//
// Reviews suman como servicio (2). Apoyos y citas son señales de
// reconocimiento — citar pesa más que apoyar (3 vs 0.5). Los premios
// editoriales (mejor análisis, mejor alegato) son los multiplicadores
// más fuertes y deben ser raros: 25 c/u.
//
// `investigaciones` queda reservado: el modelo se incorpora más adelante.
// El peso ya está fijado para que cuando el modelo exista el ranking
// quede coherente sin tener que recalcular nada.

export const RANKING_PESOS = {
  obiter: 1,
  argumentoExpediente: 3,
  miniAnalisis: 4,
  reviewCompletado: 2,
  debateParticipado: 6,
  analisisCompleto: 8,
  debateGanado: 12,
  ensayo: 15,
  investigacion: 30,
  apoyoRecibido: 0.5,
  citaRecibida: 3,
  mejorAnalisisSemana: 25,
  mejorAlegatoExpediente: 25,
} as const;

export function calcularScoreAutor(stats: AutorStats): number {
  return (
    stats.obiters * RANKING_PESOS.obiter +
    stats.argumentosExpediente * RANKING_PESOS.argumentoExpediente +
    stats.miniAnalisis * RANKING_PESOS.miniAnalisis +
    stats.reviewsCompletados * RANKING_PESOS.reviewCompletado +
    stats.debatesParticipados * RANKING_PESOS.debateParticipado +
    stats.analisisCompletos * RANKING_PESOS.analisisCompleto +
    stats.debatesGanados * RANKING_PESOS.debateGanado +
    stats.ensayos * RANKING_PESOS.ensayo +
    stats.investigaciones * RANKING_PESOS.investigacion +
    stats.apoyosRecibidos * RANKING_PESOS.apoyoRecibido +
    stats.citasRecibidas * RANKING_PESOS.citaRecibida +
    stats.mejorAnalisisSemana * RANKING_PESOS.mejorAnalisisSemana +
    stats.mejorAlegatoExpediente * RANKING_PESOS.mejorAlegatoExpediente
  );
}

// ═══ FILTRO POR TIPO ═══
//
// El ranking puede consultarse globalmente (TODOS) o restringido a un
// único tipo de publicación. Cuando se filtra por tipo, la API sólo
// ejecuta las consultas asociadas a ese tipo y deja en cero el resto;
// `calcularScoreAutor` se reutiliza tal cual y el score queda alineado
// con los pesos globales (Investigación = 30, Ensayo = 15, etc.) — eso
// permite que los rankings por tipo sean comparables entre sí.
//
// "investigacion" queda reservado: el modelo se incorpora más adelante.
// Mientras tanto la chip aparece en la UI bloqueada como "Próximamente".

export const RANKING_TIPOS = [
  "TODOS",
  "obiter",
  "analisis",
  "ensayo",
  "argumento",
  "debate",
  "investigacion",
] as const;

export type RankingTipo = (typeof RANKING_TIPOS)[number];

export function isRankingTipo(value: string | null | undefined): value is RankingTipo {
  if (!value) return false;
  return (RANKING_TIPOS as ReadonlyArray<string>).includes(value);
}

export const RANKING_TIPO_LABELS: Record<RankingTipo, string> = {
  TODOS: "Todos",
  obiter: "Obiter Dictum",
  analisis: "Análisis",
  ensayo: "Ensayos",
  argumento: "Argumentos",
  debate: "Debates",
  investigacion: "Investigaciones",
};

/**
 * `true` si las consultas asociadas a `bucket` deben ejecutarse para el
 * `tipo` seleccionado. Permite cortocircuitar queries en la API cuando
 * el usuario filtra por una sola categoría.
 *
 * Buckets:
 *  - obiter:    Obiter Dictum (cuentas + apoyos + citas)
 *  - analisis:  Mini Análisis + Análisis Completo (cuentas + apoyos +
 *               citas) y "Mejor análisis de la semana"
 *  - ensayo:    Ensayos (cuentas + apoyos + citas)
 *  - argumento: Argumentos de Expediente y "Mejor alegato"
 *  - debate:    Debates participados/ganados
 *  - review:    Peer Reviews completados (no es un tipo "publicación",
 *               se incluye solo cuando tipo === TODOS)
 *  - investigacion: reservado, sin queries hoy.
 */
export function rankingIncluyeBucket(
  tipo: RankingTipo,
  bucket: "obiter" | "analisis" | "ensayo" | "argumento" | "debate" | "review" | "investigacion",
): boolean {
  if (tipo === "TODOS") {
    // El bucket "investigacion" no existe todavía. Cuando exista, sí
    // entrará en TODOS.
    return bucket !== "investigacion";
  }
  if (tipo === "investigacion") {
    // El modelo aún no está; el ranking en este filtro queda vacío.
    return false;
  }
  return tipo === bucket;
}
