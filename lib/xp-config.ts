// ═══════════════════════════════════════════════════════════════
// SISTEMA DE XP — Constantes centralizadas y función awardXp()
// Studio Iuris · Reestructuración Completa
// ═══════════════════════════════════════════════════════════════

import { getCurrentWeekBounds } from "@/lib/league";

// ─── Categorías para desglose de liga ───────────────────────
export type XpCategory =
  | "estudio" // Flashcards, MCQ, V/F, Definiciones
  | "simulacro" // Simulacro Oral
  | "causas" // Causas 1v1 y Room
  | "publicaciones" // Diario (Análisis, Ensayos) + Obiter Dictum
  | "bonus"; // Rachas, streaks, bonificaciones

// ═══ ESTUDIO ═══════════════════════════════════════════════════

// Flashcards
export const XP_FLASHCARD_REVIEW = 1; // Cualquier revisión
export const XP_FLASHCARD_KNEW = 2; // "La sabía" (quality >= 3)
export const XP_FLASHCARD_FIRST_MASTERY = 5; // Primera vez que rep >= 3

// MCQ
export const XP_MCQ_CORRECT_BASICO = 5;
export const XP_MCQ_CORRECT_INTERMEDIO = 10;
export const XP_MCQ_CORRECT_AVANZADO = 15;
export const XP_MCQ_INCORRECT = 0; // Antes era 1

// V/F
export const XP_VF_CORRECT_BASICO = 3;
export const XP_VF_CORRECT_INTERMEDIO = 6;
export const XP_VF_CORRECT_AVANZADO = 9;
export const XP_VF_INCORRECT = 0; // Antes era 1

// Definiciones
export const XP_DEFINICION_CORRECT = 4; // Antes era 2
export const XP_DEFINICION_INCORRECT = 0;

// ═══ SIMULACRO ═════════════════════════════════════════════════

export const XP_SIMULACRO_COMPLETADO_BASE = 10; // Antes era 5
export const XP_SIMULACRO_POR_CORRECTA = 3; // Antes era 2
export const XP_SIMULACRO_BONUS_AVANZADO = 10; // Antes era 5
export const XP_SIMULACRO_SUSPENDIDO_BASE = 5; // Antes era 3
export const XP_SIMULACRO_SUSPENDIDO_CORRECTA = 2; // Se mantiene
export const XP_SIMULACRO_SUSPENDIDO_AVANZADO = 5; // Antes era 3

// ═══ CAUSAS ════════════════════════════════════════════════════

export const XP_CAUSA_1V1_GANADOR = 20;
export const XP_CAUSA_1V1_PERDEDOR = 5; // Antes era 0
export const XP_CAUSA_ROOM_1RO = 30;
export const XP_CAUSA_ROOM_2DO = 15;
export const XP_CAUSA_ROOM_3RO = 10;
export const XP_CAUSA_ROOM_PARTICIPANTE = 5;

// ═══ PUBLICACIONES ═════════════════════════════════════════════

export const XP_PUBLICAR_ANALISIS = 25; // Antes era 15
export const XP_PUBLICAR_ENSAYO = 25; // Antes era 15
export const XP_RECIBIR_COMUNIQUESE_DIARIO = 5; // Antes era 3
export const XP_CITADO_OBITER = 10; // Se mantiene
export const XP_RECIBIR_COMUNIQUESE_OBITER = 3; // Se mantiene

// ═══ BONUS ═════════════════════════════════════════════════════

export const XP_STREAK_5_CORRECTAS = 10;
export const XP_STREAK_10_CORRECTAS = 25;
export const XP_RACHA_DIARIA = 5; // +5 por estudiar cada día
export const XP_PENALIZACION_ROMPER_RACHA = -10; // -10 por romper racha

// ─── Streak bonus (MCQ/VF consecutive correct) ─────────────
export function calculateStreakBonus(consecutiveCorrect: number): number {
  if (consecutiveCorrect >= 10) return XP_STREAK_10_CORRECTAS;
  if (consecutiveCorrect >= 5) return XP_STREAK_5_CORRECTAS;
  return 0;
}

// ─── MCQ / VF XP calculation ────────────────────────────────
export type StudyContentType = "MCQ" | "TRUEFALSE" | "FLASHCARD";

const MCQ_XP: Record<string, { correct: number; incorrect: number }> = {
  BASICO: { correct: XP_MCQ_CORRECT_BASICO, incorrect: XP_MCQ_INCORRECT },
  INTERMEDIO: { correct: XP_MCQ_CORRECT_INTERMEDIO, incorrect: XP_MCQ_INCORRECT },
  AVANZADO: { correct: XP_MCQ_CORRECT_AVANZADO, incorrect: XP_MCQ_INCORRECT },
};

const TF_XP: Record<string, { correct: number; incorrect: number }> = {
  BASICO: { correct: XP_VF_CORRECT_BASICO, incorrect: XP_VF_INCORRECT },
  INTERMEDIO: { correct: XP_VF_CORRECT_INTERMEDIO, incorrect: XP_VF_INCORRECT },
  AVANZADO: { correct: XP_VF_CORRECT_AVANZADO, incorrect: XP_VF_INCORRECT },
};

export function calculateXP(
  contentType: StudyContentType,
  nivel: string,
  isCorrect: boolean
): number {
  if (contentType === "FLASHCARD") return 0;

  const table = contentType === "MCQ" ? MCQ_XP : TF_XP;
  const entry = table[nivel] ?? table["BASICO"];

  return isCorrect ? entry.correct : entry.incorrect;
}

// ═══════════════════════════════════════════════════════════════
// awardXp — Función centralizada para otorgar/penalizar XP
// ═══════════════════════════════════════════════════════════════

export async function awardXp(params: {
  userId: string;
  amount: number;
  category: XpCategory;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any;
}): Promise<void> {
  const { userId, amount, category, prisma } = params;

  if (amount === 0) return;

  const { weekStart } = getCurrentWeekBounds();

  if (amount > 0) {
    // ─── Positive XP: increment user.xp + leagueMember.weeklyXp ───
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
    });

    await prisma.leagueMember.updateMany({
      where: {
        userId,
        league: { weekStart },
      },
      data: { weeklyXp: { increment: amount } },
    });
  } else {
    // ─── Penalty: never below 0, does NOT affect weeklyXp ───
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    });
    const newXp = Math.max(0, (user?.xp || 0) + amount);
    await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp },
    });
    // weeklyXp NOT decremented for penalties
  }

  // ─── Register in XpLog for desglose ───
  await prisma.xpLog.create({
    data: {
      userId,
      amount,
      category,
    },
  });

  // ─── Daily streak bonus: +5 XP for first study/simulacro of the day ───
  if (amount > 0 && (category === "estudio" || category === "simulacro")) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If this is the first study/simulacro activity today, grant daily bonus
    const countToday = await prisma.xpLog.count({
      where: {
        userId,
        category: { in: ["estudio", "simulacro"] },
        createdAt: { gte: today },
        amount: { gt: 0 },
      },
    });

    if (countToday === 1) {
      // First study/simulacro activity today → daily streak bonus
      await prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: XP_RACHA_DIARIA } },
      });

      await prisma.leagueMember.updateMany({
        where: {
          userId,
          league: { weekStart },
        },
        data: { weeklyXp: { increment: XP_RACHA_DIARIA } },
      });

      await prisma.xpLog.create({
        data: { userId, amount: XP_RACHA_DIARIA, category: "bonus" },
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// checkStreakPenalty — Penalización por romper racha
// Llamar al cargar el dashboard
// ═══════════════════════════════════════════════════════════════

export async function checkStreakPenalty(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: any
): Promise<void> {
  // Find last study activity
  const lastStudy = await prisma.xpLog.findFirst({
    where: {
      userId,
      category: { in: ["estudio", "simulacro"] },
      amount: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!lastStudy) return; // Never studied, no penalty

  const lastStudyDate = new Date(lastStudy.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - lastStudyDate.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays >= 2) {
    // Streak broken (didn't study yesterday)
    // Check if penalty was already applied today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyPenalized = await prisma.xpLog.findFirst({
      where: {
        userId,
        amount: XP_PENALIZACION_ROMPER_RACHA,
        category: "bonus",
        createdAt: { gte: today },
      },
    });

    if (!alreadyPenalized) {
      await awardXp({
        userId,
        amount: XP_PENALIZACION_ROMPER_RACHA, // -10
        category: "bonus",
        prisma,
      });
    }
  }
}
