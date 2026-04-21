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
  const libro = searchParams.get("libro");
  const titulo = searchParams.get("titulo");

  // 3. Build where clause — respeta ramasAdicionales (Fase 7)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { activo: true };
  const ramaFilter = buildRamaFilter(rama);
  if (ramaFilter) Object.assign(where, ramaFilter);
  if (libro && libro !== "ALL") where.libro = libro;
  if (titulo && titulo !== "ALL") where.titulo = titulo;

  // 4. Fetch items
  const items = await prisma.fillBlank.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // 5. Map & shuffle options per blank (never expose correcta)
  const mapped = items.map((item) => {
    const blancos = JSON.parse(item.blancos);
    const blancosShuffled = blancos.map((b: { id: number; opciones: string[] }) => ({
      id: b.id,
      opciones: [...b.opciones].sort(() => Math.random() - 0.5),
    }));
    return {
      id: item.id,
      textoConBlancos: item.textoConBlancos,
      blancos: blancosShuffled,
      rama: item.rama,
      libro: item.libro,
      titulo: item.titulo,
      materia: item.materia,
      dificultad: item.dificultad,
    };
  });

  return NextResponse.json({ items: mapped });
}
