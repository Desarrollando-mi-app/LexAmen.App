// ─── Scoring de Causas (Duelos 1v1) ─────────────────────────
// Respuesta correcta: 10 puntos base
// Bonus velocidad:
//   < 5 segundos:  +5 puntos
//   5-10 segundos: +3 puntos
//   10-20 segundos: +1 punto
//   > 20 segundos:  +0 puntos
// Máximo por pregunta: 15 puntos
// Máximo total (10 preguntas): 150 puntos

export function calculateCausaScore(
  isCorrect: boolean,
  timeMs: number
): number {
  if (!isCorrect) return 0;

  let score = 10;

  if (timeMs < 5000) {
    score += 5;
  } else if (timeMs < 10000) {
    score += 3;
  } else if (timeMs < 20000) {
    score += 1;
  }

  return score;
}

export const CAUSA_QUESTIONS = 10;
export const CAUSA_TIME_LIMIT_MS = 30000; // 30 segundos por pregunta
export const CAUSA_WINNER_XP = 20; // XP extra para el ganador
