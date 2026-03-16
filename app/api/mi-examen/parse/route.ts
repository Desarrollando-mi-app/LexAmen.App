/**
 * POST /api/mi-examen/parse — Parsear cedulario con Claude API
 *
 * Extrae temas del cedulario (texto o PDF), los mapea al contenido
 * de Studio Iuris usando Claude, y guarda los ExamenTema resultantes.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import {
  getMateriasForPrompt,
  countContentForMapping,
} from "@/lib/mi-examen-utils";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── Types ─────────────────────────────────────────────────

interface ParsedTema {
  nombre: string;
  descripcion?: string | null;
  categoriaOriginal?: string | null;
  materiaMapping?: string | null; // rama value
  libroMapping?: string | null; // libro value
  tituloMapping?: string | null;
  orden: number;
}

// ─── Helpers ───────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars faltantes");
  return createAdminClient(url, key);
}

async function extractTextFromPdf(storagePath: string): Promise<string> {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin.storage
    .from("cedularios")
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Error al descargar PDF: ${error?.message ?? "no data"}`);
  }

  // Convert Blob to Buffer for pdf-parse
  const arrayBuf = await data.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuf);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdf = require("pdf-parse/lib/pdf-parse");
  const pdfData = await pdf(pdfBuffer);

  const text = pdfData.text;

  if (!text || text.trim().length < 20) {
    throw new Error(
      "No se pudo extraer texto del PDF. Puede ser un documento escaneado (imagen). " +
        "Por favor, pega el texto del cedulario manualmente."
    );
  }

  return text;
}

async function callClaudeAPI(
  cedularioText: string,
  materiasDisponibles: string,
  universidadLabel: string
): Promise<ParsedTema[]> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no configurada");
  }

  const systemPrompt = `Eres un asistente especializado en derecho civil y procesal civil chileno.
Tu tarea es analizar un cedulario de examen de grado y extraer los temas que lo componen,
mapeándolos a las categorías de contenido disponibles en la plataforma de estudio.

IMPORTANTE:
- Extrae TODOS los temas del cedulario, sin omitir ninguno
- Si un tema corresponde a una categoría de la plataforma, usa los valores EXACTOS de rama y libro
- Si un tema NO tiene correspondencia, pon materiaMapping: null y libroMapping: null
- Mantén el orden en que aparecen en el cedulario
- Si el cedulario agrupa temas por secciones (Civil, Procesal, etc.), respeta esa estructura
- Responde SOLO con JSON válido, sin texto adicional ni markdown`;

  const userPrompt = `Aquí está el cedulario de la universidad "${universidadLabel}":

---
${cedularioText.slice(0, 15000)}
---

Y estas son las categorías de contenido disponibles en nuestra plataforma:
${materiasDisponibles}

Analiza el cedulario y devuelve un JSON con la siguiente estructura:
{
  "temas": [
    {
      "nombre": "Nombre del tema como aparece en el cedulario",
      "descripcion": "Subtemas o detalle si el cedulario los especifica, o null",
      "categoriaOriginal": "Texto exacto del cedulario para este tema",
      "materiaMapping": "DERECHO_CIVIL o DERECHO_PROCESAL_CIVIL (el valor exacto de rama), o null si no hay match",
      "libroMapping": "LIBRO_I, LIBRO_II, TITULO_PRELIMINAR, LIBRO_I_CPC, etc. (el valor exacto de libro), o null",
      "tituloMapping": "Título específico si puedes identificarlo, o null",
      "orden": 1
    }
  ]
}

Reglas de mapeo:
- rama solo puede ser "DERECHO_CIVIL" o "DERECHO_PROCESAL_CIVIL"
- libro debe ser uno de los valores exactos listados arriba (TITULO_PRELIMINAR, MENSAJE, LIBRO_I, LIBRO_II, LIBRO_III, LIBRO_IV, LIBRO_I_CPC, LIBRO_II_CPC, LIBRO_III_CPC, LIBRO_IV_CPC, TITULO_FINAL)
- Si el tema del cedulario es genérico (ej: "Obligaciones"), mapéalo a la rama + libro más relevante
- Si hay duda entre dos opciones, prefiere el match más específico`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
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

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { configId } = body;

  // Get config
  const config = await prisma.examenConfig.findFirst({
    where: {
      id: configId || undefined,
      userId: user.id,
    },
  });

  if (!config) {
    return NextResponse.json(
      { error: "Configuración de examen no encontrada" },
      { status: 404 }
    );
  }

  if (!config.cedularioTexto && !config.cedularioUrl) {
    return NextResponse.json(
      { error: "No hay cedulario cargado. Sube un PDF o pega el texto." },
      { status: 400 }
    );
  }

  // Set status to parsing
  await prisma.examenConfig.update({
    where: { id: config.id },
    data: { parseStatus: "parsing", parseError: null },
  });

  try {
    // 1. Get cedulario text
    let cedularioText: string;

    if (config.cedularioSource === "pdf" && config.cedularioUrl) {
      cedularioText = await extractTextFromPdf(config.cedularioUrl);
    } else if (config.cedularioTexto) {
      cedularioText = config.cedularioTexto;
    } else {
      throw new Error("No hay texto de cedulario disponible");
    }

    // 2. Get available materias for the prompt
    const materiasDisponibles = await getMateriasForPrompt();

    // 3. Call Claude API for parsing & mapping
    const parsedTemas = await callClaudeAPI(
      cedularioText,
      materiasDisponibles,
      config.universidad
    );

    // 4. Delete existing temas
    await prisma.examenTema.deleteMany({
      where: { examenConfigId: config.id },
    });

    // 5. Create ExamenTema records with content counts
    const temasToCreate = [];

    for (let i = 0; i < parsedTemas.length; i++) {
      const tema = parsedTemas[i];

      // Count available content for this mapping
      let flashcardsDisponibles = 0;
      let mcqDisponibles = 0;
      let vfDisponibles = 0;

      if (tema.materiaMapping) {
        const counts = await countContentForMapping(
          tema.materiaMapping,
          tema.libroMapping || null,
          tema.tituloMapping || null
        );
        flashcardsDisponibles = counts.flashcards;
        mcqDisponibles = counts.mcq;
        vfDisponibles = counts.vf;
      }

      const tieneContenido =
        flashcardsDisponibles + mcqDisponibles + vfDisponibles > 0;

      temasToCreate.push({
        examenConfigId: config.id,
        nombre: tema.nombre,
        descripcion: tema.descripcion || null,
        categoriaOriginal: tema.categoriaOriginal || null,
        materiaMapping: tema.materiaMapping || null,
        libroMapping: tema.libroMapping || null,
        tituloMapping: tema.tituloMapping || null,
        flashcardsDisponibles,
        mcqDisponibles,
        vfDisponibles,
        tieneContenido,
        orden: tema.orden ?? i + 1,
        peso: 1.0,
      });
    }

    // Batch create temas
    await prisma.examenTema.createMany({
      data: temasToCreate,
    });

    // 6. Update config status
    const updatedConfig = await prisma.examenConfig.update({
      where: { id: config.id },
      data: {
        parseStatus: "completed",
        parsedAt: new Date(),
        parseError: null,
      },
      include: {
        temas: {
          orderBy: { orden: "asc" },
        },
      },
    });

    return NextResponse.json({ config: updatedConfig });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Error desconocido al parsear";

    console.error("Parse error:", err);

    // Update config with error
    await prisma.examenConfig.update({
      where: { id: config.id },
      data: {
        parseStatus: "error",
        parseError: errorMessage,
      },
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
