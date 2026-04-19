import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { prisma } from "@/lib/prisma";
import {
  getDaysRemaining,
  getCurrentWeekBounds,
  PROMOTION_SPOTS,
  RELEGATION_SPOTS,
  getGradoInfo,
} from "@/lib/league";
import {
  LEAGUE_TIERS,
  computePercentile,
  getTogaTierByPercentile,
  getNextTogaTier,
  getXpToNextTier,
} from "@/lib/la-toga";
import { LaTogaViewer } from "./la-toga-viewer";

export default async function LaTogaPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const membership = await ensureLeagueMembership(authUser.id);
  const { weekStart } = getCurrentWeekBounds();

  const [userData, members, xpGrouped, allWeeklyMembers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { visibleEnLiga: true, grado: true },
    }),

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

    prisma.xpLog.groupBy({
      by: ["category"],
      where: { userId: authUser.id, createdAt: { gte: weekStart } },
      _sum: { amount: true },
    }),

    prisma.leagueMember.findMany({
      where: { league: { weekStart } },
      select: { weeklyXp: true },
    }),
  ]);

  const myVisibleEnLiga = userData?.visibleEnLiga ?? true;
  const myGradoNum = userData?.grado ?? 1;
  const myGradoInfo = getGradoInfo(myGradoNum);

  const maxXp =
    members.length > 0 ? Math.max(...members.map((m) => m.weeklyXp), 1) : 1;
  const allWeeklyXpValues = allWeeklyMembers.map((m) => m.weeklyXp);

  const serializedMembers = members.map((m, idx) => {
    const isMe = m.user.id === authUser.id;
    const visible = m.user.visibleEnLiga || isMe;
    const pct = computePercentile(m.weeklyXp, allWeeklyXpValues);
    const tier = getTogaTierByPercentile(pct);
    return {
      position: idx + 1,
      userId: m.user.id,
      firstName: visible ? m.user.firstName : "Estudiante",
      lastName: visible ? m.user.lastName : "anónimo",
      avatarUrl: visible ? m.user.avatarUrl : null,
      weeklyXp: m.weeklyXp,
      grado: m.user.grado,
      togaTierId: tier.id,
      togaTierName: tier.nombre,
      togaTierEmoji: tier.emoji,
    };
  });

  const CATEGORIES = [
    "estudio",
    "simulacro",
    "causas",
    "publicaciones",
    "bonus",
  ] as const;
  const desglose: Record<string, number> = {};
  let totalXpSemanal = 0;
  for (const cat of CATEGORIES) {
    const entry = xpGrouped.find((g) => g.category === cat);
    const amount = entry?._sum?.amount ?? 0;
    desglose[cat] = amount;
    totalXpSemanal += amount;
  }

  const myPosition =
    serializedMembers.find((m) => m.userId === authUser.id)?.position ?? null;

  const myWeeklyXp =
    members.find((m) => m.user.id === authUser.id)?.weeklyXp ?? 0;
  const myPercentile = computePercentile(myWeeklyXp, allWeeklyXpValues);
  const myTogaTier = getTogaTierByPercentile(myPercentile);
  const nextTogaTier = getNextTogaTier(myTogaTier.id);
  const xpToNextTier = getXpToNextTier(
    myWeeklyXp,
    allWeeklyXpValues,
    myTogaTier.id
  );
  const totalActiveUsers = allWeeklyMembers.length;

  return (
    <LaTogaViewer
      daysRemaining={getDaysRemaining()}
      userId={authUser.id}
      members={serializedMembers}
      maxXp={maxXp}
      desglose={desglose}
      totalXpSemanal={totalXpSemanal}
      myPosition={myPosition}
      promotionSpots={PROMOTION_SPOTS}
      relegationSpots={RELEGATION_SPOTS}
      visibleEnLiga={myVisibleEnLiga}
      togaTiers={LEAGUE_TIERS}
      myTogaTier={myTogaTier}
      myPercentile={myPercentile}
      nextTogaTier={nextTogaTier}
      xpToNextTier={xpToNextTier}
      totalActiveUsers={totalActiveUsers}
      userGradoEmoji={myGradoInfo.emoji}
      userGradoNombre={myGradoInfo.nombre}
      userGradoNum={myGradoNum}
    />
  );
}
