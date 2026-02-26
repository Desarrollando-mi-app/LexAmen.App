import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { prisma } from "@/lib/prisma";
import { TIER_LABELS, TIER_EMOJIS, getDaysRemaining } from "@/lib/league";

export async function GET() {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Asegurar membresía (lazy)
  const membership = await ensureLeagueMembership(authUser.id);

  // 3. Fetch miembros de la liga ordenados por weeklyXp DESC
  const members = await prisma.leagueMember.findMany({
    where: { leagueId: membership.leagueId },
    orderBy: { weeklyXp: "desc" },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // 4. Retornar ranking
  return NextResponse.json({
    tier: membership.league.tier,
    tierLabel: TIER_LABELS[membership.league.tier] ?? membership.league.tier,
    tierEmoji: TIER_EMOJIS[membership.league.tier] ?? "",
    weekStart: membership.league.weekStart.toISOString(),
    weekEnd: membership.league.weekEnd.toISOString(),
    daysRemaining: getDaysRemaining(),
    userId: authUser.id,
    members: members.map((m, idx) => ({
      position: idx + 1,
      userId: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      weeklyXp: m.weeklyXp,
    })),
  });
}
