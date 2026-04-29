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
import { recalculateUserMetrics } from "@/lib/citations";

const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48h
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const RATE_LIMIT_MAX = 3;

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

// ─── POST — Crear con citas internas ───────────────────────────
//
// Procesa el body completo del editor TipTap:
//  - Validaciones de campos (título, abstract, tipo, área, instituciones,
//    body wordcount mínimo según tipo)
//  - Rate limit: máximo 3 publicaciones en 24h por usuario
//  - Para cada cita en `citasInsertadas`:
//      · valida 48h de cooldown desde citedInv.publishedAt
//      · detecta auto-cita (citedInv.userId === session.user.id) y la
//        marca con isSelfCitation=true
//  - Crea Investigacion + InvestigacionInstitucion + Citacion[] dentro
//    de una sola transacción.
//  - Incrementa contadores denormalizados: citationsInternal en citas
//    no-auto, selfCitations en auto-citas. (citationsInternal del
//    citedInv NO incluye auto-citas, igual que h-index.)
//  - Tras el commit, fuera de la transacción, recalcula h-index/total
//    de cada autor citado en background.

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
    citasInsertadas?: Array<{
      citedInvId?: string;
      contextSnippet?: string | null;
      locationInText?: string | null;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // ─── Rate limit: 3 publicaciones / 24h ──
  const sinceWindow = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await prisma.investigacion.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: sinceWindow },
    },
  });
  if (recentCount >= RATE_LIMIT_MAX) {
    return NextResponse.json(
      {
        errors: [
          `Has alcanzado el límite de ${RATE_LIMIT_MAX} publicaciones en 24h. Intenta más tarde.`,
        ],
      },
      { status: 429 },
    );
  }

  // ─── Validaciones de campos ──
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
    errors.push("Debes seleccionar entre 3 y 7 instituciones jurídicas.");
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

  // ─── Verificar instituciones ──
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

  // ─── Procesar citas internas (validar + detectar auto-citas) ──
  type CitaValida = {
    citedInvId: string;
    citedAuthorId: string;
    contextSnippet: string | null;
    locationInText: string | null;
    isSelfCitation: boolean;
  };
  const citasValidas: CitaValida[] = [];
  const citasRaw = (body.citasInsertadas ?? []).filter(
    (c) => typeof c?.citedInvId === "string" && c.citedInvId.length > 0,
  );

  if (citasRaw.length > 0) {
    // Deduplicar por citedInvId
    const seen = new Set<string>();
    const uniqueCitedIds = citasRaw
      .map((c) => c.citedInvId!)
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

    const cited = await prisma.investigacion.findMany({
      where: { id: { in: uniqueCitedIds } },
      select: {
        id: true,
        userId: true,
        publishedAt: true,
        status: true,
      },
    });
    const citedById = new Map(cited.map((c) => [c.id, c]));

    const now = Date.now();
    for (const raw of citasRaw) {
      const cInv = citedById.get(raw.citedInvId!);
      if (!cInv) {
        return NextResponse.json(
          {
            errors: [
              `La investigación citada (${raw.citedInvId}) no existe.`,
            ],
          },
          { status: 400 },
        );
      }
      if (cInv.status !== "published") {
        return NextResponse.json(
          {
            errors: [
              `La investigación citada (${raw.citedInvId}) no está publicada.`,
            ],
          },
          { status: 400 },
        );
      }
      const elapsed = now - new Date(cInv.publishedAt).getTime();
      if (elapsed < COOLDOWN_MS) {
        const citableSince = new Date(
          new Date(cInv.publishedAt).getTime() + COOLDOWN_MS,
        );
        return NextResponse.json(
          {
            errors: [
              `Una investigación citada todavía está en ventana de 48h (citable desde ${citableSince.toISOString()}).`,
            ],
          },
          { status: 400 },
        );
      }

      // Evitar duplicado en el mismo body
      if (citasValidas.some((c) => c.citedInvId === cInv.id)) continue;

      citasValidas.push({
        citedInvId: cInv.id,
        citedAuthorId: cInv.userId,
        contextSnippet: raw.contextSnippet?.toString().trim() || null,
        locationInText: raw.locationInText?.toString().trim() || null,
        isSelfCitation: cInv.userId === authUser.id,
      });
    }
  }

  // ─── Transacción: crear investigación + relaciones + citaciones ──
  const created = await prisma.$transaction(async (tx) => {
    const inv = await tx.investigacion.create({
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

    if (citasValidas.length > 0) {
      await tx.citacion.createMany({
        data: citasValidas.map((c) => ({
          citingInvId: inv.id,
          citedInvId: c.citedInvId,
          citingAuthorId: authUser.id,
          citedAuthorId: c.citedAuthorId,
          contextSnippet: c.contextSnippet,
          locationInText: c.locationInText,
          isSelfCitation: c.isSelfCitation,
        })),
      });

      // Incrementar contadores: citationsInternal solo en no-auto-citas;
      // selfCitations en auto-citas
      const realCites = citasValidas.filter((c) => !c.isSelfCitation);
      const selfCites = citasValidas.filter((c) => c.isSelfCitation);

      if (realCites.length > 0) {
        // Una update por citedInvId (no se puede increment con groupBy)
        const grouped = new Map<string, number>();
        for (const c of realCites) {
          grouped.set(c.citedInvId, (grouped.get(c.citedInvId) ?? 0) + 1);
        }
        for (const [citedInvId, count] of grouped) {
          await tx.investigacion.update({
            where: { id: citedInvId },
            data: { citationsInternal: { increment: count } },
          });
        }
      }
      if (selfCites.length > 0) {
        const grouped = new Map<string, number>();
        for (const c of selfCites) {
          grouped.set(c.citedInvId, (grouped.get(c.citedInvId) ?? 0) + 1);
        }
        for (const [citedInvId, count] of grouped) {
          await tx.investigacion.update({
            where: { id: citedInvId },
            data: { selfCitations: { increment: count } },
          });
        }
      }
    }

    return inv;
  });

  // ─── Recalcular métricas de los autores citados (fuera de la TX) ──
  // Solo autores no-self (auto-citas no impactan h-index ni totalCitationsReceived)
  const autoresUnicos = new Set(
    citasValidas
      .filter((c) => !c.isSelfCitation)
      .map((c) => c.citedAuthorId),
  );
  if (autoresUnicos.size > 0) {
    // Best effort: si falla un recálculo, no revertir la publicación.
    await Promise.allSettled(
      Array.from(autoresUnicos).map((userId) =>
        recalculateUserMetrics(userId),
      ),
    );
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}
