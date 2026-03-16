import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CURRICULUM } from "@/lib/curriculum-data";
import { progressKey } from "@/lib/progress-utils";
import { IndiceMaestroClient } from "./indice-maestro-client";

export const metadata = {
  title: "Materias — Studio Iuris",
};

export default async function IndiceMaestroPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // ── Parallel queries ──────────────────────────────────────────
  const [
    flashcardsByTitulo,
    dominatedRecords,
    mcqByTitulo,
    mcqCorrectByTitulo,
    tfByTitulo,
    tfCorrectByTitulo,
  ] = await Promise.all([
    // Total flashcards grouped by rama/libro/titulo
    prisma.flashcard.groupBy({
      by: ["rama", "libro", "titulo"],
      _count: { id: true },
    }),

    // Dominated flashcards (repetitions >= 3) for this user
    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id, repetitions: { gte: 3 } },
      select: {
        flashcard: { select: { rama: true, libro: true, titulo: true } },
      },
    }),

    // Total MCQs grouped by rama/libro/titulo
    prisma.mCQ.groupBy({
      by: ["rama", "libro", "titulo"],
      _count: { id: true },
    }),

    // Correct MCQ attempts for this user (distinct mcqId to avoid double counting)
    prisma.userMCQAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true },
      select: {
        mcq: { select: { rama: true, libro: true, titulo: true } },
      },
      distinct: ["mcqId"],
    }),

    // Total V/F grouped by rama/libro/titulo
    prisma.trueFalse.groupBy({
      by: ["rama", "libro", "titulo"],
      _count: { id: true },
    }),

    // Correct V/F attempts for this user (distinct trueFalseId)
    prisma.userTrueFalseAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true },
      select: {
        trueFalse: { select: { rama: true, libro: true, titulo: true } },
      },
      distinct: ["trueFalseId"],
    }),
  ]);

  // ── Build progress data keyed by "RAMA|LIBRO|TITULO" ───────────
  type TituloStats = {
    fcTotal: number;
    fcDom: number;
    mcqTotal: number;
    mcqOk: number;
    tfTotal: number;
    tfOk: number;
  };

  const statsMap: Record<string, TituloStats> = {};

  const ensureKey = (k: string) => {
    if (!statsMap[k]) {
      statsMap[k] = { fcTotal: 0, fcDom: 0, mcqTotal: 0, mcqOk: 0, tfTotal: 0, tfOk: 0 };
    }
  };

  for (const g of flashcardsByTitulo) {
    const k = progressKey(g.rama, g.libro, g.titulo);
    ensureKey(k);
    statsMap[k].fcTotal = g._count.id;
  }

  for (const r of dominatedRecords) {
    const { rama, libro, titulo } = r.flashcard;
    const k = progressKey(rama, libro, titulo);
    ensureKey(k);
    statsMap[k].fcDom += 1;
  }

  for (const g of mcqByTitulo) {
    const k = progressKey(g.rama, g.libro, g.titulo);
    ensureKey(k);
    statsMap[k].mcqTotal = g._count.id;
  }

  for (const r of mcqCorrectByTitulo) {
    const { rama, libro, titulo } = r.mcq;
    const k = progressKey(rama, libro, titulo);
    ensureKey(k);
    statsMap[k].mcqOk += 1;
  }

  for (const g of tfByTitulo) {
    const k = progressKey(g.rama, g.libro, g.titulo);
    ensureKey(k);
    statsMap[k].tfTotal = g._count.id;
  }

  for (const r of tfCorrectByTitulo) {
    const { rama, libro, titulo } = r.trueFalse;
    const k = progressKey(rama, libro, titulo);
    ensureKey(k);
    statsMap[k].tfOk += 1;
  }

  // ── Build serialisable curriculum with progress ─────────────────
  const materias = Object.entries(CURRICULUM).map(([ramaKey, rama]) => {
    let ramaFcTotal = 0, ramaFcDom = 0;
    let ramaMcqTotal = 0, ramaMcqOk = 0;
    let ramaTfTotal = 0, ramaTfOk = 0;

    const libros = rama.secciones.map((sec) => {
      let libroFcTotal = 0, libroFcDom = 0;
      let libroMcqTotal = 0, libroMcqOk = 0;
      let libroTfTotal = 0, libroTfOk = 0;

      const titulos = sec.titulos.map((t) => {
        const k = progressKey(ramaKey, sec.libro, t.id);
        const s = statsMap[k] || { fcTotal: 0, fcDom: 0, mcqTotal: 0, mcqOk: 0, tfTotal: 0, tfOk: 0 };

        libroFcTotal += s.fcTotal;
        libroFcDom += s.fcDom;
        libroMcqTotal += s.mcqTotal;
        libroMcqOk += s.mcqOk;
        libroTfTotal += s.tfTotal;
        libroTfOk += s.tfOk;

        const total = s.fcTotal + s.mcqTotal + s.tfTotal;
        const done = s.fcDom + s.mcqOk + s.tfOk;

        return {
          id: t.id,
          label: t.label,
          articulosRef: t.articulosRef ?? null,
          parrafos: t.parrafos ?? [],
          fcTotal: s.fcTotal,
          fcDom: s.fcDom,
          mcqTotal: s.mcqTotal,
          mcqOk: s.mcqOk,
          tfTotal: s.tfTotal,
          tfOk: s.tfOk,
          percent: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      });

      ramaFcTotal += libroFcTotal;
      ramaFcDom += libroFcDom;
      ramaMcqTotal += libroMcqTotal;
      ramaMcqOk += libroMcqOk;
      ramaTfTotal += libroTfTotal;
      ramaTfOk += libroTfOk;

      const libroTotal = libroFcTotal + libroMcqTotal + libroTfTotal;
      const libroDone = libroFcDom + libroMcqOk + libroTfOk;

      return {
        id: sec.id,
        libro: sec.libro,
        label: sec.label,
        titulos,
        fcTotal: libroFcTotal,
        mcqTotal: libroMcqTotal,
        tfTotal: libroTfTotal,
        percent: libroTotal > 0 ? Math.round((libroDone / libroTotal) * 100) : 0,
      };
    });

    const ramaTotal = ramaFcTotal + ramaMcqTotal + ramaTfTotal;
    const ramaDone = ramaFcDom + ramaMcqOk + ramaTfOk;

    return {
      id: ramaKey,
      label: rama.label,
      libros,
      fcTotal: ramaFcTotal,
      mcqTotal: ramaMcqTotal,
      tfTotal: ramaTfTotal,
      percent: ramaTotal > 0 ? Math.round((ramaDone / ramaTotal) * 100) : 0,
    };
  });

  return (
    <main
      className="min-h-screen pb-20 lg:pb-6"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <IndiceMaestroClient materias={materias} />
    </main>
  );
}
