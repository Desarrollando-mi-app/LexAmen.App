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

  const [user, masteredCount, badges, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        avatarUrl: true,
        universidad: true,
        sede: true,
        universityYear: true,
        cvAvailable: true,
        xp: true,
        grado: true,
        causasGanadas: true,
      },
    }),
    prisma.userFlashcardProgress.count({
      where: { userId: authUser.id, repetitions: { gte: 3 } },
    }),
    prisma.userBadge.findMany({
      where: { userId: authUser.id },
      select: { badge: true },
    }),
    prisma.leagueMember.findFirst({
      where: { userId: authUser.id },
      orderBy: { league: { weekStart: "desc" } },
      include: { league: { select: { tier: true } } },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    tier: membership?.league.tier ?? null,
    flashcardsMastered: masteredCount,
    badgeCount: badges.length,
    earnedBadges: badges.map((b) => b.badge),
  });
}
