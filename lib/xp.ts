// ─── Sistema de XP por nivel ────────────────────────────────
// MCQ: BASICO=5, INTERMEDIO=10, AVANZADO=15, incorrect=1
// V/F: BASICO=3, INTERMEDIO=6, AVANZADO=9, incorrect=1
// Flashcards: 0 XP (fácil hacer trampa con repetición espaciada)

export type ContentType = "MCQ" | "TRUEFALSE" | "FLASHCARD";

const MCQ_XP: Record<string, { correct: number; incorrect: number }> = {
  BASICO: { correct: 5, incorrect: 1 },
  INTERMEDIO: { correct: 10, incorrect: 1 },
  AVANZADO: { correct: 15, incorrect: 1 },
};

const TF_XP: Record<string, { correct: number; incorrect: number }> = {
  BASICO: { correct: 3, incorrect: 1 },
  INTERMEDIO: { correct: 6, incorrect: 1 },
  AVANZADO: { correct: 9, incorrect: 1 },
};

export function calculateXP(
  contentType: ContentType,
  nivel: string,
  isCorrect: boolean
): number {
  if (contentType === "FLASHCARD") return 0;

  const table = contentType === "MCQ" ? MCQ_XP : TF_XP;
  const entry = table[nivel] ?? table["BASICO"];

  return isCorrect ? entry.correct : entry.incorrect;
}

// ─── Bonus de racha ─────────────────────────────────────────
// 5 correctas seguidas = +10 XP bonus
// 10 correctas seguidas = +25 XP bonus

export function calculateStreakBonus(consecutiveCorrect: number): number {
  if (consecutiveCorrect >= 10) return 25;
  if (consecutiveCorrect >= 5) return 10;
  return 0;
}
