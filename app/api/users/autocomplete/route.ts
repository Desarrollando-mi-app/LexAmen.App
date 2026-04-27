import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Autocompletado de usuarios para menciones ─────────────
//
// Query params:
//   q: prefijo a buscar (mínimo 1 char). Match por handle, firstName o
//      lastName (case-insensitive, ILIKE prefix).
//   limit: hasta 10 resultados (default 6)
//
// Devuelve usuarios con suficiente info para renderizar el dropdown:
// id, firstName, lastName, handle, avatarUrl, universidad.
// Prioriza:
//   1. Match exacto en handle
//   2. Handle empieza con q
//   3. firstName + lastName empieza con q
// (orden ya implícito en el ranking por relevancia abajo).

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limit")) || 6,
    10,
  );

  if (q.length < 1) {
    return NextResponse.json({ users: [] });
  }

  const qLower = q.toLowerCase();

  // Buscamos en handle (priority 1) + nombre (priority 2). Excluimos al
  // propio usuario para que no pueda autotaggearse.
  // Postgres ILIKE con prefix (q + '%') usa el index si lo hay;
  // suficiente para autocompletar en tiempo real.
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: authUser.id } },
        {
          OR: [
            { handle: { startsWith: qLower } },
            { firstName: { startsWith: q, mode: "insensitive" } },
            { lastName: { startsWith: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      handle: true,
      avatarUrl: true,
      universidad: true,
    },
    take: limit * 2, // pedimos extra para luego rankear y truncar
  });

  // Ranking: handle exacto > handle prefix > nombre prefix
  function rank(u: typeof users[number]): number {
    if (u.handle === qLower) return 0;
    if (u.handle?.startsWith(qLower)) return 1;
    if (u.firstName.toLowerCase().startsWith(qLower)) return 2;
    if (u.lastName.toLowerCase().startsWith(qLower)) return 3;
    return 4;
  }

  const ranked = [...users]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, limit);

  return NextResponse.json({ users: ranked });
}
