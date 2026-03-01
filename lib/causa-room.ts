// ─── CausaRoom (Causa Grupal) — constantes y helpers ──────────
import { prisma } from "@/lib/prisma";
import { calculateCausaScore, CAUSA_QUESTIONS } from "@/lib/causa";
import { getCurrentWeekBounds } from "@/lib/league";
import { evaluateBadges } from "@/lib/badges";
import type { BadgeSlug } from "@/lib/badge-constants";

export const ROOM_QUESTIONS = CAUSA_QUESTIONS; // 10
export const ROOM_MIN_PLAYERS = 2;
export const ROOM_MAX_PLAYERS_DEFAULT = 10;

// XP escalonado por posición
export const ROOM_XP_1ST = 30;
export const ROOM_XP_2ND = 15;
export const ROOM_XP_3RD = 10;
export const ROOM_XP_PARTICIPANT = 5;

/**
 * Selecciona N MCQ IDs al azar, con filtro opcional de materia/dificultad.
 * Reutiliza el patrón random-skip de app/api/causas/challenge/route.ts
 */
export async function selectRandomMCQs(
  count: number,
  materia?: string | null,
  difficulty?: string | null
): Promise<string[]> {
  const where: Record<string, unknown> = {};
  if (materia) where.materia = materia;
  if (difficulty) where.nivel = difficulty;

  const totalMcqs = await prisma.mCQ.count({ where });
  if (totalMcqs < count) {
    throw new Error(`No hay suficientes MCQs (${totalMcqs} disponibles, se necesitan ${count})`);
  }

  const mcqIds: string[] = [];
  const usedSkips = new Set<number>();

  while (mcqIds.length < count) {
    let skip: number;
    do {
      skip = Math.floor(Math.random() * totalMcqs);
    } while (usedSkips.has(skip));
    usedSkips.add(skip);

    const mcq = await prisma.mCQ.findFirst({
      where,
      skip,
      select: { id: true },
    });

    if (mcq && !mcqIds.includes(mcq.id)) {
      mcqIds.push(mcq.id);
    }
  }

  return mcqIds;
}

/**
 * Genera código de sala de 6 caracteres a partir del roomId.
 */
export function roomIdToCode(roomId: string): string {
  return roomId.slice(-6).toUpperCase();
}

/**
 * Finaliza una CausaRoom:
 * 1. Rankea participantes por score DESC (empate: tiempo ASC)
 * 2. Asigna positions
 * 3. Otorga XP escalonado + actualiza liga
 * 4. Evalúa badges
 * 5. Marca room como "finished"
 */
export async function finishRoom(roomId: string): Promise<{
  rankings: Array<{ userId: string; totalScore: number; totalTime: number; position: number }>;
  badgeResults: Record<string, BadgeSlug[]>;
}> {
  // Verificar que el room no esté ya finished (idempotencia)
  const room = await prisma.causaRoom.findUnique({
    where: { id: roomId },
    select: { status: true },
  });
  if (!room || room.status !== "active") {
    return { rankings: [], badgeResults: {} };
  }

  const allAnswers = await prisma.causaRoomAnswer.findMany({
    where: { roomId },
  });

  const participants = await prisma.causaParticipant.findMany({
    where: { roomId },
  });

  // Calcular totales por participante
  const playerStats = participants.map((p) => {
    const answers = allAnswers.filter((a) => a.userId === p.userId);
    const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
    const totalTime = answers.reduce((sum, a) => sum + (a.timeMs ?? 0), 0);
    return { userId: p.userId, totalScore, totalTime, position: 0 };
  });

  // Ordenar: score DESC, luego tiempo ASC
  playerStats.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.totalTime - b.totalTime;
  });

  const { weekStart } = getCurrentWeekBounds();

  // Asignar posiciones y XP
  for (let i = 0; i < playerStats.length; i++) {
    const position = i + 1;
    playerStats[i].position = position;
    const { userId, totalScore } = playerStats[i];

    let xpReward = ROOM_XP_PARTICIPANT;
    if (position === 1) xpReward = ROOM_XP_1ST;
    else if (position === 2) xpReward = ROOM_XP_2ND;
    else if (position === 3) xpReward = ROOM_XP_3RD;

    // Actualizar posición y score del participante
    await prisma.causaParticipant.update({
      where: { roomId_userId: { roomId, userId } },
      data: { position, score: totalScore },
    });

    // Incrementar XP del usuario
    const updateData: { xp: { increment: number }; causasGanadas?: { increment: number } } = {
      xp: { increment: xpReward },
    };
    if (position === 1) {
      updateData.causasGanadas = { increment: 1 };
    }
    await prisma.user.update({ where: { id: userId }, data: updateData });

    // Incrementar league weeklyXp
    await prisma.leagueMember.updateMany({
      where: { userId, league: { weekStart } },
      data: { weeklyXp: { increment: xpReward } },
    });
  }

  // Marcar room como finished
  await prisma.causaRoom.update({
    where: { id: roomId },
    data: { status: "finished" },
  });

  // Evaluar badges para todos los participantes
  const badgeResults: Record<string, BadgeSlug[]> = {};
  for (const p of playerStats) {
    const newBadges = await evaluateBadges(p.userId);
    if (newBadges.length > 0) {
      badgeResults[p.userId] = newBadges;
    }
  }

  return { rankings: playerStats, badgeResults };
}

// Re-exportar calculateCausaScore para uso en el answer route
export { calculateCausaScore };
