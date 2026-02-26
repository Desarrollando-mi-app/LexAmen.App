// ─── Asignación lazy de usuario a liga semanal ──────────────
// Si el usuario no tiene membresía esta semana, se le asigna a
// una liga de su tier actual (o Cartón si es nuevo).

import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds } from "@/lib/league";

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

  // 2. Determinar tier: revisar última membresía o default CARTON
  const lastMembership = await prisma.leagueMember.findFirst({
    where: { userId },
    orderBy: { league: { weekStart: "desc" } },
    include: { league: true },
  });

  const tier = lastMembership?.league.tier ?? "CARTON";

  // 3. Buscar liga con < 30 miembros para este tier/semana
  const leagues = await prisma.league.findMany({
    where: { tier, weekStart },
    include: { _count: { select: { members: true } } },
  });

  let league = leagues.find((l) => l._count.members < 30);

  // 4. Si no hay liga con espacio, crear una nueva
  if (!league) {
    league = await prisma.league.create({
      data: { tier, weekStart, weekEnd },
      include: { _count: { select: { members: true } } },
    });
  }

  // 5. Crear membresía
  return prisma.leagueMember.create({
    data: { userId, leagueId: league.id },
    include: { league: true },
  });
}
