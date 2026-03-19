import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

  // 3. Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { activo: true };
  if (rama && rama !== "ALL") where.rama = rama;

  // 4. Fetch items
  const items = await prisma.orderSequence.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // 5. Map & shuffle items (never expose correct orden)
  const mapped = items.map((item) => {
    const parsedItems: { id: number; texto: string; orden: number }[] = JSON.parse(item.items);
    // Shuffle the items randomly — strip the correct orden
    const shuffled = parsedItems
      .map((i) => ({ id: i.id, texto: i.texto }))
      .sort(() => Math.random() - 0.5);

    return {
      id: item.id,
      titulo: item.titulo,
      instruccion: item.instruccion,
      items: shuffled,
      rama: item.rama,
      libro: item.libro,
      tituloMateria: item.tituloMateria,
      materia: item.materia,
      dificultad: item.dificultad,
    };
  });

  return NextResponse.json({ items: mapped });
}
