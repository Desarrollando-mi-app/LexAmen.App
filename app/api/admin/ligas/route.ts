import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Get current week leagues
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
  weekStart.setHours(0, 0, 0, 0);

  const currentLeagues = await prisma.league.findMany({
    where: {
      weekStart: { gte: weekStart },
    },
    include: {
      members: {
        orderBy: { weeklyXp: "desc" },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { tier: "asc" },
  });

  const tiers = currentLeagues.map((l) => ({
    tier: l.tier,
    memberCount: l.members.length,
    avgXp:
      l.members.length > 0
        ? l.members.reduce((s, m) => s + m.weeklyXp, 0) / l.members.length
        : 0,
    topUser: l.members[0]
      ? {
          firstName: l.members[0].user.firstName,
          lastName: l.members[0].user.lastName,
          weeklyXp: l.members[0].weeklyXp,
        }
      : null,
  }));

  // History: last 20 leagues
  const history = await prisma.league.findMany({
    orderBy: { weekStart: "desc" },
    take: 20,
    include: {
      _count: { select: { members: true } },
    },
  });

  const currentWeek = currentLeagues.length > 0
    ? {
        weekStart: currentLeagues[0].weekStart.toISOString(),
        weekEnd: currentLeagues[0].weekEnd.toISOString(),
      }
    : null;

  return NextResponse.json({
    currentWeek,
    tiers,
    history: history.map((h) => ({
      id: h.id,
      tier: h.tier,
      weekStart: h.weekStart.toISOString(),
      weekEnd: h.weekEnd.toISOString(),
      memberCount: h._count.members,
    })),
  });
}

// POST: manually process week (assign ranks)
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Get current week leagues
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  const leagues = await prisma.league.findMany({
    where: { weekStart: { gte: weekStart } },
    include: {
      members: { orderBy: { weeklyXp: "desc" } },
    },
  });

  // Assign ranks
  for (const league of leagues) {
    for (let i = 0; i < league.members.length; i++) {
      await prisma.leagueMember.update({
        where: { id: league.members[i].id },
        data: { rank: i + 1 },
      });
    }
  }

  await prisma.adminLog.create({
    data: {
      adminId: authUser.id,
      action: "PROCESS_LEAGUE_WEEK",
      target: weekStart.toISOString(),
      metadata: { leagueCount: leagues.length },
    },
  });

  return NextResponse.json({ ok: true, processed: leagues.length });
}
