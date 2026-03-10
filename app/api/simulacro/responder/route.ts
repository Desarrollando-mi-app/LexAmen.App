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
  const { preguntaId, respuesta } = body;

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

  if (pregunta.respuestaUser) {
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

  // Evaluar con Claude
  const contexto = obtenerContexto(sesion);
  const promptEval = construirPromptEvaluacion(
    interrogador,
    pregunta.preguntaTexto,
    respuesta,
    contexto,
    pregunta.nivel as "BASICO" | "INTERMEDIO" | "AVANZADO"
  );

  let evaluacion: { correcta: boolean; feedback: string; conceptoClave: string };
  try {
    const respClaude = await llamarClaude(promptEval);

    // Extraer JSON — puede estar envuelto en markdown
    const jsonMatch = respClaude.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No se pudo parsear JSON de evaluación");
    evaluacion = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("Error evaluando respuesta:", err);
    // Fallback
    evaluacion = {
      correcta: false,
      feedback: "No fue posible evaluar la respuesta. Intenta nuevamente.",
      conceptoClave: "Error de evaluación",
    };
  }

  // Actualizar pregunta
  await prisma.simulacroPregunta.update({
    where: { id: preguntaId },
    data: {
      respuestaUser: respuesta,
      evaluacion: evaluacion.feedback,
      correcta: evaluacion.correcta,
    },
  });

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
    nivelNuevo: sesion.nivelActual,
    sesionCompletada,
    stats: {
      correctas: nuevasCorrectas,
      incorrectas: nuevasIncorrectas,
      nivelActual: sesion.nivelActual,
    },
  });
}
