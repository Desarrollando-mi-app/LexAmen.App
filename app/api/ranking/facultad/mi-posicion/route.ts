import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ranking/facultad/mi-posicion
 *
 * Retorna la posición del usuario actual en su universidad y sede.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { universidad: true, sede: true, xp: true },
  });

  if (!user || !user.universidad) {
    return NextResponse.json({
      universidad: null,
      sede: null,
      rankInUniversidad: null,
      rankInSede: null,
      totalInUniversidad: 0,
      totalInSede: 0,
    });
  }

  // Posición en toda la universidad
  const [rankInUniversidad, totalInUniversidad] = await Promise.all([
    prisma.user.count({
      where: {
        universidad: user.universidad,
        deletedAt: null,
        suspended: false,
        xp: { gt: user.xp },
      },
    }),
    prisma.user.count({
      where: {
        universidad: user.universidad,
        deletedAt: null,
        suspended: false,
      },
    }),
  ]);

  let rankInSede: number | null = null;
  let totalInSede = 0;

  if (user.sede) {
    const [sedeRank, sedeTotal] = await Promise.all([
      prisma.user.count({
        where: {
          universidad: user.universidad,
          sede: user.sede,
          deletedAt: null,
          suspended: false,
          xp: { gt: user.xp },
        },
      }),
      prisma.user.count({
        where: {
          universidad: user.universidad,
          sede: user.sede,
          deletedAt: null,
          suspended: false,
        },
      }),
    ]);
    rankInSede = sedeRank + 1;
    totalInSede = sedeTotal;
  }

  return NextResponse.json({
    universidad: user.universidad,
    sede: user.sede,
    rankInUniversidad: rankInUniversidad + 1,
    totalInUniversidad,
    rankInSede,
    totalInSede,
  });
}
