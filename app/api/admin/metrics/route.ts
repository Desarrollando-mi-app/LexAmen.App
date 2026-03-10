import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

  const url = request.nextUrl;
  const days = parseInt(url.searchParams.get("days") ?? "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    flashcardsByDay,
    mcqsByDay,
    truefalseByDay,
    causasByDay,
    mcqAccuracy,
    tfAccuracy,
    topUsers,
    retentionData,
  ] = await Promise.all([
    // Flashcard reviews by day
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("lastReviewedAt") as date, COUNT(*)::bigint as count
      FROM "UserFlashcardProgress"
      WHERE "lastReviewedAt" >= ${since}
      GROUP BY DATE("lastReviewedAt")
      ORDER BY date ASC
    `,
    // MCQ attempts by day
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("attemptedAt") as date, COUNT(*)::bigint as count
      FROM "UserMCQAttempt"
      WHERE "attemptedAt" >= ${since}
      GROUP BY DATE("attemptedAt")
      ORDER BY date ASC
    `,
    // TrueFalse attempts by day
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("attemptedAt") as date, COUNT(*)::bigint as count
      FROM "UserTrueFalseAttempt"
      WHERE "attemptedAt" >= ${since}
      GROUP BY DATE("attemptedAt")
      ORDER BY date ASC
    `,
    // Causas by day
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
      FROM "Causa"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    // MCQ accuracy
    prisma.$queryRaw<{ total: bigint; correct: bigint }[]>`
      SELECT COUNT(*)::bigint as total,
             SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END)::bigint as correct
      FROM "UserMCQAttempt"
      WHERE "attemptedAt" >= ${since}
    `,
    // TF accuracy
    prisma.$queryRaw<{ total: bigint; correct: bigint }[]>`
      SELECT COUNT(*)::bigint as total,
             SUM(CASE WHEN "isCorrect" THEN 1 ELSE 0 END)::bigint as correct
      FROM "UserTrueFalseAttempt"
      WHERE "attemptedAt" >= ${since}
    `,
    // Top 10 users by XP
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { xp: "desc" },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        xp: true,
        avatarUrl: true,
      },
    }),
    // Retention: users active this week vs last week
    prisma.$queryRaw<{ thisWeek: bigint; lastWeek: bigint }[]>`
      SELECT
        (SELECT COUNT(DISTINCT "userId")::bigint FROM (
          SELECT "userId" FROM "UserMCQAttempt" WHERE "attemptedAt" >= NOW() - INTERVAL '7 days'
          UNION SELECT "userId" FROM "UserTrueFalseAttempt" WHERE "attemptedAt" >= NOW() - INTERVAL '7 days'
          UNION SELECT "userId" FROM "UserFlashcardProgress" WHERE "lastReviewedAt" >= NOW() - INTERVAL '7 days'
        ) a) AS "thisWeek",
        (SELECT COUNT(DISTINCT "userId")::bigint FROM (
          SELECT "userId" FROM "UserMCQAttempt" WHERE "attemptedAt" >= NOW() - INTERVAL '14 days' AND "attemptedAt" < NOW() - INTERVAL '7 days'
          UNION SELECT "userId" FROM "UserTrueFalseAttempt" WHERE "attemptedAt" >= NOW() - INTERVAL '14 days' AND "attemptedAt" < NOW() - INTERVAL '7 days'
          UNION SELECT "userId" FROM "UserFlashcardProgress" WHERE "lastReviewedAt" >= NOW() - INTERVAL '14 days' AND "lastReviewedAt" < NOW() - INTERVAL '7 days'
        ) b) AS "lastWeek"
    `,
  ]);

  // Build chart data
  const buildMap = (rows: { date: string; count: bigint }[]) => {
    const m = new Map<string, number>();
    for (const r of rows)
      m.set(new Date(r.date).toISOString().slice(0, 10), Number(r.count));
    return m;
  };

  const fcMap = buildMap(flashcardsByDay);
  const mcqMap = buildMap(mcqsByDay);
  const tfMap = buildMap(truefalseByDay);
  const causaMap = buildMap(causasByDay);

  const now = new Date();
  const studyChart: {
    date: string;
    flashcards: number;
    mcq: number;
    vf: number;
  }[] = [];
  const competitionChart: { date: string; causas: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    studyChart.push({
      date: key,
      flashcards: fcMap.get(key) ?? 0,
      mcq: mcqMap.get(key) ?? 0,
      vf: tfMap.get(key) ?? 0,
    });
    competitionChart.push({
      date: key,
      causas: causaMap.get(key) ?? 0,
    });
  }

  const mcqTotal = Number(mcqAccuracy[0]?.total ?? 0);
  const mcqCorrect = Number(mcqAccuracy[0]?.correct ?? 0);
  const tfTotal = Number(tfAccuracy[0]?.total ?? 0);
  const tfCorrect = Number(tfAccuracy[0]?.correct ?? 0);

  return NextResponse.json({
    studyChart,
    competitionChart,
    accuracy: {
      mcq: mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0,
      mcqTotal,
      tf: tfTotal > 0 ? Math.round((tfCorrect / tfTotal) * 100) : 0,
      tfTotal,
    },
    topUsers,
    retention: {
      thisWeek: Number(retentionData[0]?.thisWeek ?? 0),
      lastWeek: Number(retentionData[0]?.lastWeek ?? 0),
    },
  });
}
