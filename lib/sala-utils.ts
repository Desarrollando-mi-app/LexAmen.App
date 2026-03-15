// Server-only utility for La Sala stats

import { prisma } from "@/lib/prisma";

/**
 * Get tutor/student stats for a user
 */
export async function getUserTutorStats(userId: string) {
  const [sesiones, evalAgg] = await Promise.all([
    prisma.ayudantiaSesion.findMany({
      where: {
        OR: [{ tutorId: userId }, { estudianteId: userId }],
        status: "completada",
      },
      select: { duracionMin: true },
    }),
    prisma.ayudantiaEvaluacion.aggregate({
      where: { evaluadoId: userId },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);

  const horasAcumuladas = sesiones.reduce(
    (sum, s) => sum + (s.duracionMin ?? 0),
    0
  ) / 60;

  return {
    sesionesCompletadas: sesiones.length,
    ratingPromedio: evalAgg._avg.rating,
    totalEvaluaciones: evalAgg._count.id,
    horasAcumuladas: Math.round(horasAcumuladas * 10) / 10,
  };
}

/**
 * Get an ayudantia with user stats (rating, sessions)
 */
export async function getAyudantiaWithStats(ayudantiaId: string) {
  const ayudantia = await prisma.ayudantia.findUnique({
    where: { id: ayudantiaId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
        },
      },
      sesiones: {
        include: {
          tutor: { select: { id: true, firstName: true, lastName: true } },
          estudiante: { select: { id: true, firstName: true, lastName: true } },
          evaluaciones: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          sesiones: { where: { status: "completada" } },
        },
      },
    },
  });

  if (!ayudantia) return null;

  // Get user's rating stats
  const stats = await getUserTutorStats(ayudantia.userId);

  return { ayudantia, stats };
}
