import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AyudantiasClient } from "./gestion-client";

export default async function AyudantiasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const [ayudantias, misAyudantias, streak, misSesiones] = await Promise.all([
    // Active ayudantias
    prisma.ayudantia.findMany({
      where: { isActive: true, isHidden: false, type: "OFREZCO" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            universidad: true,
            leagueMembers: {
              orderBy: { league: { weekStart: "desc" } },
              take: 1,
              include: { league: { select: { tier: true } } },
            },
          },
        },
        _count: {
          select: { sesiones: { where: { status: "completada" } } },
        },
      },
    }),

    // My ayudantias
    prisma.ayudantia.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
    }),

    // My streak
    prisma.ayudantiaStreak.findUnique({
      where: { userId: authUser.id },
    }),

    // My sessions
    prisma.ayudantiaSesion.findMany({
      where: {
        OR: [{ tutorId: authUser.id }, { estudianteId: authUser.id }],
      },
      include: {
        ayudantia: { select: { id: true, materia: true, titulo: true, type: true } },
        tutor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        estudiante: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        evaluaciones: { select: { evaluadorId: true, rating: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Get rating stats for ayudantia owners
  const userIds = Array.from(new Set(ayudantias.map((a) => a.userId)));
  const [streaks, ratingStats] = await Promise.all([
    prisma.ayudantiaStreak.findMany({
      where: { userId: { in: userIds } },
    }),
    prisma.ayudantiaEvaluacion.groupBy({
      by: ["evaluadoId"],
      where: { evaluadoId: { in: userIds } },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);

  const streakMap = Object.fromEntries(streaks.map((s) => [s.userId, s]));
  const ratingMap = Object.fromEntries(
    ratingStats.map((r) => [r.evaluadoId, { avg: r._avg.rating, count: r._count.id }])
  );

  const serializedAyudantias = ayudantias.map((a) => ({
    id: a.id,
    type: a.type as string,
    materia: a.materia,
    titulo: a.titulo,
    format: a.format as string,
    priceType: a.priceType as string,
    priceAmount: a.priceAmount,
    description: a.description,
    universidad: a.universidad,
    orientadaA: a.orientadaA,
    contactMethod: a.contactMethod as string,
    contactValue: a.contactValue,
    disponibilidad: a.disponibilidad ?? null,
    createdAt: a.createdAt.toISOString(),
    sesionesCompletadas: a._count.sesiones,
    user: {
      id: a.user.id,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      avatarUrl: a.user.avatarUrl,
      universidad: a.user.universidad,
      tier: (a.user.leagueMembers[0]?.league.tier as string) ?? null,
    },
    streak: streakMap[a.userId]
      ? { monthsActive: streakMap[a.userId].monthsActive, longestStreak: streakMap[a.userId].longestStreak }
      : null,
    rating: ratingMap[a.userId] ?? null,
  }));

  const serializedMis = misAyudantias.map((a) => ({
    id: a.id,
    type: a.type as string,
    materia: a.materia,
    titulo: a.titulo,
    format: a.format as string,
    priceType: a.priceType as string,
    priceAmount: a.priceAmount,
    description: a.description,
    universidad: a.universidad,
    orientadaA: a.orientadaA,
    contactMethod: a.contactMethod as string,
    contactValue: a.contactValue,
    disponibilidad: a.disponibilidad ?? null,
    isActive: a.isActive,
    isHidden: a.isHidden,
    reportCount: a.reportCount,
    createdAt: a.createdAt.toISOString(),
  }));

  const serializedSesiones = misSesiones.map((s) => ({
    id: s.id,
    ayudantiaId: s.ayudantiaId,
    ayudantiaTitulo: s.ayudantia.titulo || s.ayudantia.materia,
    ayudantiaTipo: s.ayudantia.type as string,
    tutorId: s.tutorId,
    tutor: s.tutor,
    estudianteId: s.estudianteId,
    estudiante: s.estudiante,
    fecha: s.fecha.toISOString(),
    duracionMin: s.duracionMin,
    materia: s.materia,
    notas: s.notas,
    status: s.status,
    completadaAt: s.completadaAt?.toISOString() ?? null,
    canceladaAt: s.canceladaAt?.toISOString() ?? null,
    canceladaPor: s.canceladaPor,
    createdAt: s.createdAt.toISOString(),
    evaluaciones: s.evaluaciones.map((e) => ({
      evaluadorId: e.evaluadorId,
      rating: e.rating,
    })),
    myRole: s.tutorId === authUser.id ? ("tutor" as const) : ("estudiante" as const),
    hasEvaluated: s.evaluaciones.some((e) => e.evaluadorId === authUser.id),
  }));

  return (
    <AyudantiasClient
      userId={authUser.id}
      initialAyudantias={serializedAyudantias}
      misAyudantias={serializedMis}
      misSesiones={serializedSesiones}
      streak={streak ? { monthsActive: streak.monthsActive, longestStreak: streak.longestStreak } : null}
    />
  );
}
