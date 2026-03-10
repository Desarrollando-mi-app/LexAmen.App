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

  const [
    user,
    flashcardProgress,
    mcqAttempts,
    trueFalseAttempts,
    causasAsChallenger,
    causasAsChallenged,
    badges,
    ayudantias,
    calendarEvents,
    leagueHistory,
    colegas,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        bio: true,
        universidad: true,
        sede: true,
        universityYear: true,
        xp: true,
        causasGanadas: true,
        causasPerdidas: true,
        plan: true,
        createdAt: true,
      },
    }),
    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id },
      select: {
        flashcardId: true,
        easeFactor: true,
        interval: true,
        repetitions: true,
        lastReviewedAt: true,
      },
    }),
    prisma.userMCQAttempt.findMany({
      where: { userId: authUser.id },
      select: {
        mcqId: true,
        selectedOption: true,
        isCorrect: true,
        attemptedAt: true,
      },
    }),
    prisma.userTrueFalseAttempt.findMany({
      where: { userId: authUser.id },
      select: {
        trueFalseId: true,
        selectedAnswer: true,
        isCorrect: true,
        attemptedAt: true,
      },
    }),
    prisma.causa.findMany({
      where: { challengerId: authUser.id },
      select: {
        id: true,
        status: true,
        winnerId: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.causa.findMany({
      where: { challengedId: authUser.id },
      select: {
        id: true,
        status: true,
        winnerId: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.userBadge.findMany({
      where: { userId: authUser.id },
      select: { badge: true, earnedAt: true },
    }),
    prisma.ayudantia.findMany({
      where: { userId: authUser.id },
      select: {
        id: true,
        type: true,
        materia: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.calendarEvent.findMany({
      where: { userId: authUser.id },
      select: {
        title: true,
        description: true,
        eventType: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.leagueMember.findMany({
      where: { userId: authUser.id },
      include: { league: { select: { tier: true, weekStart: true, weekEnd: true } } },
    }),
    prisma.colegaRequest.findMany({
      where: {
        OR: [{ senderId: authUser.id }, { receiverId: authUser.id }],
        status: "ACCEPTED",
      },
      select: { senderId: true, receiverId: true },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    platform: "Iuris Studio",
    user,
    flashcardProgress,
    mcqAttempts,
    trueFalseAttempts,
    causas: [...causasAsChallenger, ...causasAsChallenged],
    badges,
    ayudantias,
    calendarEvents,
    leagueHistory,
    colegaCount: colegas.length,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="mis-datos-iuris-studio.json"',
    },
  });
}
