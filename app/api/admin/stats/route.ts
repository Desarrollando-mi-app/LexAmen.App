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

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersMonth,
    newUsersWeek,
    premiumUsers,
    totalFlashcards,
    totalMCQs,
    totalTrueFalse,
    totalCausas,
    totalCausaRooms,
    totalAyudantias,
    recentActivity,
    registrationsByDay,
    activeUsersWeek,
    totalBadges,
    totalReports,
    pendingReports,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
    }),
    prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
    }),
    prisma.user.count({
      where: { plan: { not: "FREE" }, deletedAt: null },
    }),
    prisma.flashcard.count(),
    prisma.mCQ.count(),
    prisma.trueFalse.count(),
    prisma.causa.count(),
    prisma.causaRoom.count(),
    prisma.ayudantia.count({ where: { isActive: true } }),
    // Recent activity: last 20 admin logs
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { admin: { select: { firstName: true, lastName: true } } },
    }),
    // Registrations by day (last 30 days)
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
      FROM "User"
      WHERE "createdAt" >= ${thirtyDaysAgo}
        AND "deletedAt" IS NULL
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    // Users active in last 7 days (had any attempt)
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count FROM (
        SELECT "userId" FROM "UserMCQAttempt" WHERE "attemptedAt" >= ${sevenDaysAgo}
        UNION
        SELECT "userId" FROM "UserTrueFalseAttempt" WHERE "attemptedAt" >= ${sevenDaysAgo}
        UNION
        SELECT "userId" FROM "UserFlashcardProgress" WHERE "lastReviewedAt" >= ${sevenDaysAgo}
      ) AS active
    `,
    prisma.userBadge.count(),
    prisma.contentReport.count(),
    prisma.contentReport.count({ where: { status: "PENDING" } }),
  ]);

  // Fill in missing days for the chart
  const regMap = new Map<string, number>();
  for (const row of registrationsByDay) {
    regMap.set(
      new Date(row.date).toISOString().slice(0, 10),
      Number(row.count)
    );
  }

  const chartData: { date: string; registros: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    chartData.push({ date: key, registros: regMap.get(key) ?? 0 });
  }

  return NextResponse.json({
    kpis: {
      totalUsers,
      newUsersMonth,
      newUsersWeek,
      premiumUsers,
      activeUsersWeek: Number(activeUsersWeek[0]?.count ?? 0),
      totalContent: totalFlashcards + totalMCQs + totalTrueFalse,
      totalFlashcards,
      totalMCQs,
      totalTrueFalse,
      totalCausas,
      totalCausaRooms,
      totalAyudantias,
      totalBadges,
      totalReports,
      pendingReports,
    },
    chartData,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      target: a.target,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
      adminName: `${a.admin.firstName} ${a.admin.lastName}`,
    })),
  });
}
