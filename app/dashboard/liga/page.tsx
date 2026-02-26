import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { prisma } from "@/lib/prisma";
import {
  TIER_LABELS,
  TIER_EMOJIS,
  getDaysRemaining,
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

  // Fetch miembros de la liga ordenados por weeklyXp DESC
  const members = await prisma.leagueMember.findMany({
    where: { leagueId: membership.leagueId },
    orderBy: { weeklyXp: "desc" },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const serializedMembers = members.map((m, idx) => ({
    position: idx + 1,
    userId: m.user.id,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    weeklyXp: m.weeklyXp,
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
    />
  );
}
