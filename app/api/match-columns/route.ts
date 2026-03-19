import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/match-columns — list active MatchColumns exercises
 * Optional ?rama filter
 * Right column (derecha values) are shuffled per exercise
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rama = searchParams.get("rama");

  const where: Record<string, unknown> = { activo: true };
  if (rama && rama !== "ALL") where.rama = rama;

  const items = await prisma.matchColumns.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Parse pares JSON and shuffle the derecha values
  const mapped = items.map((item) => {
    const pares: { id: number; izquierda: string; derecha: string }[] =
      JSON.parse(item.pares);

    // Shuffle derecha values using Fisher-Yates
    const derechaValues = pares.map((p) => ({
      id: p.id,
      derecha: p.derecha,
    }));
    for (let i = derechaValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [derechaValues[i], derechaValues[j]] = [
        derechaValues[j],
        derechaValues[i],
      ];
    }

    return {
      id: item.id,
      titulo: item.titulo,
      instruccion: item.instruccion,
      // Left column stays in original order
      izquierda: pares.map((p) => ({ id: p.id, texto: p.izquierda })),
      // Right column shuffled
      derecha: derechaValues.map((d) => ({ id: d.id, texto: d.derecha })),
      columnaIzqLabel: item.columnaIzqLabel,
      columnaDerLabel: item.columnaDerLabel,
      explicacion: item.explicacion,
      rama: item.rama,
      libro: item.libro,
      tituloMateria: item.tituloMateria,
      materia: item.materia,
      dificultad: item.dificultad,
    };
  });

  return NextResponse.json({ items: mapped });
}
