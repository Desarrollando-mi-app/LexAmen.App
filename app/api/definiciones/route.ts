import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildRamaFilter } from "@/lib/rama-filter";

/**
 * GET /api/definiciones
 * Devuelve todas las definiciones activas con sus opciones barajadas.
 * Query params opcionales: rama, libro, titulo
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
  const libro = searchParams.get("libro");
  const titulo = searchParams.get("titulo");

  // Build filter — respeta ramasAdicionales (Fase 7)
  const where: Record<string, unknown> = { isActive: true, ...buildRamaFilter(rama) };
  if (libro) where.libro = libro;
  if (titulo) where.titulo = titulo;

  const definiciones = await prisma.definicion.findMany({
    where,
    orderBy: { id: "asc" },
  });

  // For each definition, build shuffled options array
  const mapped = definiciones.map((d) => {
    const options = [
      { key: "A", text: d.concepto },
      { key: "B", text: d.distractor1 },
      { key: "C", text: d.distractor2 },
      { key: "D", text: d.distractor3 },
    ];
    // Fisher-Yates shuffle
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    // Find correct key after shuffle
    const correctKey = options.find((o) => o.text === d.concepto)!.key;

    return {
      id: d.id,
      definicion: d.definicion,
      options,
      correctKey,
      explicacion: d.explicacion,
      articuloRef: d.articuloRef,
      rama: d.rama,
      libro: d.libro,
      titulo: d.titulo,
    };
  });

  return NextResponse.json({ definiciones: mapped });
}
