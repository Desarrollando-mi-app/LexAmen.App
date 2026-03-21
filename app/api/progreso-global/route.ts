import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CURRICULUM, RAMA_LABELS } from "@/lib/curriculum-data";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Get all distinct (rama, libro, titulo) combinations where user has correct attempts
  // across all study modules
  const [flashcardTitulos, mcqTitulos, tfTitulos, /* defTitulos */] = await Promise.all([
    // Flashcards: mastered (repetitions >= 3)
    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id, repetitions: { gte: 1 } },
      select: { flashcard: { select: { rama: true, libro: true, titulo: true } } },
    }),
    // MCQ: at least 1 correct
    prisma.userMCQAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true },
      select: { mcq: { select: { rama: true, libro: true, titulo: true } } },
      distinct: ["mcqId"],
    }),
    // TrueFalse: at least 1 correct
    prisma.userTrueFalseAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true },
      select: { trueFalse: { select: { rama: true, libro: true, titulo: true } } },
      distinct: ["trueFalseId"],
    }),
    // Definiciones: at least 1 correct
    prisma.definicionIntento.findMany({
      where: { userId: authUser.id, correcta: true },
      select: { definicion: { select: { rama: true } } },
      distinct: ["definicionId"],
    }),
  ]);

  // Build set of covered titles
  const coveredSet = new Set<string>();

  for (const fp of flashcardTitulos) {
    const f = fp.flashcard;
    if (f.rama && f.libro && f.titulo) {
      coveredSet.add(`${f.rama}|${f.libro}|${f.titulo}`);
    }
  }
  for (const ma of mcqTitulos) {
    const m = ma.mcq;
    if (m.rama && m.libro && m.titulo) {
      coveredSet.add(`${m.rama}|${m.libro}|${m.titulo}`);
    }
  }
  for (const ta of tfTitulos) {
    const t = ta.trueFalse;
    if (t.rama && t.libro && t.titulo) {
      coveredSet.add(`${t.rama}|${t.libro}|${t.titulo}`);
    }
  }
  // Definiciones only have rama, not libro/titulo — count as rama-level coverage
  // (they contribute to the rama but not to specific titulo)

  // Calculate progress from curriculum structure
  let globalTotal = 0;
  let globalCubiertos = 0;

  const porCodigo = Object.entries(CURRICULUM).map(([ramaKey, rama]) => {
    let ramaCubiertos = 0;
    let ramaTotal = 0;

    const libros = rama.secciones.map((seccion) => {
      let libroCubiertos = 0;
      const libroTotal = seccion.titulos.length;
      ramaTotal += libroTotal;

      for (const titulo of seccion.titulos) {
        const key = `${ramaKey}|${seccion.libro}|${titulo.id}`;
        if (coveredSet.has(key)) {
          libroCubiertos++;
        }
      }

      ramaCubiertos += libroCubiertos;

      return {
        libro: seccion.libro,
        label: seccion.label,
        titulosCubiertos: libroCubiertos,
        titulosTotales: libroTotal,
        porcentaje: libroTotal > 0 ? Math.round((libroCubiertos / libroTotal) * 100) : 0,
      };
    });

    globalTotal += ramaTotal;
    globalCubiertos += ramaCubiertos;

    return {
      rama: ramaKey,
      label: RAMA_LABELS[ramaKey] ?? rama.label,
      titulosCubiertos: ramaCubiertos,
      titulosTotales: ramaTotal,
      porcentaje: ramaTotal > 0 ? Math.round((ramaCubiertos / ramaTotal) * 100) : 0,
      libros,
    };
  });

  return NextResponse.json({
    global: {
      titulosCubiertos: globalCubiertos,
      titulosTotales: globalTotal,
      porcentaje: globalTotal > 0 ? Math.round((globalCubiertos / globalTotal) * 100) : 0,
    },
    porCodigo,
  });
}
