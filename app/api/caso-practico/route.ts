import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildRamaFilter } from "@/lib/rama-filter";

/**
 * GET /api/caso-practico — fetch active casos practicos
 * Supports ?rama=DERECHO_CIVIL filter
 * Returns preguntas with options shuffled and correcta index NOT revealed
 */
export async function GET(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Parse optional rama filter
  const { searchParams } = new URL(request.url);
  const rama = searchParams.get("rama");

  // 3. Fetch active casos — respeta ramasAdicionales (Fase 7)
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const where = { activo: true, ...buildRamaFilter(rama) };

  const casos = await prisma.casoPractico.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // 4. Parse preguntas and shuffle options (without revealing correcta)
  const items = casos.map((caso) => {
    let preguntas: any[] = [];
    try {
      preguntas = JSON.parse(caso.preguntas);
    } catch {
      preguntas = [];
    }

    // Shuffle options per question, don't reveal correcta index
    const shuffledPreguntas = preguntas.map((p: any) => {
      const opciones = [...(p.opciones || [])];
      // Fisher-Yates shuffle
      for (let i = opciones.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
      }

      return {
        id: p.id,
        tipo: p.tipo,
        pregunta: p.pregunta,
        opciones,
        // correcta index is NOT sent to client
      };
    });

    return {
      id: caso.id,
      titulo: caso.titulo,
      hechos: caso.hechos,
      preguntas: shuffledPreguntas,
      resumenFinal: caso.resumenFinal,
      rama: caso.rama,
      libro: caso.libro,
      tituloMateria: caso.tituloMateria,
      materia: caso.materia,
      dificultad: caso.dificultad,
    };
  });

  return NextResponse.json({ items });
}
