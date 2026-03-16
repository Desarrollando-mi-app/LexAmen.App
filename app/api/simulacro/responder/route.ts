import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { INTERROGADORES } from "@/lib/interrogadores";
import { CURRICULUM } from "@/lib/curriculum-data";
import { construirPromptEvaluacion } from "@/lib/simulacro-adaptativo";
import { generarAudioTTS } from "@/lib/tts";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function llamarClaude(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY no configurada");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error: ${res.status} — ${errText}`);
  }

  const data = await res.json();
  return data.content[0]?.text || "";
}

function obtenerContexto(sesion: {
  fuente: string;
  rama: string | null;
  libro: string | null;
  titulo: string | null;
  apuntesTexto: string | null;
}): string {
  if (sesion.fuente === "APUNTES_PROPIOS") {
    const texto = sesion.apuntesTexto || "";
    return texto.length > 8000 ? texto.slice(0, 8000) + "..." : texto;
  }

  const ramaKey = sesion.rama || "DERECHO_CIVIL";
  const ramaData = CURRICULUM[ramaKey];
  if (!ramaData) return `Materia: ${ramaKey}`;

  let contexto = `Materia: ${ramaData.label}`;
  if (sesion.libro) {
    const seccion = ramaData.secciones.find((s) => s.libro === sesion.libro);
    if (seccion) {
      contexto += ` — ${seccion.label}`;
      if (sesion.titulo) {
        const tit = seccion.titulos.find((t) => t.id === sesion.titulo);
        if (tit) contexto += ` — ${tit.label}`;
      }
    }
  }
  return contexto;
}

/**
 * Prompt de evaluación con posibilidad de repregunta.
 * Solo se usa en la primera respuesta si no ha habido intercambio.
 */
function construirPromptConRepregunta(
  systemPrompt: string,
  pregunta: string,
  respuesta: string,
  contexto: string,
  nivel: string
): string {
  return `${systemPrompt}

CONTEXTO DE INTERROGACIÓN:
${contexto}

NIVEL DE DIFICULTAD: ${nivel}

PREGUNTA FORMULADA:
${pregunta}

RESPUESTA DEL ESTUDIANTE:
${respuesta}

Evalúa la respuesta del estudiante manteniéndote en tu personaje.
${nivel === "BASICO" ? "CRITERIO NIVEL BÁSICO: Sé generoso. Una respuesta que capture la idea central debe considerarse CORRECTA aunque omita detalles secundarios.\n" : ""}
Si la respuesta es PARCIALMENTE correcta pero le falta un elemento clave importante,
puedes incluir una "repregunta" breve (máx 30 palabras) para que el estudiante profundice.
Si la respuesta es claramente correcta o claramente incorrecta, pon repregunta como null.

Responde ÚNICAMENTE en JSON con este formato exacto:
{
  "correcta": true,
  "feedback": "tu evaluación en personaje (máx 3 oraciones)",
  "conceptoClave": "el concepto jurídico central",
  "repregunta": "¿Pero qué ocurre con...?" o null
}

Solo JSON válido, sin texto adicional antes ni después.`;
}

// XP rewards
const XP_SESION_COMPLETADA = 5;
const XP_RESPUESTA_CORRECTA = 2;
const XP_BONUS_AVANZADO = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { preguntaId, respuesta, esSegundaRespuesta } = body;

  if (!preguntaId || !respuesta) {
    return NextResponse.json(
      { error: "preguntaId y respuesta requeridos" },
      { status: 400 }
    );
  }

  // Cargar pregunta y sesión
  const pregunta = await prisma.simulacroPregunta.findUnique({
    where: { id: preguntaId },
    include: { sesion: true },
  });

  if (!pregunta || pregunta.sesion.userId !== authUser.id) {
    return NextResponse.json(
      { error: "Pregunta no encontrada" },
      { status: 404 }
    );
  }

  // Si es segunda respuesta (tras repregunta), verificar que ya hay primera
  if (esSegundaRespuesta) {
    if (!pregunta.respuestaUser || pregunta.tipoIntercambio !== "repregunta") {
      return NextResponse.json(
        { error: "No hay repregunta pendiente" },
        { status: 400 }
      );
    }
  } else if (pregunta.respuestaUser) {
    return NextResponse.json(
      { error: "Ya respondiste esta pregunta" },
      { status: 400 }
    );
  }

  const sesion = pregunta.sesion;
  const interrogador = INTERROGADORES[sesion.interrogadorId];
  if (!interrogador) {
    return NextResponse.json(
      { error: "Interrogador no encontrado" },
      { status: 500 }
    );
  }

  const contexto = obtenerContexto(sesion);
  const nivel = pregunta.nivel as "BASICO" | "INTERMEDIO" | "AVANZADO";

  // Build evaluation text
  let respuestaEval = respuesta;
  let preguntaEval = pregunta.preguntaTexto;
  if (esSegundaRespuesta && pregunta.respuestaUser && pregunta.intercambioTexto) {
    preguntaEval = `Pregunta original: "${pregunta.preguntaTexto}"\nRepregunta: "${pregunta.intercambioTexto}"`;
    respuestaEval = `Primera respuesta: "${pregunta.respuestaUser}"\nSegunda respuesta (tras repregunta): "${respuesta}"`;
  }

  // Decide which prompt to use
  const puedeRepreguntar = !esSegundaRespuesta && !pregunta.tipoIntercambio;

  const promptEval = puedeRepreguntar
    ? construirPromptConRepregunta(
        interrogador.systemPrompt,
        preguntaEval,
        respuestaEval,
        contexto,
        nivel
      )
    : construirPromptEvaluacion(
        interrogador,
        preguntaEval,
        respuestaEval,
        contexto,
        nivel
      );

  let evaluacion: {
    correcta: boolean;
    feedback: string;
    conceptoClave: string;
    repregunta?: string | null;
  };
  try {
    const respClaude = await llamarClaude(promptEval);
    const jsonMatch = respClaude.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se pudo parsear JSON de evaluación");
    evaluacion = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Error evaluando respuesta:", err);
    evaluacion = {
      correcta: false,
      feedback: "No fue posible evaluar la respuesta. Intenta nuevamente.",
      conceptoClave: "Error de evaluación",
    };
  }

  // Handle repregunta flow
  const tieneRepregunta =
    puedeRepreguntar && evaluacion.repregunta && !evaluacion.correcta;

  if (tieneRepregunta) {
    // Save first response + repregunta, don't mark as final
    await prisma.simulacroPregunta.update({
      where: { id: preguntaId },
      data: {
        respuestaUser: respuesta,
        intercambioTexto: evaluacion.repregunta,
        tipoIntercambio: "repregunta",
      },
    });

    // TTS for repregunta
    let repreguntaAudioUrl: string | null = null;
    try {
      repreguntaAudioUrl = await generarAudioTTS(
        evaluacion.repregunta!,
        interrogador.voz,
        sesion.id,
        `${preguntaId}-repregunta`
      );
    } catch (err) {
      console.error("Error generando TTS repregunta:", err);
    }

    return NextResponse.json({
      correcta: null,
      feedback: evaluacion.feedback,
      feedbackAudioUrl: null,
      conceptoClave: evaluacion.conceptoClave,
      repregunta: evaluacion.repregunta,
      repreguntaAudioUrl,
      nivelNuevo: sesion.nivelActual,
      sesionCompletada: false,
      stats: {
        correctas: sesion.correctas,
        incorrectas: sesion.incorrectas,
        nivelActual: sesion.nivelActual,
      },
    });
  }

  // Normal flow or second response — final evaluation
  if (esSegundaRespuesta) {
    await prisma.simulacroPregunta.update({
      where: { id: preguntaId },
      data: {
        respuestaIntercambio: respuesta,
        evaluacion: evaluacion.feedback,
        correcta: evaluacion.correcta,
      },
    });
  } else {
    await prisma.simulacroPregunta.update({
      where: { id: preguntaId },
      data: {
        respuestaUser: respuesta,
        evaluacion: evaluacion.feedback,
        correcta: evaluacion.correcta,
      },
    });
  }

  // Actualizar sesión
  const nuevasCorrectas = sesion.correctas + (evaluacion.correcta ? 1 : 0);
  const nuevasIncorrectas = sesion.incorrectas + (evaluacion.correcta ? 0 : 1);
  const sesionCompletada = sesion.preguntaActual >= sesion.totalPreguntas;

  const updateData: Record<string, unknown> = {
    correctas: nuevasCorrectas,
    incorrectas: nuevasIncorrectas,
  };

  if (sesionCompletada) {
    updateData.completada = true;
  }

  await prisma.simulacroSesion.update({
    where: { id: sesion.id },
    data: updateData,
  });

  // XP
  if (sesionCompletada) {
    let xpGanado = XP_SESION_COMPLETADA;
    xpGanado += nuevasCorrectas * XP_RESPUESTA_CORRECTA;
    if (sesion.nivelActual === "AVANZADO") {
      xpGanado += XP_BONUS_AVANZADO;
    }
    await prisma.user.update({
      where: { id: authUser.id },
      data: { xp: { increment: xpGanado } },
    });
  }

  // Generar audio TTS del feedback
  let feedbackAudioUrl: string | null = null;
  try {
    feedbackAudioUrl = await generarAudioTTS(
      evaluacion.feedback,
      interrogador.voz,
      sesion.id,
      `${preguntaId}-feedback`
    );
  } catch (err) {
    console.error("Error generando TTS feedback:", err);
  }

  return NextResponse.json({
    correcta: evaluacion.correcta,
    feedback: evaluacion.feedback,
    feedbackAudioUrl,
    conceptoClave: evaluacion.conceptoClave,
    repregunta: null,
    repreguntaAudioUrl: null,
    nivelNuevo: sesion.nivelActual,
    sesionCompletada,
    stats: {
      correctas: nuevasCorrectas,
      incorrectas: nuevasIncorrectas,
      nivelActual: sesion.nivelActual,
    },
  });
}
