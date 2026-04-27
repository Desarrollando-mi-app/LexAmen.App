import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  listInvestigaciones,
  countWords,
  countWordsFromHtml,
} from "@/lib/investigaciones";
import {
  TIPOS_INVESTIGACION,
  AREAS_DERECHO,
  ABSTRACT_MIN_WORDS,
  ABSTRACT_MAX_WORDS,
  MIN_WORDS_BY_TYPE,
  type TipoInvestigacion,
  type AreaDerecho,
} from "@/lib/investigaciones-constants";

// ─── GET — Listar (Pliego + paginación) ────────────────────────

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const data = await listInvestigaciones({
    area: sp.get("area"),
    tipo: sp.get("tipo"),
    institucionId: sp.get("institucionId")
      ? Number(sp.get("institucionId"))
      : null,
    authorId: sp.get("authorId"),
    search: sp.get("search"),
    sort: (sp.get("sort") as "recent" | "mostCited") || "recent",
    page: sp.get("page") ? Number(sp.get("page")) : 1,
    limit: sp.get("limit") ? Number(sp.get("limit")) : 15,
  });
  return NextResponse.json(data);
}

// ─── POST — Crear (Sprint 1: validaciones básicas, sin citas) ──
//
// Sprint 1 acepta `citasInsertadas` y `bibliografiaExterna` en el body
// pero NO crea aún las relaciones Citacion (eso queda para sprint 2 con
// el editor TipTap completo y el modal de búsqueda).
// La API actualiza wordCount, abstractWordCount y crea las filas
// InvestigacionInstitucion. Validaciones: campos requeridos, abstract
// 150-250 palabras, mínimo 3 instituciones, body con words ≥ MIN_WORDS_BY_TYPE.

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    titulo?: string;
    deck?: string;
    abstract?: string;
    contenido?: string;
    tipo?: string;
    area?: string;
    areasSecundarias?: string[];
    institucionIds?: number[];
    bibliografiaExterna?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // ─── Validaciones ──
  const errors: string[] = [];

  const titulo = body.titulo?.trim();
  if (!titulo || titulo.length < 10) {
    errors.push("El título es requerido (mínimo 10 caracteres).");
  }

  const abstract = body.abstract?.trim() ?? "";
  const abstractWords = countWords(abstract);
  if (
    abstractWords < ABSTRACT_MIN_WORDS ||
    abstractWords > ABSTRACT_MAX_WORDS
  ) {
    errors.push(
      `El abstract debe tener entre ${ABSTRACT_MIN_WORDS} y ${ABSTRACT_MAX_WORDS} palabras (actual: ${abstractWords}).`,
    );
  }

  const contenido = body.contenido ?? "";
  if (!contenido || contenido.length < 50) {
    errors.push("El contenido es requerido.");
  }

  const tipo = body.tipo;
  if (!tipo || !TIPOS_INVESTIGACION.includes(tipo as TipoInvestigacion)) {
    errors.push("Tipo de investigación inválido.");
  }

  const area = body.area;
  if (!area || !AREAS_DERECHO.includes(area as AreaDerecho)) {
    errors.push("Área del derecho inválida.");
  }

  const institucionIds = (body.institucionIds ?? []).filter(
    (n) => Number.isFinite(n) && n > 0,
  );
  if (institucionIds.length < 3 || institucionIds.length > 7) {
    errors.push(
      "Debes seleccionar entre 3 y 7 instituciones jurídicas.",
    );
  }

  const wordCount = countWordsFromHtml(contenido);
  if (tipo && TIPOS_INVESTIGACION.includes(tipo as TipoInvestigacion)) {
    const min = MIN_WORDS_BY_TYPE[tipo as TipoInvestigacion];
    if (wordCount < min) {
      errors.push(
        `El cuerpo necesita al menos ${min} palabras para este tipo (actual: ${wordCount}).`,
      );
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Verificar que las instituciones existen
  const existing = await prisma.institucionJuridica.findMany({
    where: { id: { in: institucionIds } },
    select: { id: true },
  });
  if (existing.length !== institucionIds.length) {
    return NextResponse.json(
      { errors: ["Una o más instituciones no existen."] },
      { status: 400 },
    );
  }

  // ─── Crear ──
  const inv = await prisma.investigacion.create({
    data: {
      userId: authUser.id,
      titulo: titulo!,
      deck: body.deck?.trim() || null,
      abstract,
      contenido,
      bibliografiaExterna:
        body.bibliografiaExterna != null
          ? (body.bibliografiaExterna as never)
          : undefined,
      tipo: tipo!,
      area: area!,
      areasSecundarias: body.areasSecundarias ?? [],
      wordCount,
      abstractWordCount: abstractWords,
      instituciones: {
        create: institucionIds.map((id) => ({ institucionId: id })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: inv.id }, { status: 201 });
}
