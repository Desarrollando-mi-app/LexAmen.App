import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CURRICULUM } from "@/lib/curriculum-data";
import { progressKey } from "@/lib/progress-utils";
import { IndiceMaestroClient } from "./indice-maestro-client";

export const metadata = {
  title: "Materias — Studio Iuris",
};

// Key compuesta para stats de párrafo
function parrafoKey(rama: string, libro: string, titulo: string, parrafo: string): string {
  return `${rama}|${libro}|${titulo}|${parrafo}`;
}

export default async function IndiceMaestroPage() {
  const perfStart = Date.now();
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // ── Parallel queries ──────────────────────────────────────────
  const [
    // Totals (content counts) — ahora agrupan también por parrafo
    fcByTitulo, mcqByTitulo, tfByTitulo, defByTitulo,
    fillByTitulo, errorByTitulo, orderByTitulo, matchByTitulo,
    casoByTitulo, dictadoByTitulo, timelineByTitulo,
    // User progress (completed counts) — incluye parrafo en select
    fcProgress, mcqDone, tfDone, defDone,
    fillDone, errorDone, orderDone, matchDone,
    casoDone, dictadoDone, timelineDone,
  ] = await Promise.all([
    // ─── TOTALS ───────────────────────────────────────
    prisma.flashcard.groupBy({ by: ["rama", "libro", "titulo", "parrafo"], _count: { id: true } }),
    prisma.mCQ.groupBy({ by: ["rama", "libro", "titulo", "parrafo"], _count: { id: true } }),
    prisma.trueFalse.groupBy({ by: ["rama", "libro", "titulo", "parrafo"], _count: { id: true } }),
    prisma.definicion.groupBy({ by: ["rama", "libro", "titulo", "parrafo"], _count: { id: true } }),
    prisma.fillBlank.groupBy({ by: ["rama", "libro", "titulo", "parrafo"], where: { activo: true }, _count: { id: true } }),
    prisma.errorIdentification.groupBy({ by: ["rama", "libro", "titulo", "parrafo"], where: { activo: true }, _count: { id: true } }),
    prisma.orderSequence.groupBy({ by: ["rama", "libro", "tituloMateria", "parrafo"], where: { activo: true }, _count: { id: true } }),
    prisma.matchColumns.groupBy({ by: ["rama", "libro", "tituloMateria", "parrafo"], where: { activo: true }, _count: { id: true } }),
    prisma.casoPractico.groupBy({ by: ["rama", "libro", "tituloMateria", "parrafo"], where: { activo: true }, _count: { id: true } }),
    prisma.dictadoJuridico.groupBy({ by: ["rama", "libro", "tituloMateria", "parrafo"], where: { activo: true }, _count: { id: true } }),
    prisma.timeline.groupBy({ by: ["rama", "libro", "tituloMateria", "parrafo"], where: { activo: true }, _count: { id: true } }),

    // ─── USER PROGRESS ────────────────────────────────
    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id, repetitions: { gte: 1 } },
      select: { flashcard: { select: { rama: true, libro: true, titulo: true, parrafo: true } } },
    }),
    prisma.userMCQAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true },
      select: { mcq: { select: { rama: true, libro: true, titulo: true, parrafo: true } } },
      distinct: ["mcqId"],
    }),
    prisma.userTrueFalseAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true },
      select: { trueFalse: { select: { rama: true, libro: true, titulo: true, parrafo: true } } },
      distinct: ["trueFalseId"],
    }),
    prisma.definicionIntento.findMany({
      where: { userId: authUser.id, correcta: true },
      select: { definicion: { select: { rama: true, libro: true, titulo: true, parrafo: true } } },
      distinct: ["definicionId"],
    }),
    prisma.fillBlankAttempt.findMany({
      where: { userId: authUser.id, todosCorrectos: true },
      select: { fillBlank: { select: { rama: true, libro: true, titulo: true, parrafo: true } } },
      distinct: ["fillBlankId"],
    }),
    prisma.errorIdentificationAttempt.findMany({
      where: { userId: authUser.id },
      select: { errorIdentification: { select: { rama: true, libro: true, titulo: true, parrafo: true } } },
      distinct: ["errorIdentificationId"],
    }),
    prisma.orderSequenceAttempt.findMany({
      where: { userId: authUser.id },
      select: { orderSequence: { select: { rama: true, libro: true, tituloMateria: true, parrafo: true } } },
      distinct: ["orderSequenceId"],
    }),
    prisma.matchColumnsAttempt.findMany({
      where: { userId: authUser.id },
      select: { matchColumns: { select: { rama: true, libro: true, tituloMateria: true, parrafo: true } } },
      distinct: ["matchColumnsId"],
    }),
    prisma.casoPracticoAttempt.findMany({
      where: { userId: authUser.id },
      select: { casoPractico: { select: { rama: true, libro: true, tituloMateria: true, parrafo: true } } },
      distinct: ["casoPracticoId"],
    }),
    prisma.dictadoAttempt.findMany({
      where: { userId: authUser.id },
      select: { dictado: { select: { rama: true, libro: true, tituloMateria: true, parrafo: true } } },
      distinct: ["dictadoId"],
    }),
    prisma.timelineAttempt.findMany({
      where: { userId: authUser.id },
      select: { timeline: { select: { rama: true, libro: true, tituloMateria: true, parrafo: true } } },
      distinct: ["timelineId"],
    }),
  ]);

  // ── Build stats maps keyed by "RAMA|LIBRO|TITULO" y "RAMA|LIBRO|TITULO|PARRAFO" ──
  type ModuleStats = { total: number; done: number };
  type TituloStats = {
    fc: ModuleStats; mcq: ModuleStats; tf: ModuleStats; def: ModuleStats;
    fill: ModuleStats; error: ModuleStats; order: ModuleStats; match: ModuleStats;
    caso: ModuleStats; dictado: ModuleStats; timeline: ModuleStats;
  };

  const emptyStats = (): TituloStats => ({
    fc: { total: 0, done: 0 }, mcq: { total: 0, done: 0 }, tf: { total: 0, done: 0 },
    def: { total: 0, done: 0 }, fill: { total: 0, done: 0 }, error: { total: 0, done: 0 },
    order: { total: 0, done: 0 }, match: { total: 0, done: 0 }, caso: { total: 0, done: 0 },
    dictado: { total: 0, done: 0 }, timeline: { total: 0, done: 0 },
  });

  const statsMap: Record<string, TituloStats> = {};
  const parrafoStatsMap: Record<string, TituloStats> = {};
  const ensure = (k: string) => { if (!statsMap[k]) statsMap[k] = emptyStats(); };
  const ensureP = (k: string) => { if (!parrafoStatsMap[k]) parrafoStatsMap[k] = emptyStats(); };

  // Helper to add totals from groupBy results
  type GBRow = { rama: string; libro: string; titulo: string; parrafo: string | null; _count: { id: number } };
  type GBRowTM = { rama: string; libro: string | null; tituloMateria: string | null; parrafo: string | null; _count: { id: number } };

  function addTotals(rows: GBRow[], field: keyof TituloStats) {
    for (const g of rows) {
      if (!g.titulo) continue;
      const libroKey = g.libro ?? "";
      const tKey = progressKey(g.rama, libroKey, g.titulo);
      ensure(tKey);
      statsMap[tKey][field].total += g._count.id; // suma a través de párrafos
      if (g.parrafo) {
        const pKey = parrafoKey(g.rama, libroKey, g.titulo, g.parrafo);
        ensureP(pKey);
        parrafoStatsMap[pKey][field].total = g._count.id;
      }
    }
  }
  function addTotalsTM(rows: GBRowTM[], field: keyof TituloStats) {
    for (const g of rows) {
      if (!g.tituloMateria) continue;
      const libroKey = g.libro ?? "";
      const tKey = progressKey(g.rama, libroKey, g.tituloMateria);
      ensure(tKey);
      statsMap[tKey][field].total += g._count.id;
      if (g.parrafo) {
        const pKey = parrafoKey(g.rama, libroKey, g.tituloMateria, g.parrafo);
        ensureP(pKey);
        parrafoStatsMap[pKey][field].total = g._count.id;
      }
    }
  }
  function addDone(
    rows: Array<{ rama: string; libro: string; titulo: string; parrafo: string | null }>,
    field: keyof TituloStats,
  ) {
    for (const r of rows) {
      const tKey = progressKey(r.rama, r.libro, r.titulo);
      ensure(tKey);
      statsMap[tKey][field].done += 1;
      if (r.parrafo) {
        const pKey = parrafoKey(r.rama, r.libro, r.titulo, r.parrafo);
        ensureP(pKey);
        parrafoStatsMap[pKey][field].done += 1;
      }
    }
  }
  function addDoneTM(
    rows: Array<{ rama: string; libro: string | null; tituloMateria: string | null; parrafo: string | null }>,
    field: keyof TituloStats,
  ) {
    for (const r of rows) {
      if (!r.tituloMateria) continue;
      const libroKey = r.libro ?? "";
      const tKey = progressKey(r.rama, libroKey, r.tituloMateria);
      ensure(tKey);
      statsMap[tKey][field].done += 1;
      if (r.parrafo) {
        const pKey = parrafoKey(r.rama, libroKey, r.tituloMateria, r.parrafo);
        ensureP(pKey);
        parrafoStatsMap[pKey][field].done += 1;
      }
    }
  }

  // Totals
  addTotals(fcByTitulo as GBRow[], "fc");
  addTotals(mcqByTitulo as GBRow[], "mcq");
  addTotals(tfByTitulo as GBRow[], "tf");
  addTotals(defByTitulo as GBRow[], "def");
  addTotals(fillByTitulo as GBRow[], "fill");
  addTotals(errorByTitulo as GBRow[], "error");
  addTotalsTM(orderByTitulo as GBRowTM[], "order");
  addTotalsTM(matchByTitulo as GBRowTM[], "match");
  addTotalsTM(casoByTitulo as GBRowTM[], "caso");
  addTotalsTM(dictadoByTitulo as GBRowTM[], "dictado");
  addTotalsTM(timelineByTitulo as GBRowTM[], "timeline");

  // Done (user progress) - filter out nulls and normalize types
  type RLTP = { rama: string; libro: string; titulo: string; parrafo: string | null };
  const toRLTP = (
    r: { rama: string; libro: string | null; titulo: string | null; parrafo: string | null },
  ): RLTP | null =>
    r.titulo && r.libro ? { rama: r.rama, libro: r.libro, titulo: r.titulo, parrafo: r.parrafo } : null;

  addDone(fcProgress.map((r) => r.flashcard), "fc");
  addDone(mcqDone.map((r) => r.mcq), "mcq");
  addDone(tfDone.map((r) => r.trueFalse), "tf");
  addDone(defDone.map((r) => toRLTP(r.definicion)).filter((d): d is RLTP => d !== null), "def");
  addDone(fillDone.map((r) => toRLTP(r.fillBlank)).filter((d): d is RLTP => d !== null), "fill");
  addDone(errorDone.map((r) => toRLTP(r.errorIdentification)).filter((d): d is RLTP => d !== null), "error");
  addDoneTM(orderDone.map((r) => r.orderSequence), "order");
  addDoneTM(matchDone.map((r) => r.matchColumns), "match");
  addDoneTM(casoDone.map((r) => r.casoPractico), "caso");
  addDoneTM(dictadoDone.map((r) => r.dictado), "dictado");
  addDoneTM(timelineDone.map((r) => r.timeline), "timeline");

  // ── Build serialisable curriculum with progress ─────────────────
  const MODULE_KEYS: (keyof TituloStats)[] = ["fc", "mcq", "tf", "def", "fill", "error", "order", "match", "caso", "dictado", "timeline"];

  function sumTotal(s: TituloStats): number {
    return MODULE_KEYS.reduce((sum, k) => sum + s[k].total, 0);
  }
  function sumDone(s: TituloStats): number {
    return MODULE_KEYS.reduce((sum, k) => sum + s[k].done, 0);
  }

  const materias = Object.entries(CURRICULUM).map(([ramaKey, rama]) => {
    let ramaAllTotal = 0, ramaAllDone = 0;

    const libros = rama.secciones.map((sec) => {
      let libroAllTotal = 0, libroAllDone = 0;

      const titulos = sec.titulos.map((t) => {
        const k = progressKey(ramaKey, sec.libro, t.id);
        const s = statsMap[k] || emptyStats();

        const tTotal = sumTotal(s);
        const tDone = sumDone(s);
        libroAllTotal += tTotal;
        libroAllDone += Math.min(tDone, tTotal); // Cap at total for libro %

        // Cycles: done can exceed total via re-attempts
        const cycles = tTotal > 0 ? Math.floor(tDone / tTotal) : 0;
        const currentDone = tTotal > 0 ? tDone % tTotal : 0;
        const percent = tTotal > 0 ? Math.round((currentDone / tTotal) * 100) : 0;

        // ── Enriquecer cada párrafo con sus stats ──
        const parrafosEnriched = (t.parrafos ?? []).map((p) => {
          const pk = parrafoKey(ramaKey, sec.libro, t.id, p.id);
          const ps = parrafoStatsMap[pk] || emptyStats();
          const pTotal = sumTotal(ps);
          const pDone = sumDone(ps);
          const pCycles = pTotal > 0 ? Math.floor(pDone / pTotal) : 0;
          const pCurrentDone = pTotal > 0 ? pDone % pTotal : 0;
          const pPercent = pTotal > 0 ? Math.round((pCurrentDone / pTotal) * 100) : 0;
          return {
            id: p.id,
            label: p.label,
            articulosRef: p.articulosRef ?? null,
            fc: ps.fc, mcq: ps.mcq, tf: ps.tf, def: ps.def,
            fill: ps.fill, error: ps.error, order: ps.order, match: ps.match,
            caso: ps.caso, dictado: ps.dictado, timeline: ps.timeline,
            totalExercicios: pTotal,
            totalDone: pDone,
            cycles: pCycles,
            percent: pCycles > 0 && pCurrentDone === 0 ? 100 : pPercent,
          };
        });

        return {
          id: t.id,
          label: t.label,
          articulosRef: t.articulosRef ?? null,
          parrafos: parrafosEnriched,
          leyesAnexas: (t.leyesAnexas ?? []).map((la) => ({
            ley: la.ley, label: la.label, nombreCorto: la.nombreCorto ?? null,
          })),
          // Module stats
          fc: s.fc, mcq: s.mcq, tf: s.tf, def: s.def,
          fill: s.fill, error: s.error, order: s.order, match: s.match,
          caso: s.caso, dictado: s.dictado, timeline: s.timeline,
          // Aggregates
          totalExercicios: tTotal,
          totalDone: tDone,
          cycles,
          percent: cycles > 0 && currentDone === 0 ? 100 : percent,
        };
      });

      ramaAllTotal += libroAllTotal;
      ramaAllDone += libroAllDone;

      return {
        id: sec.id,
        libro: sec.libro,
        label: sec.label,
        titulos,
        leyesAnexas: (sec.leyesAnexas ?? []).map((la) => ({
          ley: la.ley, label: la.label, nombreCorto: la.nombreCorto ?? null,
        })),
        percent: libroAllTotal > 0 ? Math.round((libroAllDone / libroAllTotal) * 100) : 0,
      };
    });

    return {
      id: ramaKey,
      label: rama.label,
      libros,
      leyesAnexasRama: (rama.leyesAnexasRama ?? []).map((la) => ({
        ley: la.ley, label: la.label, nombreCorto: la.nombreCorto ?? null,
      })),
      percent: ramaAllTotal > 0 ? Math.round((ramaAllDone / ramaAllTotal) * 100) : 0,
    };
  });

  console.log("[PERF] Índice Maestro:", Date.now() - perfStart, "ms");

  return (
    <main
      className="min-h-screen pb-20 lg:pb-6"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <IndiceMaestroClient materias={materias} />
    </main>
  );
}
