import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { INTERROGADORES } from "@/lib/interrogadores";
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
      max_tokens: 512,
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { preguntaId } = body;

  if (!preguntaId) {
    return NextResponse.json(
      { error: "preguntaId requerido" },
      { status: 400 }
    );
  }

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

  // Ya hubo intercambio
  if (pregunta.tipoIntercambio) {
    return NextResponse.json(
      { error: "Ya se pidió aclaración o hubo repregunta en esta pregunta" },
      { status: 400 }
    );
  }

  const interrogador = INTERROGADORES[pregunta.sesion.interrogadorId];
  if (!interrogador) {
    return NextResponse.json(
      { error: "Interrogador no encontrado" },
      { status: 500 }
    );
  }

  // Generar reformulación
  const prompt = `${interrogador.systemPrompt}

El estudiante no entendió tu pregunta anterior y pide que la reformules.
Pregunta original: "${pregunta.preguntaTexto}"

Reformula la misma pregunta de una manera diferente, más clara y directa.
Puedes usar un ejemplo concreto o simplificar el lenguaje.
NO cambies el tema de la pregunta — es la misma pregunta, dicha de otra forma.
Máximo 60 palabras. Solo la pregunta reformulada, sin preámbulos.`;

  let aclaracion: string;
  try {
    aclaracion = (await llamarClaude(prompt)).trim();
  } catch (err) {
    console.error("Error generando aclaración:", err);
    return NextResponse.json(
      { error: "Error al generar la aclaración" },
      { status: 500 }
    );
  }

  // Guardar intercambio
  await prisma.simulacroPregunta.update({
    where: { id: preguntaId },
    data: {
      intercambioTexto: aclaracion,
      tipoIntercambio: "aclaracion",
    },
  });

  // TTS
  let audioUrl: string | null = null;
  try {
    audioUrl = await generarAudioTTS(
      aclaracion,
      interrogador.voz,
      pregunta.sesionId,
      `${preguntaId}-aclaracion`
    );
  } catch (err) {
    console.error("Error generando TTS aclaración:", err);
  }

  return NextResponse.json({ aclaracion, audioUrl });
}
