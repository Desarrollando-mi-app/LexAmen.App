import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getPreviousWeekBounds,
  getCurrentWeekBounds,
  getGradoMaximoPorXp,
  PROMOTION_SPOTS,
  RELEGATION_SPOTS,
  MAX_LEAGUE_SIZE,
} from "@/lib/league";
import { sendNotification } from "@/lib/notifications";
import { evaluateBadges } from "@/lib/badges";

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
        include: { user: { select: { id: true, xp: true, grado: true } } },
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
      const userXp = member.user.xp;
      const userGrado = member.user.grado;

      // Asignar rank final
      await prisma.leagueMember.update({
        where: { id: member.id },
        data: { rank },
      });

      let newGrado = userGrado;

      if (rank <= PROMOTION_SPOTS) {
        // Top 3: suben 1 grado SI el XP lo permite
        const gradoMaximo = getGradoMaximoPorXp(userXp);
        if (userGrado < gradoMaximo.grado) {
          newGrado = Math.min(33, userGrado + 1);
          promoted++;
          sendNotification({
            type: "LEAGUE_RESULT",
            title: "¡Ascendiste de grado!",
            body: `Subiste al Grado ${newGrado}. ¡Sigue así!`,
            targetUserId: member.userId,
            metadata: { from: userGrado, to: newGrado, rank },
            sendEmail: true,
          }).catch(() => {});
        } else {
          // Already at XP ceiling
          maintained++;
        }
      } else if (rank > total - RELEGATION_SPOTS && total > RELEGATION_SPOTS) {
        // Bottom 3: bajan 1 grado (con piso)
        // Piso = max(1, gradoMaximoPorXp - 2)
        const gradoMaximo = getGradoMaximoPorXp(userXp);
        const piso = Math.max(1, gradoMaximo.grado - 2);
        if (userGrado > piso) {
          newGrado = Math.max(1, userGrado - 1);
          demoted++;
          sendNotification({
            type: "LEAGUE_RESULT",
            title: "Descendiste de grado",
            body: `Bajaste al Grado ${newGrado}. ¡La próxima será mejor!`,
            targetUserId: member.userId,
            metadata: { from: userGrado, to: newGrado, rank },
            sendEmail: false,
          }).catch(() => {});
        } else {
          maintained++;
        }
      } else {
        maintained++;
      }

      // Actualizar grado del usuario si cambió
      if (newGrado !== userGrado) {
        await prisma.user.update({
          where: { id: member.userId },
          data: { grado: newGrado },
        });
      }

      // Badge evaluation for grados
      evaluateBadges(member.userId, "grados").catch(() => {});

      // Crear membresía para nueva semana
      // Buscar liga con grado cercano y espacio
      const existingLeagues = await prisma.league.findMany({
        where: {
          weekStart: newWeekStart,
          gradoRef: { gte: Math.max(1, newGrado - 3), lte: Math.min(33, newGrado + 3) },
        },
        include: { _count: { select: { members: true } } },
      });

      let targetLeague = existingLeagues.find((l) => l._count.members < MAX_LEAGUE_SIZE);

      if (!targetLeague) {
        targetLeague = await prisma.league.create({
          data: {
            tier: "CARTON",
            gradoRef: newGrado,
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
