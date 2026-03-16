/**
 * Lógica adaptativa para el Simulacro de Interrogación Oral.
 * Ajusta la dificultad según el rendimiento del estudiante.
 */

import type { InterrogadorData } from "./interrogadores";

type NivelDificultad = "BASICO" | "INTERMEDIO" | "AVANZADO";

// ─── Reglas de adaptación ───────────────────────────────

export const REGLAS_ADAPTATIVAS = {
  correctasParaSubir: 2,   // 2 correctas consecutivas → sube nivel
  incorrectasParaBajar: 3, // 3 incorrectas en últimas 5 → baja nivel
};

export function calcularNuevoNivel(
  nivelActual: NivelDificultad,
  consecutivasCorrectas: number,
  incorrectasRecientes: number // en las últimas 5 preguntas
): NivelDificultad {
  if (consecutivasCorrectas >= REGLAS_ADAPTATIVAS.correctasParaSubir) {
    if (nivelActual === "BASICO") return "INTERMEDIO";
    if (nivelActual === "INTERMEDIO") return "AVANZADO";
  }
  if (incorrectasRecientes >= REGLAS_ADAPTATIVAS.incorrectasParaBajar) {
    if (nivelActual === "AVANZADO") return "INTERMEDIO";
    if (nivelActual === "INTERMEDIO") return "BASICO";
  }
  return nivelActual;
}

// ─── Contadores de rendimiento ──────────────────────────

export function contarConsecutivasCorrectas(
  resultados: Array<{ correcta: boolean | null }>
): number {
  let count = 0;
  for (let i = resultados.length - 1; i >= 0; i--) {
    if (resultados[i].correcta === true) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function contarIncorrectasRecientes(
  resultados: Array<{ correcta: boolean | null }>,
  ventana: number = 5
): number {
  const recientes = resultados.slice(-ventana);
  return recientes.filter((r) => r.correcta === false).length;
}

// ─── Prompt builders ────────────────────────────────────

export function construirPromptPregunta(
  interrogador: InterrogadorData,
  nivel: NivelDificultad,
  contexto: string,
  historialPreguntas: string[],
  numeroPregunta: number
): string {
  const instruccionNivel: Record<NivelDificultad, string> = {
    BASICO:
      "Pregunta sobre UNA definición simple y directa. El estudiante solo necesita recordar UN concepto o definición. NO pidas comparaciones, análisis ni relaciones entre conceptos. Ej: '¿Qué es el acto jurídico?' La respuesta correcta debe poder darse en 2-3 oraciones.",
    INTERMEDIO:
      "Haz una pregunta de comprensión y aplicación. Ej: ¿Qué ocurre si...? ¿Cómo se distingue...? ¿Cuál es el efecto de...?",
    AVANZADO:
      "Haz una pregunta compleja de análisis crítico o caso práctico. Ej: ¿Cómo resolvería...? ¿Es válido que...? Presente una situación ambigua.",
  };

  const historialTexto =
    historialPreguntas.length > 0
      ? historialPreguntas.map((p, i) => `${i + 1}. ${p}`).join("\n")
      : "(ninguna aún)";

  return `${interrogador.systemPrompt}

CONTEXTO DE INTERROGACIÓN:
${contexto}

INSTRUCCIÓN DE NIVEL (${nivel}):
${instruccionNivel[nivel]}

PREGUNTAS YA HECHAS (no repetir):
${historialTexto}

Esta es la pregunta número ${numeroPregunta}.
Genera UNA sola pregunta. Solo la pregunta, sin explicaciones adicionales.
La pregunta debe basarse estrictamente en el contexto proporcionado.
Recuerda: sé conciso. Máximo 80 palabras. Contexto breve + pregunta directa.`;
}

export function construirPromptEvaluacion(
  interrogador: InterrogadorData,
  pregunta: string,
  respuesta: string,
  contexto: string,
  nivel: NivelDificultad
): string {
  return `${interrogador.systemPrompt}

CONTEXTO DE INTERROGACIÓN:
${contexto}

NIVEL DE DIFICULTAD: ${nivel}

PREGUNTA FORMULADA:
${pregunta}

RESPUESTA DEL ESTUDIANTE:
${respuesta}

Evalúa la respuesta del estudiante manteniéndote en tu personaje.
${nivel === "BASICO" ? "CRITERIO NIVEL BÁSICO: Sé generoso. Una respuesta que capture la idea central debe considerarse CORRECTA aunque omita detalles secundarios o no use terminología técnica exacta. El objetivo del nivel básico es verificar comprensión general, no precisión doctrinal. Acepta respuestas que demuestren que el estudiante entiende el concepto básico.\n" : ""}Responde ÚNICAMENTE en JSON con este formato exacto:
{
  "correcta": true,
  "feedback": "tu respuesta en personaje al estudiante (máx 3 oraciones)",
  "conceptoClave": "el concepto jurídico central que se evaluó"
}

Solo JSON válido, sin texto adicional antes ni después.`;
}
