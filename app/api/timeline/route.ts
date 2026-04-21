import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildRamaFilter } from "@/lib/rama-filter";

export async function GET(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Query params
  const { searchParams } = new URL(request.url);
  const rama = searchParams.get("rama");

  // 3. Build where clause — respeta ramasAdicionales (Fase 7)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { activo: true };
  const ramaFilter = buildRamaFilter(rama);
  if (ramaFilter) Object.assign(where, ramaFilter);

  // 4. Fetch timelines
  const timelines = await prisma.timeline.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // 5. Map — strip correct posicion from eventos
  const mapped = timelines.map((tl) => {
    const eventos: { id: number; texto: string; posicion: number; unidad: string; descripcion: string }[] =
      JSON.parse(tl.eventos);

    // Only return id, texto, unidad, descripcion — NOT posicion
    const eventosSafe = eventos.map((e) => ({
      id: e.id,
      texto: e.texto,
      unidad: e.unidad || "",
      descripcion: e.descripcion || "",
    }));

    return {
      id: tl.id,
      titulo: tl.titulo,
      instruccion: tl.instruccion,
      escala: tl.escala,
      rangoMin: tl.rangoMin,
      rangoMax: tl.rangoMax,
      eventos: eventosSafe,
      rama: tl.rama,
      libro: tl.libro,
      tituloMateria: tl.tituloMateria,
      materia: tl.materia,
      dificultad: tl.dificultad,
    };
  });

  return NextResponse.json({ items: mapped });
}
