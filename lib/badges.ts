// ─── Evaluación de Insignias (server-only) ────────────────────
import { prisma } from "@/lib/prisma";
import type { BadgeSlug } from "@/lib/badge-constants";
import { BADGE_MAP } from "@/lib/badge-constants";
import { sendNotification } from "@/lib/notifications";

/**
 * Evalúa qué badges merece un usuario y los otorga.
 * Retorna array de slugs recién ganados en esta evaluación.
 */
export async function evaluateBadges(userId: string): Promise<BadgeSlug[]> {
  const newBadges: BadgeSlug[] = [];

  // Contar victorias totales (position === 1 en CausaParticipant)
  const totalWins = await prisma.causaParticipant.count({
    where: { userId, position: 1 },
  });

  // PASANTE: 1+ victoria
  if (totalWins >= 1) {
    const earned = await upsertBadge(userId, "PASANTE");
    if (earned) newBadges.push("PASANTE");
  }

  // PROCURADOR: 10+ victorias
  if (totalWins >= 10) {
    const earned = await upsertBadge(userId, "PROCURADOR");
    if (earned) newBadges.push("PROCURADOR");
  }

  // ABOGADO_LITIGANTE: 50+ victorias
  if (totalWins >= 50) {
    const earned = await upsertBadge(userId, "ABOGADO_LITIGANTE");
    if (earned) newBadges.push("ABOGADO_LITIGANTE");
  }

  // PENALISTA_EN_SERIE: 5 victorias consecutivas
  const recentParticipations = await prisma.causaParticipant.findMany({
    where: {
      userId,
      room: { status: "finished" },
      position: { not: null },
    },
    orderBy: { joinedAt: "desc" },
    take: 5,
    select: { position: true },
  });

  if (
    recentParticipations.length >= 5 &&
    recentParticipations.every((p) => p.position === 1)
  ) {
    const earned = await upsertBadge(userId, "PENALISTA_EN_SERIE");
    if (earned) newBadges.push("PENALISTA_EN_SERIE");
  }

  // JURISCONSULTO_SEMANA: se evalúa en el cron de liga, no aquí
  // SOCIEDAD_DE_HECHO: futuro — se omite

  // ── Badges de Obiter Dictum ──────────────────────────────
  const obiterBadges = await evaluateObiterBadgesInternal(userId);
  newBadges.push(...obiterBadges);

  // Enviar notificación por cada badge nuevo
  for (const slug of newBadges) {
    const badge = BADGE_MAP[slug];
    sendNotification({
      type: "BADGE_EARNED",
      title: "¡Nueva insignia!",
      body: `Has ganado la insignia ${badge.label} ${badge.emoji}`,
      targetUserId: userId,
      metadata: { badgeSlug: slug },
      sendEmail: false,
    }).catch(() => {});
  }

  return newBadges;
}

/**
 * Evalúa solo badges de Obiter Dictum para un usuario.
 * Llamar después de que un obiter del usuario es citado.
 * Incluye envío de notificaciones para badges nuevos.
 */
export async function evaluateObiterBadges(
  userId: string
): Promise<BadgeSlug[]> {
  const newBadges = await evaluateObiterBadgesInternal(userId);

  // Enviar notificación por cada badge nuevo
  for (const slug of newBadges) {
    const badge = BADGE_MAP[slug];
    sendNotification({
      type: "BADGE_EARNED",
      title: "¡Nueva insignia!",
      body: `Has ganado la insignia ${badge.label} ${badge.emoji}`,
      targetUserId: userId,
      metadata: { badgeSlug: slug },
      sendEmail: false,
    }).catch(() => {});
  }

  return newBadges;
}

/**
 * Internal: evalúa badges de Obiter sin enviar notificaciones.
 * Las notificaciones se envían desde evaluateBadges o evaluateObiterBadges.
 */
async function evaluateObiterBadgesInternal(
  userId: string
): Promise<BadgeSlug[]> {
  const newBadges: BadgeSlug[] = [];

  // Contar obiters del usuario que han sido citados (citasCount >= 1)
  const citedCount = await prisma.obiterDictum.count({
    where: { userId, citasCount: { gte: 1 } },
  });

  // VOZ_DEL_FORO: primer obiter citado
  if (citedCount >= 1) {
    const earned = await upsertBadge(userId, "VOZ_DEL_FORO");
    if (earned) newBadges.push("VOZ_DEL_FORO");
  }

  // DOCTRINARIO: 10 obiters citados
  if (citedCount >= 10) {
    const earned = await upsertBadge(userId, "DOCTRINARIO");
    if (earned) newBadges.push("DOCTRINARIO");
  }

  // CONTROVERSIA: un obiter con 5+ citas
  const controversial = await prisma.obiterDictum.findFirst({
    where: { userId, citasCount: { gte: 5 } },
    select: { id: true },
  });
  if (controversial) {
    const earned = await upsertBadge(userId, "CONTROVERSIA");
    if (earned) newBadges.push("CONTROVERSIA");
  }

  return newBadges;
}

/**
 * Intenta crear un badge. Retorna true si fue nuevo.
 */
async function upsertBadge(
  userId: string,
  badge: BadgeSlug
): Promise<boolean> {
  try {
    await prisma.userBadge.create({
      data: { userId, badge },
    });
    return true;
  } catch {
    // Ya existe (unique constraint)
    return false;
  }
}
