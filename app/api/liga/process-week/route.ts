import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPreviousWeekBounds,
  getCurrentWeekBounds,
  tierUp,
  tierDown,
} from "@/lib/league";

export async function POST(request: Request) {
  // 1. Seguridad: verificar CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { weekStart: prevWeekStart } = getPreviousWeekBounds();
  const { weekStart: newWeekStart, weekEnd: newWeekEnd } =
    getCurrentWeekBounds();

  // 2. Obtener ligas de la semana anterior
  const prevLeagues = await prisma.league.findMany({
    where: { weekStart: prevWeekStart },
    include: {
      members: {
        orderBy: { weeklyXp: "desc" },
        include: { user: { select: { id: true } } },
      },
    },
  });

  let promoted = 0;
  let demoted = 0;
  let maintained = 0;

  // 3. Procesar cada liga
  for (const league of prevLeagues) {
    const total = league.members.length;
    if (total === 0) continue;

    for (let i = 0; i < total; i++) {
      const member = league.members[i];
      const rank = i + 1;

      // Asignar rank final
      await prisma.leagueMember.update({
        where: { id: member.id },
        data: { rank },
      });

      // Determinar nuevo tier
      let newTier = league.tier;

      if (rank <= 5) {
        // Top 5 ascienden (si es posible)
        const up = tierUp(league.tier);
        if (up) {
          newTier = up as typeof league.tier;
          promoted++;
        } else {
          maintained++;
        }
      } else if (rank > total - 5) {
        // Bottom 5 descienden (si es posible)
        const down = tierDown(league.tier);
        if (down) {
          newTier = down as typeof league.tier;
          demoted++;
        } else {
          maintained++;
        }
      } else {
        maintained++;
      }

      // Crear membresía para nueva semana con tier actualizado
      // Buscar o crear liga con espacio
      const existingLeagues = await prisma.league.findMany({
        where: { tier: newTier, weekStart: newWeekStart },
        include: { _count: { select: { members: true } } },
      });

      let targetLeague = existingLeagues.find((l) => l._count.members < 30);

      if (!targetLeague) {
        targetLeague = await prisma.league.create({
          data: {
            tier: newTier,
            weekStart: newWeekStart,
            weekEnd: newWeekEnd,
          },
          include: { _count: { select: { members: true } } },
        });
      }

      // Crear membresía (ignorar si ya existe)
      await prisma.leagueMember
        .create({
          data: { userId: member.userId, leagueId: targetLeague.id },
        })
        .catch(() => {
          /* ya existe */
        });
    }
  }

  return NextResponse.json({
    processed: prevLeagues.length,
    promoted,
    demoted,
    maintained,
  });
}
