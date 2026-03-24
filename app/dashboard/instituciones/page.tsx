import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { InstitucionesClient } from "./instituciones-client";

export const metadata = {
  title: "Instituciones Jurídicas — Studio Iuris",
};

export default async function InstitucionesPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Get all instituciones with exercise counts
  const instituciones = await prisma.institucionJuridica.findMany({
    orderBy: { orden: "asc" },
    select: {
      id: true,
      nombre: true,
      area: true,
      grupo: true,
      descripcion: true,
      tag: true,
      orden: true,
      articulosCC: true,
      articulosCPC: true,
      articulosCOT: true,
      _count: {
        select: {
          flashcards: true,
          mcqs: true,
          trueFalses: true,
          definiciones: true,
          fillBlanks: true,
          errorIdentifications: true,
          orderSequences: true,
          matchColumns: true,
          casoPracticos: true,
          dictados: true,
          timelines: true,
        },
      },
    },
  });

  // Get user progress per institution (count distinct exercises completed)
  const [fcDone, mcqDone, tfDone] = await Promise.all([
    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id, repetitions: { gte: 1 } },
      select: { flashcard: { select: { institucionId: true } } },
    }),
    prisma.userMCQAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true },
      select: { mcq: { select: { institucionId: true } } },
      distinct: ["mcqId"],
    }),
    prisma.userTrueFalseAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true },
      select: { trueFalse: { select: { institucionId: true } } },
      distinct: ["trueFalseId"],
    }),
  ]);

  // Count done per institution
  const doneMap: Record<number, number> = {};
  for (const r of fcDone) {
    if (r.flashcard.institucionId) doneMap[r.flashcard.institucionId] = (doneMap[r.flashcard.institucionId] || 0) + 1;
  }
  for (const r of mcqDone) {
    if (r.mcq.institucionId) doneMap[r.mcq.institucionId] = (doneMap[r.mcq.institucionId] || 0) + 1;
  }
  for (const r of tfDone) {
    if (r.trueFalse.institucionId) doneMap[r.trueFalse.institucionId] = (doneMap[r.trueFalse.institucionId] || 0) + 1;
  }

  const data = instituciones.map((inst) => {
    const totalExercicios =
      inst._count.flashcards + inst._count.mcqs + inst._count.trueFalses +
      inst._count.definiciones + inst._count.fillBlanks + inst._count.errorIdentifications +
      inst._count.orderSequences + inst._count.matchColumns + inst._count.casoPracticos +
      inst._count.dictados + inst._count.timelines;

    const done = doneMap[inst.id] || 0;
    const percent = totalExercicios > 0 ? Math.min(Math.round((done / totalExercicios) * 100), 100) : 0;

    return {
      id: inst.id,
      nombre: inst.nombre,
      area: inst.area,
      grupo: inst.grupo,
      descripcion: inst.descripcion,
      tag: inst.tag,
      articulosCC: inst.articulosCC,
      articulosCPC: inst.articulosCPC,
      articulosCOT: inst.articulosCOT,
      totalExercicios,
      done,
      percent,
    };
  });

  return (
    <main className="min-h-screen pb-20 lg:pb-6" style={{ backgroundColor: "var(--gz-cream)" }}>
      <InstitucionesClient instituciones={data} />
    </main>
  );
}
