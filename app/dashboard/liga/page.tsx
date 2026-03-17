import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { prisma } from "@/lib/prisma";
import {
  TIER_LABELS,
  TIER_EMOJIS,
  TIER_ORDER,
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

  // Fetch miembros de la liga + desglose + historial en paralelo
  const [members, xpGrouped, historicalMemberships] = await Promise.all([
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
            tier: true,
            weekStart: true,
            weekEnd: true,
          },
        },
      },
    }),
  ]);

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

  // Mi posición y visibilidad
  const myPosition = serializedMembers.find((m) => m.userId === authUser.id)?.position ?? null;
  const myVisibleEnLiga = members.find((m) => m.user.id === authUser.id)?.user.visibleEnLiga ?? true;

  // Tier index para saber si puede subir/bajar
  const currentTierIndex = TIER_ORDER.indexOf(membership.league.tier as typeof TIER_ORDER[number]);

  // Historial serializado
  const historial = historicalMemberships.map((hm) => ({
    tier: hm.league.tier,
    tierLabel: TIER_LABELS[hm.league.tier] ?? hm.league.tier,
    tierEmoji: TIER_EMOJIS[hm.league.tier] ?? "",
    weekStart: hm.league.weekStart.toISOString(),
    weeklyXp: hm.weeklyXp,
    rank: hm.rank,
  }));

  return (
    <LigaViewer
      tier={membership.league.tier}
      tierLabel={TIER_LABELS[membership.league.tier] ?? membership.league.tier}
      tierEmoji={TIER_EMOJIS[membership.league.tier] ?? ""}
      weekStart={membership.league.weekStart.toISOString()}
      weekEnd={membership.league.weekEnd.toISOString()}
      daysRemaining={getDaysRemaining()}
      userId={authUser.id}
      members={serializedMembers}
      maxXp={maxXp}
      desglose={desglose}
      totalXpSemanal={totalXpSemanal}
      myPosition={myPosition}
      currentTierIndex={currentTierIndex}
      maxTierIndex={TIER_ORDER.length - 1}
      promotionSpots={PROMOTION_SPOTS}
      relegationSpots={RELEGATION_SPOTS}
      historial={historial}
      visibleEnLiga={myVisibleEnLiga}
    />
  );
}
