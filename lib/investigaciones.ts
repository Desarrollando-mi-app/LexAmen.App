// ─── Investigaciones — helpers de query y serialización (server) ──
//
// Este archivo concentra los queries comunes del módulo Investigaciones
// (Pliego, Detalle, perfil) para evitar duplicación en pages y APIs.
// Devuelve estructuras DTO ya serializadas (sin Date raw, con counts
// expuestos, etc).

import { prisma } from "@/lib/prisma";

// ─── Tipos serializados ──────────────────────────────────────────

export type InvAuthorMini = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
  etapaActual: string | null; // "estudiante" | "egresado" | "abogado"
  gender: string | null; // alimenta concordancia gramatical en publicaciones
  hIndex: number;
  totalCitationsReceived: number;
};

export type InvInstitucionMini = {
  id: number;
  nombre: string;
  area: string;
  grupo: string;
};

export type InvSerialized = {
  id: string;
  titulo: string;
  deck: string | null;
  abstract: string;
  contenido: string;
  tipo: string;
  area: string;
  areasSecundarias: string[];
  wordCount: number;
  abstractWordCount: number;
  isFeatured: boolean;
  citationsInternal: number;
  citationsExternal: number;
  views: number;
  status: string;
  publishedAt: string;
  createdAt: string;
  user: InvAuthorMini;
  instituciones: InvInstitucionMini[];
};

export type InvSerializedFull = InvSerialized & {
  bibliografiaExterna: unknown;
};

// ─── Selects reutilizables ───────────────────────────────────────

const userMiniSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  universidad: true,
  etapaActual: true,
  gender: true,
  hIndex: true,
  totalCitationsReceived: true,
} as const;

const institucionMiniSelect = {
  id: true,
  nombre: true,
  area: true,
  grupo: true,
} as const;

// ─── Serializadores ──────────────────────────────────────────────

type InvWithRelations = NonNullable<
  Awaited<ReturnType<typeof prisma.investigacion.findUnique>>
> & {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    universidad: string | null;
    etapaActual: string | null;
    gender: string | null;
    hIndex: number;
    totalCitationsReceived: number;
  };
  instituciones: {
    institucion: {
      id: number;
      nombre: string;
      area: string;
      grupo: string;
    };
  }[];
};

export function serializeInv(inv: InvWithRelations): InvSerialized {
  return {
    id: inv.id,
    titulo: inv.titulo,
    deck: inv.deck,
    abstract: inv.abstract,
    contenido: inv.contenido,
    tipo: inv.tipo,
    area: inv.area,
    areasSecundarias: inv.areasSecundarias,
    wordCount: inv.wordCount,
    abstractWordCount: inv.abstractWordCount,
    isFeatured: inv.isFeatured,
    citationsInternal: inv.citationsInternal,
    citationsExternal: inv.citationsExternal,
    views: inv.views,
    status: inv.status,
    publishedAt: inv.publishedAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
    user: inv.user,
    instituciones: inv.instituciones.map((i) => i.institucion),
  };
}

// ─── Queries ─────────────────────────────────────────────────────

export type ListFilters = {
  area?: string | null;
  tipo?: string | null;
  institucionId?: number | null;
  authorId?: string | null;
  search?: string | null;
  sort?: "recent" | "mostCited";
  page?: number;
  limit?: number;
};

/**
 * Lista de investigaciones publicadas con filtros + paginación.
 * Solo `status === 'published'`.
 */
export async function listInvestigaciones(filters: ListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 15));

  const where: Record<string, unknown> = { status: "published" };
  if (filters.area) where.area = filters.area;
  if (filters.tipo) where.tipo = filters.tipo;
  if (filters.authorId) where.userId = filters.authorId;
  if (filters.search && filters.search.length >= 2) {
    where.OR = [
      { titulo: { contains: filters.search, mode: "insensitive" } },
      { abstract: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.institucionId) {
    where.instituciones = {
      some: { institucionId: filters.institucionId },
    };
  }

  const orderBy =
    filters.sort === "mostCited"
      ? [{ citationsInternal: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const [items, total] = await Promise.all([
    prisma.investigacion.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: userMiniSelect },
        instituciones: { include: { institucion: { select: institucionMiniSelect } } },
      },
    }),
    prisma.investigacion.count({ where }),
  ]);

  return {
    items: items.map((i) => serializeInv(i as unknown as InvWithRelations)),
    total,
    page,
    limit,
  };
}

/**
 * Investigación destacada (isFeatured = true). Si hay varias, la más
 * reciente. Si no hay ninguna explícita, fallback al OD con más citas
 * publicado en los últimos 60 días.
 */
export async function getDestacada(): Promise<InvSerialized | null> {
  const featured = await prisma.investigacion.findFirst({
    where: { isFeatured: true, status: "published" },
    orderBy: { featuredAt: "desc" },
    include: {
      user: { select: userMiniSelect },
      instituciones: { include: { institucion: { select: institucionMiniSelect } } },
    },
  });
  if (featured) return serializeInv(featured as unknown as InvWithRelations);

  // Fallback: la más citada del último trimestre
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
  const fallback = await prisma.investigacion.findFirst({
    where: { status: "published", publishedAt: { gte: sixtyDaysAgo } },
    orderBy: [{ citationsInternal: "desc" }, { publishedAt: "desc" }],
    include: {
      user: { select: userMiniSelect },
      instituciones: { include: { institucion: { select: institucionMiniSelect } } },
    },
  });
  return fallback ? serializeInv(fallback as unknown as InvWithRelations) : null;
}

/**
 * Top N investigaciones por citas internas.
 */
export async function getMasCitadas(limit = 5): Promise<InvSerialized[]> {
  const items = await prisma.investigacion.findMany({
    where: { status: "published" },
    orderBy: [{ citationsInternal: "desc" }, { publishedAt: "desc" }],
    take: limit,
    include: {
      user: { select: userMiniSelect },
      instituciones: { include: { institucion: { select: institucionMiniSelect } } },
    },
  });
  return items.map((i) => serializeInv(i as unknown as InvWithRelations));
}

/**
 * Conteo agregado por área del derecho. Solo investigaciones publicadas.
 */
export async function getAreasConContador(): Promise<
  { area: string; count: number }[]
> {
  const grouped = await prisma.investigacion.groupBy({
    by: ["area"],
    where: { status: "published" },
    _count: true,
    orderBy: { _count: { area: "desc" } },
  });
  return grouped.map((g) => ({ area: g.area, count: g._count }));
}

/**
 * Top instituciones jurídicas por cantidad de investigaciones que las
 * incluyen. Devuelve nombre + count + suma de citas.
 */
export async function getInstitucionesTop(limit = 8): Promise<
  {
    institucionId: number;
    nombre: string;
    grupo: string;
    trabajos: number;
    citas: number;
  }[]
> {
  // Group por institucionId con conteo + suma de citationsInternal
  type Row = {
    institucionId: number;
    nombre: string;
    grupo: string;
    trabajos: bigint;
    citas: bigint;
  };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      ij."id"     AS "institucionId",
      ij."nombre" AS "nombre",
      ij."grupo"  AS "grupo",
      COUNT(*)::bigint AS "trabajos",
      SUM(COALESCE(i."citationsInternal", 0) + COALESCE(i."citationsExternal", 0))::bigint AS "citas"
    FROM "investigacion_instituciones" ii
    INNER JOIN "investigaciones" i ON i."id" = ii."investigacionId"
    INNER JOIN "InstitucionJuridica" ij ON ij."id" = ii."institucionId"
    WHERE i."status" = 'published'
    GROUP BY ij."id", ij."nombre", ij."grupo"
    ORDER BY "trabajos" DESC, "citas" DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    institucionId: r.institucionId,
    nombre: r.nombre,
    grupo: r.grupo,
    trabajos: Number(r.trabajos),
    citas: Number(r.citas),
  }));
}

/**
 * Top autores por h-index. Solo usuarios con al menos 1 investigación
 * publicada.
 */
export async function getAutoresTopHIndex(limit = 5): Promise<
  {
    id: string;
    firstName: string;
    lastName: string;
    universidad: string | null;
    etapaActual: string | null;
    gender: string | null;
    avatarUrl: string | null;
    hIndex: number;
    totalCitationsReceived: number;
    trabajos: number;
  }[]
> {
  type Row = {
    id: string;
    firstName: string;
    lastName: string;
    universidad: string | null;
    etapaActual: string | null;
    gender: string | null;
    avatarUrl: string | null;
    hIndex: number;
    totalCitationsReceived: number;
    trabajos: bigint;
  };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      u."id", u."firstName", u."lastName", u."universidad",
      u."etapaActual", u."gender", u."avatarUrl",
      u."hIndex", u."totalCitationsReceived",
      COUNT(i."id")::bigint AS "trabajos"
    FROM "User" u
    INNER JOIN "investigaciones" i
      ON i."userId" = u."id" AND i."status" = 'published'
    GROUP BY u."id"
    ORDER BY u."hIndex" DESC, u."totalCitationsReceived" DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ ...r, trabajos: Number(r.trabajos) }));
}

/**
 * Cifras agregadas para la portada del Pliego.
 * Total de trabajos publicados, total de citaciones, autores únicos
 * con publicaciones, y áreas activas (con al menos 1 trabajo).
 */
export async function getCifras(): Promise<{
  trabajos: number;
  citaciones: number;
  autores: number;
  areas: number;
}> {
  const [trabajos, citaciones, autoresAgg, areasAgg] = await Promise.all([
    prisma.investigacion.count({ where: { status: "published" } }),
    prisma.citacion.count({ where: { isSelfCitation: false } }),
    prisma.investigacion.findMany({
      where: { status: "published" },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.investigacion.findMany({
      where: { status: "published" },
      select: { area: true },
      distinct: ["area"],
    }),
  ]);
  return {
    trabajos,
    citaciones,
    autores: autoresAgg.length,
    areas: areasAgg.length,
  };
}

/**
 * Detalle completo de una investigación. Incrementa `views` (best
 * effort, fire-and-forget). Incluye autor, instituciones, citas
 * recibidas (resumidas), citas externas verificadas y featuredQuote.
 */
export async function getInvestigacionDetalle(id: string) {
  const inv = await prisma.investigacion.findUnique({
    where: { id },
    include: {
      user: { select: userMiniSelect },
      instituciones: { include: { institucion: { select: institucionMiniSelect } } },
      citasExternas: {
        where: { status: "verificada" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!inv) return null;
  if (inv.status !== "published") return null;

  // Increment view count fire-and-forget
  prisma.investigacion
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  return {
    ...serializeInv(inv as unknown as InvWithRelations),
    bibliografiaExterna: inv.bibliografiaExterna ?? null,
    citasExternas: inv.citasExternas.map((c) => ({
      id: c.id,
      citingTitle: c.citingTitle,
      citingAuthor: c.citingAuthor,
      citingYear: c.citingYear,
      citingSource: c.citingSource,
      citingUrl: c.citingUrl,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

// ─── Helpers de formato ──────────────────────────────────────────

/**
 * Cuenta palabras de un texto (regex \S+). Útil para validaciones y
 * para la columna desnormalizada `wordCount`.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

/**
 * Strip HTML básico para contar palabras del cuerpo TipTap.
 */
export function countWordsFromHtml(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  return countWords(text);
}
