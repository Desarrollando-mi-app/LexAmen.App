import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds } from "@/lib/league";
import type { XpCategory } from "@/lib/xp-config";

// ─── GET /api/liga/desglose ─────────────────────────────────
// Query params:
//   periodo?: "semana" | "mes" | "todo" (default: "semana")
//
// Returns XP breakdown by category for the authenticated user.

const CATEGORIES: XpCategory[] = [
  "estudio",
  "simulacro",
  "causas",
  "publicaciones",
  "bonus",
];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo") || "semana";

  // Determine date range
  let desde: Date | null = null;

  if (periodo === "semana") {
    const { weekStart } = getCurrentWeekBounds();
    desde = weekStart;
  } else if (periodo === "mes") {
    desde = new Date();
    desde.setDate(desde.getDate() - 30);
    desde.setHours(0, 0, 0, 0);
  }
  // "todo" → no date filter

  // Build where clause
  const where: Record<string, unknown> = { userId: authUser.id };
  if (desde) {
    where.createdAt = { gte: desde };
  }

  // Get grouped XP by category
  const grouped = await prisma.xpLog.groupBy({
    by: ["category"],
    where,
    _sum: { amount: true },
  });

  // Build desglose object
  const desglose: Record<string, number> = {};
  let total = 0;

  for (const cat of CATEGORIES) {
    const entry = grouped.find((g) => g.category === cat);
    const amount = entry?._sum?.amount ?? 0;
    desglose[cat] = amount;
    total += amount;
  }

  // Get league ranking for weekly period
  let ranking: number | null = null;

  if (periodo === "semana") {
    const { weekStart } = getCurrentWeekBounds();

    const member = await prisma.leagueMember.findFirst({
      where: {
        userId: authUser.id,
        league: { weekStart },
      },
      select: { leagueId: true, weeklyXp: true },
    });

    if (member) {
      const higherCount = await prisma.leagueMember.count({
        where: {
          leagueId: member.leagueId,
          weeklyXp: { gt: member.weeklyXp },
        },
      });
      ranking = higherCount + 1;
    }
  }

  return NextResponse.json({
    total,
    ranking,
    periodo,
    desglose,
  });
}
