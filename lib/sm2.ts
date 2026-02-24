// ─── Algoritmo SM-2 (SuperMemo 2) ─────────────────────────
// Implementación pura sin side-effects para repetición espaciada.
// Referencia: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method

export type SM2Input = {
  quality: number; // 0 = no lo sabía, 3 = con dificultad, 5 = lo sabía
  repetitions: number;
  interval: number; // en días
  easeFactor: number;
};

export type SM2Result = {
  repetitions: number;
  interval: number; // en días
  easeFactor: number;
  nextReviewAt: Date;
};

export function calculateSM2({
  quality,
  repetitions,
  interval,
  easeFactor,
}: SM2Input): SM2Result {
  let newRepetitions: number;
  let newInterval: number;
  let newEaseFactor: number;

  // Calcular nuevo easeFactor
  newEaseFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // easeFactor mínimo: 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  if (quality >= 3) {
    // Respuesta correcta (con dificultad o fácil)
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Respuesta incorrecta — resetear
    newRepetitions = 0;
    newInterval = 1;
  }

  // Calcular próxima fecha de revisión
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);
  nextReviewAt.setHours(0, 0, 0, 0); // Inicio del día

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: Math.round(newEaseFactor * 100) / 100, // 2 decimales
    nextReviewAt,
  };
}
