import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { buildRamaFilter } from "@/lib/rama-filter";

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

  // Filter — respeta ramasAdicionales (Fase 7)
  const where: Record<string, unknown> = { activo: true };
  const ramaFilter = buildRamaFilter(rama);
  if (ramaFilter) Object.assign(where, ramaFilter);

  const items = await prisma.errorIdentification.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Return segments but WITHOUT marking which are errors
  const mapped = items.map((item) => {
    const segmentos = JSON.parse(item.segmentos);
    // Only send id + texto for each segment, NOT esError/textoCorrecto/explicacion
    const segmentosSafe = segmentos.map((s: { id: number; texto: string }) => ({
      id: s.id,
      texto: s.texto,
    }));
    return {
      id: item.id,
      segmentos: segmentosSafe,
      totalErrores: item.totalErrores,
      rama: item.rama,
      libro: item.libro,
      titulo: item.titulo,
      materia: item.materia,
      dificultad: item.dificultad,
    };
  });

  return NextResponse.json({ items: mapped });
}
