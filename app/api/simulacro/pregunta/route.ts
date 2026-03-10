import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { INTERROGADORES } from "@/lib/interrogadores";
import { CURRICULUM } from "@/lib/curriculum-data";
import {
  construirPromptPregunta,
  calcularNuevoNivel,
  contarConsecutivasCorrectas,
  contarIncorrectasRecientes,
} from "@/lib/simulacro-adaptativo";
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

  // INDICE_MAESTRO — construir contexto desde CURRICULUM
  const ramaKey = sesion.rama || "DERECHO_CIVIL";
  const ramaData = CURRICULUM[ramaKey];
  if (!ramaData) return `Materia: ${ramaKey}`;

  let contexto = `Materia: ${ramaData.label} (${ramaData.codigo})`;

  if (sesion.libro) {
    const seccion = ramaData.secciones.find((s) => s.libro === sesion.libro);
    if (seccion) {
      contexto += `\nLibro/Sección: ${seccion.label}`;

      if (sesion.titulo) {
        const tit = seccion.titulos.find((t) => t.id === sesion.titulo);
        if (tit) {
          contexto += `\nTítulo: ${tit.label}`;
          if (tit.articulosRef) contexto += ` (${tit.articulosRef})`;
          if (tit.parrafos && tit.parrafos.length > 0) {
            contexto += `\nTemas: ${tit.parrafos.join(", ")}`;
          }
        }
      } else {
        // Todos los títulos de la sección
        const temas = seccion.titulos.map((t) => t.label).join("; ");
        contexto += `\nTemas incluidos: ${temas}`;
      }

      if (seccion.leyesAnexas && seccion.leyesAnexas.length > 0) {
        const leyes = seccion.leyesAnexas.map((l) => `${l.ley}: ${l.label}`).join("; ");
        contexto += `\nLeyes anexas: ${leyes}`;
      }
    }
  } else {
    // Todas las secciones de la rama
    const secciones = ramaData.secciones.map((s) => s.label).join("; ");
    contexto += `\nSecciones: ${secciones}`;
  }

  return contexto;
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
    return NextResponse.json(
      { error: "sesionId requerido" },
      { status: 400 }
    );
  }

  // Cargar sesión con historial
  const sesion = await prisma.simulacroSesion.findUnique({
    where: { id: sesionId },
    include: {
      preguntas: { orderBy: { numero: "asc" } },
    },
  });

  if (!sesion || sesion.userId !== authUser.id) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 }
    );
  }

  if (sesion.completada) {
    return NextResponse.json(
      { error: "La sesión ya está completada" },
      { status: 400 }
    );
  }

  const interrogador = INTERROGADORES[sesion.interrogadorId];
  if (!interrogador) {
    return NextResponse.json(
      { error: "Interrogador no encontrado" },
      { status: 500 }
    );
  }

  // Calcular nivel adaptativo
  const resultados = sesion.preguntas.map((p) => ({
    correcta: p.correcta,
  }));
  const consecutivas = contarConsecutivasCorrectas(resultados);
  const incorrectasRec = contarIncorrectasRecientes(resultados);
  const nuevoNivel = calcularNuevoNivel(
    sesion.nivelActual as "BASICO" | "INTERMEDIO" | "AVANZADO",
    consecutivas,
    incorrectasRec
  );

  // Actualizar nivel si cambió
  if (nuevoNivel !== sesion.nivelActual) {
    await prisma.simulacroSesion.update({
      where: { id: sesionId },
      data: { nivelActual: nuevoNivel },
    });
  }

  // Construir contexto y prompt
  const contexto = obtenerContexto(sesion);
  const historialPreguntas = sesion.preguntas.map((p) => p.preguntaTexto);
  const numeroPregunta = sesion.preguntaActual + 1;

  const prompt = construirPromptPregunta(
    interrogador,
    nuevoNivel,
    contexto,
    historialPreguntas,
    numeroPregunta
  );

  // Llamar a Claude para generar la pregunta
  let preguntaTexto: string;
  try {
    preguntaTexto = await llamarClaude(prompt);
    preguntaTexto = preguntaTexto.trim();
  } catch (err) {
    console.error("Error generando pregunta:", err);
    return NextResponse.json(
      { error: "Error al generar la pregunta" },
      { status: 500 }
    );
  }

  // Guardar pregunta en BD
  const pregunta = await prisma.simulacroPregunta.create({
    data: {
      sesionId,
      numero: numeroPregunta,
      nivel: nuevoNivel,
      preguntaTexto,
    },
  });

  // Actualizar preguntaActual
  await prisma.simulacroSesion.update({
    where: { id: sesionId },
    data: { preguntaActual: numeroPregunta },
  });

  // Generar audio TTS
  let audioUrl: string | null = null;
  try {
    audioUrl = await generarAudioTTS(
      preguntaTexto,
      interrogador.voz,
      sesionId,
      pregunta.id
    );
  } catch (err) {
    console.error("Error generando TTS:", err);
    // Continuar sin audio — no es fatal
  }

  return NextResponse.json({
    preguntaId: pregunta.id,
    preguntaTexto,
    audioUrl,
    numero: numeroPregunta,
    nivel: nuevoNivel,
    totalPreguntas: sesion.totalPreguntas,
  });
}
