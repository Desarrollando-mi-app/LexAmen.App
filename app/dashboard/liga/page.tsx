import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { prisma } from "@/lib/prisma";
import {
  GRADOS,
  NIVELES,
  getGradoInfo,
  getSiguienteGrado,
  getProgresoGrado,
  getDaysRemaining,
  getCurrentWeekBounds,
  PROMOTION_SPOTS,
  RELEGATION_SPOTS,
} from "@/lib/league";
import { LigaViewer } from "./liga-viewer";

export default async function LigaPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Asegurar membresía (lazy)
  const membership = await ensureLeagueMembership(authUser.id);

  const { weekStart } = getCurrentWeekBounds();

  // Fetch datos del usuario + miembros + desglose + historial en paralelo
  const [userData, members, xpGrouped, historicalMemberships] = await Promise.all([
    // User data (grado, xp)
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { xp: true, grado: true, visibleEnLiga: true },
    }),

    // Miembros de la liga actual
    prisma.leagueMember.findMany({
      where: { leagueId: membership.leagueId },
      orderBy: { weeklyXp: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            visibleEnLiga: true,
            grado: true,
          },
        },
      },
    }),

    // Desglose XP de la semana actual
    prisma.xpLog.groupBy({
      by: ["category"],
      where: {
        userId: authUser.id,
        createdAt: { gte: weekStart },
      },
      _sum: { amount: true },
    }),

    // Últimas 8 ligas históricas (excluyendo la actual)
    prisma.leagueMember.findMany({
      where: {
        userId: authUser.id,
        league: { weekStart: { lt: weekStart } },
      },
      orderBy: { league: { weekStart: "desc" } },
      take: 8,
      include: {
        league: {
          select: {
            gradoRef: true,
            weekStart: true,
            weekEnd: true,
          },
        },
      },
    }),
  ]);

  const userGrado = userData?.grado ?? 1;
  const userXp = userData?.xp ?? 0;
  const myVisibleEnLiga = userData?.visibleEnLiga ?? true;
  const gradoInfo = getGradoInfo(userGrado);
  const siguienteGrado = getSiguienteGrado(userGrado);
  const progresoGrado = getProgresoGrado(userXp, userGrado);

  // Serializar miembros
  const maxXp = members.length > 0 ? Math.max(...members.map((m) => m.weeklyXp), 1) : 1;
  const serializedMembers = members.map((m, idx) => {
    const isMe = m.user.id === authUser.id;
    const visible = m.user.visibleEnLiga || isMe;
    return {
      position: idx + 1,
      userId: m.user.id,
      firstName: visible ? m.user.firstName : "Estudiante",
      lastName: visible ? m.user.lastName : "anónimo",
      avatarUrl: visible ? m.user.avatarUrl : null,
      weeklyXp: m.weeklyXp,
      grado: m.user.grado,
    };
  });

  // Construir desglose
  const CATEGORIES = ["estudio", "simulacro", "causas", "publicaciones", "bonus"] as const;
  const desglose: Record<string, number> = {};
  let totalXpSemanal = 0;
  for (const cat of CATEGORIES) {
    const entry = xpGrouped.find((g) => g.category === cat);
    const amount = entry?._sum?.amount ?? 0;
    desglose[cat] = amount;
    totalXpSemanal += amount;
  }

  // Mi posición
  const myPosition = serializedMembers.find((m) => m.userId === authUser.id)?.position ?? null;

  // Historial serializado con grado info
  const historial = historicalMemberships.map((hm) => {
    const g = getGradoInfo(hm.league.gradoRef);
    return {
      gradoRef: hm.league.gradoRef,
      gradoNombre: g.nombre,
      gradoEmoji: g.emoji,
      nivelLabel: NIVELES[g.nivel]?.label ?? g.nivel,
      weekStart: hm.league.weekStart.toISOString(),
      weeklyXp: hm.weeklyXp,
      rank: hm.rank,
    };
  });

  return (
    <LigaViewer
      // User grado info
      userGrado={userGrado}
      gradoNombre={gradoInfo.nombre}
      gradoEmoji={gradoInfo.emoji}
      gradoColor={gradoInfo.color}
      nivelLabel={NIVELES[gradoInfo.nivel]?.label ?? gradoInfo.nivel}
      nivelKey={gradoInfo.nivel}
      userXp={userXp}
      xpSiguienteGrado={siguienteGrado?.xpMinimo ?? null}
      xpGradoActual={gradoInfo.xpMinimo}
      siguienteGradoNombre={siguienteGrado?.nombre ?? null}
      siguienteGradoNum={siguienteGrado?.grado ?? null}
      progresoGrado={progresoGrado}
      // All 33 grados for the visual bar
      grados={GRADOS.map(g => ({
        grado: g.grado,
        nombre: g.nombre,
        nivel: g.nivel,
        emoji: g.emoji,
        color: g.color,
        xpMinimo: g.xpMinimo,
      }))}
      niveles={Object.entries(NIVELES).map(([key, val]) => ({
        key,
        label: val.label,
        grados: val.grados,
        color: val.color,
      }))}
      // Liga semanal
      daysRemaining={getDaysRemaining()}
      userId={authUser.id}
      members={serializedMembers}
      maxXp={maxXp}
      desglose={desglose}
      totalXpSemanal={totalXpSemanal}
      myPosition={myPosition}
      promotionSpots={PROMOTION_SPOTS}
      relegationSpots={RELEGATION_SPOTS}
      historial={historial}
      visibleEnLiga={myVisibleEnLiga}
    />
  );
}
