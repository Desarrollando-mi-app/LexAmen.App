// ─── Auto-OD-resumen para publicaciones largas ────────────────
//
// Cuando un usuario publica un Análisis, Ensayo, Debate o Expediente,
// llamamos a createSummaryObiter() para generar un OD-resumen que vive
// en el feed principal del Diario. Esto cumple la visión de "que el OD
// sea la plaza pública donde toda publicación seria tenga presencia".
//
// El OD generado:
//  - kind = 'analisis_summary' | 'ensayo_summary' | 'debate_summary' |
//           'expediente_summary'
//  - citedXId apunta al original (FK)
//  - content = teaser auto-generado a partir del título + resumen/excerpt
//  - hashtags extraídos del content
//  - userId = autor del original (o sistema para expediente sin autor)
//
// Las acciones del OD (apoyos, respuestas, citas) son la conversación
// del público; el contenido completo vive en el módulo correspondiente.
// El user puede editar el OD después si quiere personalizar el teaser.

import type { prisma as PrismaInstance } from "@/lib/prisma";
import { extractHashtags } from "./obiter-parsing";

type PrismaClient = typeof PrismaInstance;

type SummaryKind =
  | "analisis_summary"
  | "ensayo_summary"
  | "debate_summary"
  | "expediente_summary";

type SummaryInput = {
  kind: SummaryKind;
  userId: string;
  // Una y solo una de estas debe estar presente, según el kind
  citedAnalisisId?: string;
  citedEnsayoId?: string;
  citedDebateId?: string;
  citedExpedienteId?: string;
  // Datos del original para construir el teaser
  titulo: string;
  excerpt?: string | null; // resumen, descripcion, etc
  hashtagSeed?: string[]; // tags adicionales a inyectar (ej. de la materia)
};

// Plantillas editoriales por kind. Conviven con la voz del usuario
// (puede editar el OD después). El uso de "He publicado…" mantiene
// primera persona y suena natural.
const TEMPLATES: Record<SummaryKind, (titulo: string, excerpt?: string | null) => string> = {
  analisis_summary: (titulo, excerpt) =>
    `He publicado un Análisis de Sentencia: «${titulo}».${excerpt ? ` ${truncate(excerpt, 220)}` : ""}`,
  ensayo_summary: (titulo, excerpt) =>
    `He publicado un Ensayo: «${titulo}».${excerpt ? ` ${truncate(excerpt, 220)}` : ""}`,
  debate_summary: (titulo, excerpt) =>
    `Abrí un Debate: «${titulo}».${excerpt ? ` ${truncate(excerpt, 200)}` : ""} ¿Quién toma la contraria?`,
  expediente_summary: (titulo, excerpt) =>
    `Nuevo Expediente Abierto: «${titulo}».${excerpt ? ` ${truncate(excerpt, 200)}` : ""} Argumenta por uno de los bandos.`,
};

function truncate(s: string, max: number): string {
  if (!s) return "";
  const trimmed = s.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? trimmed.slice(0, max - 1) + "…" : trimmed;
}

/**
 * Crea un OD-resumen vinculado a una publicación larga. Best-effort:
 * si falla, no rompe el create del original — solo loguea.
 *
 * Devuelve el OD creado o null si falló.
 */
export async function createSummaryObiter(
  prisma: PrismaClient,
  input: SummaryInput,
): Promise<{ id: string } | null> {
  try {
    const content = TEMPLATES[input.kind](input.titulo, input.excerpt);

    // Hashtags: extraídos del contenido + seed (ej. materia)
    const extracted = extractHashtags(content);
    const seed = (input.hashtagSeed ?? [])
      .map((s) => s.toLowerCase().replace(/[^a-z0-9_]/g, ""))
      .filter((s) => s.length >= 2);
    const hashtags = Array.from(new Set([...extracted, ...seed]));

    const od = await prisma.obiterDictum.create({
      data: {
        userId: input.userId,
        content,
        kind: input.kind,
        citedAnalisisId: input.citedAnalisisId ?? null,
        citedEnsayoId: input.citedEnsayoId ?? null,
        citedDebateId: input.citedDebateId ?? null,
        citedExpedienteId: input.citedExpedienteId ?? null,
        hashtags,
      },
      select: { id: true },
    });

    return od;
  } catch (err) {
    console.warn("[auto-summary] createSummaryObiter failed:", err);
    return null;
  }
}
