// ─── Asignación lazy de usuario a liga semanal ──────────────
// Si el usuario no tiene membresía esta semana, se le asigna a
// una liga agrupada por grado cercano (±3).

import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds, MAX_LEAGUE_SIZE } from "@/lib/league";

export async function ensureLeagueMembership(userId: string) {
  const { weekStart, weekEnd } = getCurrentWeekBounds();

  // 1. ¿Ya tiene membresía esta semana?
  const existing = await prisma.leagueMember.findFirst({
    where: {
      userId,
      league: { weekStart },
    },
    include: { league: true },
  });

  if (existing) return existing;

  // 2. Determinar grado del usuario
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { grado: true },
  });
  const grado = user?.grado ?? 1;

  // 3. Buscar liga de esta semana con grados cercanos (±3) y espacio disponible
  const leagues = await prisma.league.findMany({
    where: {
      weekStart,
      gradoRef: { gte: Math.max(1, grado - 3), lte: Math.min(33, grado + 3) },
    },
    include: { _count: { select: { members: true } } },
  });

  // Find one with space, excluding leagues user is already in
  let league = leagues.find((l) => l._count.members < MAX_LEAGUE_SIZE);

  // 4. Si no hay liga con espacio, crear una nueva
  if (!league) {
    // Need a tier for backward compat - use CARTON as default
    league = await prisma.league.create({
      data: { tier: "CARTON", gradoRef: grado, weekStart, weekEnd },
      include: { _count: { select: { members: true } } },
    });
  }

  // 5. Crear membresía
  return prisma.leagueMember.create({
    data: { userId, leagueId: league.id },
    include: { league: true },
  });
}
