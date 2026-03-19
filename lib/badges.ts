// ─── Evaluación de Insignias (server-only) ────────────────────
import { prisma } from "@/lib/prisma";
import type { BadgeCategory } from "@/lib/badge-constants";
import { BADGE_RULES, BADGE_MAP, calculateGrado } from "@/lib/badge-constants";
import { sendNotification } from "@/lib/notifications";

// ─── Types ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BadgeRule = (typeof BADGE_RULES)[number];

// ─── Main: evaluateBadges ─────────────────────────────────

/**
 * Evalúa qué badges merece un usuario y los otorga.
 * Si se pasa category, solo evalúa badges de esa categoría.
 * Retorna array de slugs recién ganados en esta evaluación.
 */
export async function evaluateBadges(
  userId: string,
  category?: BadgeCategory
): Promise<string[]> {
  const newBadges: string[] = [];

  // Filter rules by category if provided
  const rules = category
    ? BADGE_RULES.filter((r) => r.category === category)
    : BADGE_RULES;

  // Get existing badges
  const existingBadges = await prisma.userBadge.findMany({
    where: { userId },
    select: { badge: true },
  });
  const earnedSet = new Set(existingBadges.map((b) => b.badge));

  // Evaluate each unearned badge
  for (const rule of rules) {
    if (earnedSet.has(rule.slug)) continue;

    const met = await checkBadgeCondition(userId, rule);
    if (!met) continue;

    const created = await upsertBadge(userId, rule.slug);
    if (created) {
      newBadges.push(rule.slug);
    }
  }

  // Send notifications for newly earned badges
  for (const slug of newBadges) {
    const badge = BADGE_MAP[slug];
    if (!badge) continue;
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

// ─── Convenience: evaluateObiterBadges ────────────────────

/**
 * Evalúa solo badges de la categoría "diario" para un usuario.
 */
export async function evaluateObiterBadges(
  userId: string
): Promise<string[]> {
  return evaluateBadges(userId, "diario");
}

// ─── Check badge condition ────────────────────────────────

async function checkBadgeCondition(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rule: BadgeRule & { check?: any }
): Promise<boolean> {
  const check = rule.check;
  if (!check) return false;

  const type: string = check.type;
  const threshold: number = check.threshold ?? 1;

  switch (type) {
    // ── Grado ──────────────────────────────────────────
    case "grado_reached": {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { grado: true },
      });
      if (!user) return false;
      return (user.grado ?? 1) >= threshold;
    }

    // ── Flashcards ─────────────────────────────────────
    case "flashcards_mastered":
    case "flashcards_completed": {
      const count = await prisma.userFlashcardProgress.count({
        where: { userId, repetitions: { gte: 3 } },
      });
      return count >= threshold;
    }

    // ── MCQ ────────────────────────────────────────────
    case "mcq_correct":
    case "mcq_completed": {
      const count = await prisma.userMCQAttempt.count({
        where: { userId, isCorrect: true },
      });
      return count >= threshold;
    }

    // ── Verdadero / Falso ──────────────────────────────
    case "vf_correct":
    case "vf_completed": {
      const count = await prisma.userTrueFalseAttempt.count({
        where: { userId, isCorrect: true },
      });
      return count >= threshold;
    }

    // ── Definiciones ───────────────────────────────────
    case "definiciones_correct":
    case "definitions_completed": {
      const count = await prisma.definicionIntento.count({
        where: { userId, correcta: true },
      });
      return count >= threshold;
    }

    // ── Accuracy rate ──────────────────────────────────
    case "accuracy_rate":
    case "accuracy": {
      const minAttempts: number = check.minAttempts ?? 50;

      const [mcqTotal, mcqCorrect, vfTotal, vfCorrect, defTotal, defCorrect] =
        await Promise.all([
          prisma.userMCQAttempt.count({ where: { userId } }),
          prisma.userMCQAttempt.count({ where: { userId, isCorrect: true } }),
          prisma.userTrueFalseAttempt.count({ where: { userId } }),
          prisma.userTrueFalseAttempt.count({
            where: { userId, isCorrect: true },
          }),
          prisma.definicionIntento.count({ where: { userId } }),
          prisma.definicionIntento.count({
            where: { userId, correcta: true },
          }),
        ]);

      const total = mcqTotal + vfTotal + defTotal;
      if (total < minAttempts) return false;

      const correct = mcqCorrect + vfCorrect + defCorrect;
      const rate = (correct / total) * 100;
      return rate >= threshold;
    }

    // ── All modules in a week ──────────────────────────
    case "all_modules_week": {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const targetModules = [
        "Flashcards",
        "MCQ",
        "V/F",
        "Definiciones",
        "Simulacro Oral",
      ];

      const logs = await prisma.xpLog.findMany({
        where: {
          userId,
          createdAt: { gte: weekStart },
          detalle: { in: targetModules },
        },
        select: { detalle: true },
        distinct: ["detalle"],
      });

      const distinctModules = new Set(logs.map((l) => l.detalle));
      return distinctModules.size >= 5;
    }

    // ── Simulacro completado ───────────────────────────
    case "simulacro_completed":
    case "simulacros_completed": {
      const count = await prisma.simulacroSesion.count({
        where: { userId, completada: true },
      });
      return count >= threshold;
    }

    // ── Simulacro perfecto ─────────────────────────────
    case "simulacro_perfect":
    case "perfect_score": {
      const perfect = await prisma.simulacroSesion.findFirst({
        where: {
          userId,
          completada: true,
          incorrectas: 0,
          correctas: { gte: 1 },
        },
        select: { id: true },
      });
      return perfect !== null;
    }

    // ── Don Augusto avanzado ───────────────────────────
    case "simulacro_augusto_avanzado":
    case "augusto_advanced": {
      const session = await prisma.simulacroSesion.findFirst({
        where: {
          userId,
          interrogadorId: "DON_AUGUSTO",
          nivelActual: "AVANZADO",
          correctas: { gte: 8 },
          completada: true,
        },
        select: { id: true },
      });
      return session !== null;
    }

    // ── All interrogators ──────────────────────────────
    case "simulacro_all_interrogators":
    case "all_interrogators": {
      const sessions = await prisma.simulacroSesion.findMany({
        where: { userId, completada: true },
        select: { interrogadorId: true },
        distinct: ["interrogadorId"],
      });
      return sessions.length >= 5;
    }

    // ── Streak days ────────────────────────────────────
    case "streak_days": {
      const logs = await prisma.xpLog.findMany({
        where: { userId, amount: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
        take: 400,
      });

      if (logs.length === 0) return false;

      // Get distinct dates (YYYY-MM-DD) sorted desc
      const dateSet = new Set<string>();
      for (const log of logs) {
        const d = log.createdAt;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dateSet.add(key);
      }

      const dates = Array.from(dateSet).sort().reverse();
      let streak = 1;

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffMs = prev.getTime() - curr.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }

      return streak >= threshold;
    }

    // ── Early study days ───────────────────────────────
    case "early_study_days": {
      const logs = await prisma.xpLog.findMany({
        where: { userId, amount: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
        take: 400,
      });

      const earlyDays = new Set<string>();
      for (const log of logs) {
        const d = log.createdAt;
        if (d.getHours() < 7) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          earlyDays.add(key);
        }
      }

      return earlyDays.size >= threshold;
    }

    // ── Late study days ────────────────────────────────
    case "late_study_days": {
      const logs = await prisma.xpLog.findMany({
        where: { userId, amount: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
        take: 400,
      });

      const lateDays = new Set<string>();
      for (const log of logs) {
        const d = log.createdAt;
        if (d.getHours() >= 23) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          lateDays.add(key);
        }
      }

      return lateDays.size >= threshold;
    }

    // ── Causas: total wins ─────────────────────────────
    case "causas_won": {
      const count = await prisma.causaParticipant.count({
        where: { userId, position: 1 },
      });
      return count >= threshold;
    }

    // ── Causas: consecutive win streak ───────────────
    case "causas_win_streak": {
      const recentParts = await prisma.causaParticipant.findMany({
        where: {
          userId,
          room: { status: "finished" },
          position: { not: null },
        },
        orderBy: { joinedAt: "desc" },
        select: { position: true },
        take: threshold,
      });
      if (recentParts.length < threshold) return false;
      return recentParts.every((p) => p.position === 1);
    }

    // ── Weekly champion (evaluated externally) ───────
    case "weekly_champion":
    case "sociedad_de_hecho": {
      return false; // Evaluated by liga cron / future feature
    }

    // ── Causas: group with 3+ players ────────────────
    case "group_causa_players": {
      const count = await prisma.causaParticipant.count({
        where: { userId, room: { maxPlayers: { gte: threshold } } },
      });
      return count >= 1;
    }

    // ── Causas: consecutive wins (undefeated) ──────────
    case "causas_undefeated": {
      const participations = await prisma.causaParticipant.findMany({
        where: {
          userId,
          room: { status: "finished" },
          position: { not: null },
        },
        orderBy: { joinedAt: "desc" },
        select: { position: true },
      });

      let consecutive = 0;
      for (const p of participations) {
        if (p.position === 1) {
          consecutive++;
        } else {
          break;
        }
      }

      return consecutive >= threshold;
    }

    // ── Causas: total participated ─────────────────────
    case "causas_participated": {
      const count = await prisma.causaParticipant.count({
        where: { userId },
      });
      return count >= threshold;
    }

    // ── Causas: group participated ─────────────────────
    case "causas_group_participated": {
      const count = await prisma.causaParticipant.count({
        where: { userId, room: { maxPlayers: { gte: 3 } } },
      });
      return count >= threshold;
    }

    // ── Obiters citados ────────────────────────────────
    case "obiters_cited": {
      const count = await prisma.obiterDictum.count({
        where: { userId, citasCount: { gte: 1 } },
      });
      return count >= threshold;
    }

    // ── Obiter con N+ citas ─────────────────────────
    case "obiter_citations": {
      const obiter = await prisma.obiterDictum.findFirst({
        where: { userId, citasCount: { gte: threshold } },
        select: { id: true },
      });
      return obiter !== null;
    }

    // ── Análisis publicados ────────────────────────────
    case "analisis_published": {
      const count = await prisma.analisisSentencia.count({
        where: { userId, isActive: true, showInFeed: true },
      });
      return count >= threshold;
    }

    // ── Ensayos publicados ─────────────────────────────
    case "ensayos_published": {
      const count = await prisma.ensayo.count({
        where: { userId, isActive: true, showInFeed: true },
      });
      return count >= threshold;
    }

    // ── Expediente Abierto ─────────────────────────────
    case "expediente_argumentos": {
      const count = await prisma.expedienteArgumento.count({
        where: { userId, parentId: null },
      });
      return count >= threshold;
    }

    case "expediente_mejor_alegato": {
      // Check if any expediente has this user's argument as mejorArgumentoId
      const best = await prisma.expediente.findFirst({
        where: { argumentos: { some: { userId } }, mejorArgumentoId: { not: null } },
        include: { argumentos: { where: { userId }, select: { id: true } } },
      });
      if (!best) return false;
      return best.argumentos.some(a => a.id === best.mejorArgumentoId);
    }

    case "expediente_participaciones": {
      const expedientes = await prisma.expedienteArgumento.findMany({
        where: { userId },
        select: { expedienteId: true },
        distinct: ["expedienteId"],
      });
      return expedientes.length >= threshold;
    }

    // ── Peer Review + Ranking ─────────────────────────
    case "reviews_completados": {
      const count = await prisma.peerReview.count({
        where: { reviewerId: userId, estado: "completado" },
      });
      return count >= threshold;
    }

    case "ranking_autor_top3": {
      // This is checked externally when ranking is computed
      return false;
    }

    // ── Colegas count ──────────────────────────────────
    case "colegas_count": {
      const count = await prisma.colegaRequest.count({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
          status: "ACCEPTED",
        },
      });
      return count >= threshold;
    }

    // ── Ayudantía: tutor sessions ──────────────────────
    case "ayudantia_tutor_sessions":
    case "tutor_sessions": {
      const count = await prisma.ayudantiaSesion.count({
        where: { tutorId: userId, status: "completada" },
      });
      return count >= threshold;
    }

    // ── Ayudantía: tutor well-rated ────────────────────
    case "ayudantia_tutor_rated": {
      const minRating: number = check.minRating ?? 4;
      const count = await prisma.ayudantiaSesion.count({
        where: {
          tutorId: userId,
          status: "completada",
          evaluaciones: {
            some: { rating: { gte: minRating } },
          },
        },
      });
      return count >= threshold;
    }

    // ── Eventos creados ────────────────────────────────
    case "eventos_created":
    case "events_created": {
      const count = await prisma.eventoAcademico.count({
        where: { userId },
      });
      return count >= threshold;
    }

    // ── XP total ───────────────────────────────────────
    case "xp_total": {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true },
      });
      if (!user) return false;
      return user.xp >= threshold;
    }

    // ── Plan de estudio: created ───────────────────────
    case "plan_created": {
      const plan = await prisma.planEstudio.findFirst({
        where: { userId },
        select: { id: true },
      });
      return plan !== null;
    }

    // ── Plan: sessions completed ───────────────────────
    case "plan_sessions_completed":
    case "plan_sessions": {
      const count = await prisma.planSesionDiaria.count({
        where: { plan: { userId }, completada: true },
      });
      return count >= threshold;
    }

    // ── Plan: completed ────────────────────────────────
    case "plan_completed":
    case "plan_completion": {
      const plan = await prisma.planEstudio.findFirst({
        where: { userId, estado: "completado" },
        select: { id: true },
      });
      return plan !== null;
    }

    // ── Plan: recalculated and completed (future) ──────
    case "plan_recalculated_and_completed":
    case "plan_recalculated_completed": {
      return false;
    }

    default:
      return false;
  }
}

// ─── Upsert badge ─────────────────────────────────────────

/**
 * Intenta crear un badge. Retorna true si fue nuevo.
 */
async function upsertBadge(
  userId: string,
  badge: string
): Promise<boolean> {
  try {
    await prisma.userBadge.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { userId, badge: badge as any },
    });
    return true;
  } catch {
    // Ya existe (unique constraint)
    return false;
  }
}

// ─── Update user grado ────────────────────────────────────

/**
 * Recalcula el grado del usuario basado en su XP.
 * Si el grado cambió, actualiza la DB y evalúa badges de grado.
 */
export async function updateUserGrado(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, grado: true },
  });
  if (!user) return 1;

  const newGrado = calculateGrado(user.xp);
  if (newGrado !== user.grado) {
    await prisma.user.update({
      where: { id: userId },
      data: { grado: newGrado },
    });
    // Evaluate grado badges
    await evaluateBadges(userId, "grados");
  }

  return newGrado;
}
