import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const rama = searchParams.get("rama");

  if (!rama) {
    return NextResponse.json({ error: "Parámetro 'rama' requerido" }, { status: 400 });
  }

  const libro = searchParams.get("libro");
  const titulo = searchParams.get("titulo");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build materia filter: match XpLog entries where materia contains the rama/libro/titulo
  const materiaFilter: string[] = [rama];
  if (libro) materiaFilter.push(libro);
  if (titulo) materiaFilter.push(titulo);

  // Get XP grouped by user for this materia
  const grouped = await prisma.xpLog.groupBy({
    by: ["userId"],
    where: {
      category: { in: ["estudio", "simulacro"] },
      amount: { gt: 0 },
      materia: { contains: rama, mode: "insensitive" },
      ...(libro ? { materia: { contains: libro, mode: "insensitive" } } : {}),
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    skip,
    take: limit,
  });

  // Get total count
  const totalGrouped = await prisma.xpLog.groupBy({
    by: ["userId"],
    where: {
      category: { in: ["estudio", "simulacro"] },
      amount: { gt: 0 },
      materia: { contains: rama, mode: "insensitive" },
      ...(libro ? { materia: { contains: libro, mode: "insensitive" } } : {}),
    },
  });
  const total = totalGrouped.length;

  // Fetch user details
  const userIds = grouped.map((g) => g.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, deletedAt: null, visibleEnRanking: true },
    select: {
      id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const ranking = grouped
    .filter((g) => userMap.has(g.userId))
    .map((g, i) => {
      const user = userMap.get(g.userId)!;
      return {
        rank: skip + i + 1,
        userId: g.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        universidad: user.universidad,
        xpMateria: g._sum.amount ?? 0,
      };
    });

  // Get user's position if logged in
  let miPosicion: number | null = null;
  if (authUser) {
    const myXp = await prisma.xpLog.aggregate({
      where: {
        userId: authUser.id,
        category: { in: ["estudio", "simulacro"] },
        amount: { gt: 0 },
        materia: { contains: rama, mode: "insensitive" },
        ...(libro ? { materia: { contains: libro, mode: "insensitive" } } : {}),
      },
      _sum: { amount: true },
    });

    if (myXp._sum.amount && myXp._sum.amount > 0) {
      const higherCount = await prisma.xpLog.groupBy({
        by: ["userId"],
        where: {
          category: { in: ["estudio", "simulacro"] },
          amount: { gt: 0 },
          materia: { contains: rama, mode: "insensitive" },
          ...(libro ? { materia: { contains: libro, mode: "insensitive" } } : {}),
        },
        _sum: { amount: true },
        having: { amount: { _sum: { gt: myXp._sum.amount } } },
      });
      miPosicion = higherCount.length + 1;
    }
  }

  return NextResponse.json({
    ranking,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    materia: rama + (libro ? ` > ${libro}` : "") + (titulo ? ` > ${titulo}` : ""),
    miPosicion,
  });
}
