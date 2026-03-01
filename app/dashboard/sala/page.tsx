import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SalaClient } from "./sala-client";

export default async function SalaPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Consultas en paralelo
  const [ayudantias, misAyudantias, streak] = await Promise.all([
    // Ayudantías activas (OFREZCO por defecto)
    prisma.ayudantia.findMany({
      where: { isActive: true, type: "OFREZCO" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            leagueMembers: {
              orderBy: { league: { weekStart: "desc" } },
              take: 1,
              include: {
                league: { select: { tier: true } },
              },
            },
          },
        },
      },
    }),

    // Mis publicaciones
    prisma.ayudantia.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
    }),

    // Mi streak
    prisma.ayudantiaStreak.findUnique({
      where: { userId: authUser.id },
    }),
  ]);

  // Fetch streaks para los tutores
  const userIds = Array.from(new Set(ayudantias.map((a) => a.userId)));
  const streaks = await prisma.ayudantiaStreak.findMany({
    where: { userId: { in: userIds } },
  });
  const streakMap = Object.fromEntries(
    streaks.map((s) => [s.userId, s])
  );

  const serializedAyudantias = ayudantias.map((a) => ({
    id: a.id,
    type: a.type as string,
    materia: a.materia,
    format: a.format as string,
    priceType: a.priceType as string,
    priceAmount: a.priceAmount,
    description: a.description,
    universidad: a.universidad,
    orientadaA: a.orientadaA,
    contactMethod: a.contactMethod as string,
    contactValue: a.contactValue,
    createdAt: a.createdAt.toISOString(),
    user: {
      id: a.user.id,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      tier: (a.user.leagueMembers[0]?.league.tier as string) ?? null,
    },
    streak: streakMap[a.userId]
      ? {
          monthsActive: streakMap[a.userId].monthsActive,
          longestStreak: streakMap[a.userId].longestStreak,
        }
      : null,
  }));

  const serializedMis = misAyudantias.map((a) => ({
    id: a.id,
    type: a.type as string,
    materia: a.materia,
    format: a.format as string,
    priceType: a.priceType as string,
    priceAmount: a.priceAmount,
    description: a.description,
    universidad: a.universidad,
    orientadaA: a.orientadaA,
    contactMethod: a.contactMethod as string,
    contactValue: a.contactValue,
    isActive: a.isActive,
    reportCount: a.reportCount,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <SalaClient
      userId={authUser.id}
      initialAyudantias={serializedAyudantias}
      misAyudantias={serializedMis}
      streak={
        streak
          ? {
              monthsActive: streak.monthsActive,
              longestStreak: streak.longestStreak,
            }
          : null
      }
    />
  );
}
