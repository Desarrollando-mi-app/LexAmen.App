import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { isFreePlan } from "@/lib/plan-utils";

const VALID_SPEEDS = [0.75, 1.0, 1.25];

/**
 * POST /api/dictado/tts — generate TTS audio for a dictado (PAID ONLY)
 * Body: { dictadoId: string, speed?: number }
 * Returns base64 audio data URL to avoid storage costs.
 */
export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, isAdmin: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (isFreePlan(dbUser)) {
    return NextResponse.json(
      { error: "Dictado Juridico es exclusivo para planes de pago." },
      { status: 403 },
    );
  }

  // 2. Parse body
  let body: { dictadoId: string; speed?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const { dictadoId, speed: rawSpeed } = body;

  if (!dictadoId) {
    return NextResponse.json({ error: "dictadoId es requerido" }, { status: 400 });
  }

  const speed = rawSpeed && VALID_SPEEDS.includes(rawSpeed) ? rawSpeed : 1.0;

  // 3. Fetch dictado
  const dictado = await prisma.dictadoJuridico.findUnique({
    where: { id: dictadoId },
    select: { textoCompleto: true },
  });

  if (!dictado) {
    return NextResponse.json({ error: "Dictado no encontrado" }, { status: 404 });
  }

  // 4. Generate TTS with OpenAI directly (custom speed)
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: dictado.textoCompleto,
      speed,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const base64 = buffer.toString("base64");

    return NextResponse.json({
      audioUrl: `data:audio/mpeg;base64,${base64}`,
    });
  } catch (err) {
    console.error("Error generating TTS for dictado:", err);
    return NextResponse.json(
      { error: "Error generando audio. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
