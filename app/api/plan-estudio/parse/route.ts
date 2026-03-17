/**
 * POST /api/plan-estudio/parse — Parsear cedularios del Plan de Estudio con Claude API
 *
 * Toma los textos ya extraídos de hasta 3 PDFs (pdf1Texto, pdf2Texto, pdf3Texto),
 * los envía a Claude para mapear temas al Índice Maestro, y guarda PlanTema records.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getMateriasForPrompt } from "@/lib/mi-examen-utils";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_TEXT_LENGTH = 15000;

// ─── Types ─────────────────────────────────────────────────

interface ParsedPlanTema {
  nombre: string;
  rama: string;
  libro?: string | null;
  titulo: string;
  parrafo?: string | null;
  prioridad: number;
  estimacionHoras: number;
}

// ─── Claude API call ───────────────────────────────────────

async function callClaudeAPI(
  pdfTexts: { label: string; text: string }[],
  materiasDisponibles: string
): Promise<ParsedPlanTema[]> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no configurada");
  }

  const systemPrompt = `Eres un asistente especializado en derecho civil, procesal civil y derecho orgánico chileno.
Tu tarea es analizar uno o más cedularios de examen de grado y extraer los temas que lo componen,
mapeándolos a las categorías de contenido disponibles en la plataforma de estudio (Índice Maestro).

IMPORTANTE:
- Extrae TODOS los temas de todos los PDFs proporcionados, sin omitir ninguno
- Si un tema aparece en múltiples PDFs, inclúyelo UNA sola vez pero con prioridad más alta
- Cada tema DEBE mapearse a una rama, un titulo, y opcionalmente libro y parrafo del Índice Maestro
- Si un tema no tiene correspondencia clara con el Índice Maestro, haz tu mejor aproximación
- Asigna prioridad según la frecuencia/importancia con que aparece en los cedularios
- Estima las horas necesarias para dominar cada tema
- Responde SOLO con JSON válido, sin texto adicional ni markdown`;

  const pdfSections = pdfTexts
    .map(
      (p) => `=== ${p.label} ===\n${p.text.slice(0, MAX_TEXT_LENGTH)}`
    )
    .join("\n\n");

  const userPrompt = `Aquí están los cedularios del alumno:

---
${pdfSections}
---

Y estas son las categorías de contenido disponibles en nuestra plataforma (Índice Maestro):
${materiasDisponibles}

Analiza los cedularios y devuelve un JSON con la siguiente estructura:
{
  "temas": [
    {
      "nombre": "Nombre descriptivo del tema",
      "rama": "DERECHO_CIVIL | DERECHO_PROCESAL_CIVIL | DERECHO_ORGANICO",
      "libro": "TITULO_PRELIMINAR | MENSAJE | LIBRO_I | LIBRO_II | LIBRO_III | LIBRO_IV | LIBRO_I_CPC | LIBRO_II_CPC | LIBRO_III_CPC | LIBRO_IV_CPC | TITULO_FINAL | LIBRO_COT | null",
      "titulo": "Título específico del Índice Maestro (ej: 'Título I: De las personas')",
      "parrafo": "Párrafo específico si aplica, o null",
      "prioridad": 1,
      "estimacionHoras": 2.0
    }
  ]
}

Reglas de mapeo:
- rama SOLO puede ser: "DERECHO_CIVIL", "DERECHO_PROCESAL_CIVIL", o "DERECHO_ORGANICO"
- libro debe ser uno de los valores exactos listados arriba, o null si no aplica
- Para DERECHO_CIVIL: usa TITULO_PRELIMINAR, MENSAJE, LIBRO_I, LIBRO_II, LIBRO_III, LIBRO_IV
- Para DERECHO_PROCESAL_CIVIL: usa LIBRO_I_CPC, LIBRO_II_CPC, LIBRO_III_CPC, LIBRO_IV_CPC, TITULO_FINAL
- Para DERECHO_ORGANICO: usa LIBRO_COT
- titulo debe ser el título más específico que corresponda del Índice Maestro
- Si hay duda entre opciones, prefiere el match más específico

Reglas de prioridad:
- 1 = Alta: tema que aparece frecuentemente, es central en los cedularios
- 2 = Media: tema que aparece con frecuencia normal
- 3 = Baja: tema mencionado brevemente o de forma tangencial

Reglas de estimacionHoras (horas estimadas para dominar el tema):
- Mínimo 0.5 horas (temas simples/puntuales)
- Máximo 4 horas (temas amplios y complejos)
- Considera la complejidad y extensión del contenido`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error: ${res.status} — ${errText}`);
  }

  const data = await res.json();
  const responseText = data.content[0]?.text || "";

  // Parse JSON from response (handle potential markdown wrapping)
  let jsonStr = responseText.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  if (!parsed.temas || !Array.isArray(parsed.temas)) {
    throw new Error("La respuesta de Claude no contiene un array de temas");
  }

  return parsed.temas;
}

// ─── POST handler ──────────────────────────────────────────

export async function POST() {
  // 1. Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Get PlanEstudio for user
  const plan = await prisma.planEstudio.findUnique({
    where: { userId: user.id },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "Plan de estudio no encontrado" },
      { status: 404 }
    );
  }

  // 3. Collect texts from pdf1Texto, pdf2Texto, pdf3Texto
  const pdfTexts: { label: string; text: string }[] = [];

  if (plan.pdf1Texto && plan.pdf1Texto.trim().length > 0) {
    pdfTexts.push({
      label: `PDF 1: ${plan.pdf1Nombre || "Cedulario 1"}`,
      text: plan.pdf1Texto,
    });
  }
  if (plan.pdf2Texto && plan.pdf2Texto.trim().length > 0) {
    pdfTexts.push({
      label: `PDF 2: ${plan.pdf2Nombre || "Cedulario 2"}`,
      text: plan.pdf2Texto,
    });
  }
  if (plan.pdf3Texto && plan.pdf3Texto.trim().length > 0) {
    pdfTexts.push({
      label: `PDF 3: ${plan.pdf3Nombre || "Cedulario 3"}`,
      text: plan.pdf3Texto,
    });
  }

  if (pdfTexts.length === 0) {
    return NextResponse.json(
      {
        error:
          "No hay textos de cedulario disponibles. Sube al menos un PDF primero.",
      },
      { status: 400 }
    );
  }

  try {
    // 4. Get available materias via getMateriasForPrompt()
    const materiasDisponibles = await getMateriasForPrompt();

    // 5. Call Claude API with all PDF texts combined
    const parsedTemas = await callClaudeAPI(pdfTexts, materiasDisponibles);

    // 6. Delete existing PlanTemas for this plan
    await prisma.planTema.deleteMany({
      where: { planId: plan.id },
    });

    // 7. Create new PlanTema records
    const temasToCreate = parsedTemas.map((tema) => ({
      planId: plan.id,
      nombre: tema.nombre,
      rama: tema.rama,
      libro: tema.libro || null,
      titulo: tema.titulo,
      parrafo: tema.parrafo || null,
      prioridad: Math.max(1, Math.min(3, tema.prioridad || 2)),
      estimacionHoras: Math.max(
        0.5,
        Math.min(4, tema.estimacionHoras || 1)
      ),
      completado: false,
      porcentaje: 0,
    }));

    await prisma.planTema.createMany({
      data: temasToCreate,
    });

    // 8. Update plan estado to "configurando" (still needs to generate sessions)
    await prisma.planEstudio.update({
      where: { id: plan.id },
      data: { estado: "configurando" },
    });

    // 9. Fetch created temas to return
    const createdTemas = await prisma.planTema.findMany({
      where: { planId: plan.id },
      orderBy: { prioridad: "asc" },
    });

    const totalHorasEstimadas = createdTemas.reduce(
      (sum, t) => sum + t.estimacionHoras,
      0
    );

    return NextResponse.json({
      temas: createdTemas,
      totalHorasEstimadas: Math.round(totalHorasEstimadas * 10) / 10,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Error desconocido al parsear";

    console.error("Plan estudio parse error:", err);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
