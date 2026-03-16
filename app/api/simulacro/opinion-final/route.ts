import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { INTERROGADORES } from "@/lib/interrogadores";

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { sesionId } = body;

  if (!sesionId) {
    return NextResponse.json({ error: "sesionId requerido" }, { status: 400 });
  }

  const sesion = await prisma.simulacroSesion.findUnique({
    where: { id: sesionId },
    include: {
      preguntas: { orderBy: { numero: "asc" } },
    },
  });

  if (!sesion || sesion.userId !== authUser.id) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  // If already generated, return cached
  if (sesion.opinionFinal) {
    return NextResponse.json({ opinion: sesion.opinionFinal });
  }

  const interrogador = INTERROGADORES[sesion.interrogadorId];
  if (!interrogador) {
    return NextResponse.json({ error: "Interrogador no encontrado" }, { status: 500 });
  }

  // Build detail
  const detalle = sesion.preguntas
    .filter((p) => p.respuestaUser)
    .map(
      (p, i) =>
        `${i + 1}. Pregunta: "${p.preguntaTexto}" | Respuesta: "${p.respuestaUser}" | ${p.correcta ? "Correcta" : "Incorrecta"} | Feedback: "${p.evaluacion || "sin feedback"}"`
    )
    .join("\n");

  const prompt = `${interrogador.systemPrompt}

El estudiante acaba de completar una sesión de ${sesion.totalPreguntas} preguntas.
Resultados: ${sesion.correctas} correctas, ${sesion.incorrectas} incorrectas.
Nivel alcanzado: ${sesion.nivelActual}.

Detalle de cada pregunta:
${detalle}

Como ${interrogador.nombre}, escribe una opinión final de 150-200 palabras evaluando el desempeño general del estudiante. Incluye:
- Fortalezas detectadas
- Áreas que necesita reforzar
- 3 recomendaciones concretas de estudio
- Una nota de aliento o exigencia (según tu personalidad)

Escribe en primera persona, en tu estilo natural. Solo el texto de la opinión, sin formato JSON.`;

  try {
    const opinion = (await llamarClaude(prompt)).trim();

    // Save to DB
    await prisma.simulacroSesion.update({
      where: { id: sesionId },
      data: { opinionFinal: opinion },
    });

    return NextResponse.json({ opinion });
  } catch (err) {
    console.error("Error generando opinión final:", err);
    return NextResponse.json(
      { error: "Error al generar la opinión del interrogador" },
      { status: 500 }
    );
  }
}
