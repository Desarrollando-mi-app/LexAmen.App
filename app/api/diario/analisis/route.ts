import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  canPublishLongContent,
  calculateReadingTime,
} from "@/lib/diario-utils";
import {
  ANALISIS_LIMITS,
  XP_FALLO_SEMANA_PARTICIPAR,
  type AnalisisFormato,
} from "@/lib/diario-config";

// ─── GET: Feed de Análisis de Sentencia ─────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { searchParams } = request.nextUrl;
  const materia = searchParams.get("materia");
  const tags = searchParams.get("tags");
  const userId = searchParams.get("userId");
  const q = searchParams.get("q");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 15, 50);
  const formato = searchParams.get("formato"); // "mini" | "completo" | null (all)
  const falloDeLaSemanaId = searchParams.get("falloDeLaSemanaId");

  // ─── Construir where ─────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isActive: true,
    isHidden: false,
  };

  if (materia) {
    where.materia = materia;
  }

  if (tags) {
    where.tags = { contains: tags };
  }

  if (userId) {
    where.userId = userId;
  }

  if (formato && (formato === "mini" || formato === "completo")) {
    where.formato = formato;
  }

  if (falloDeLaSemanaId) {
    where.falloDeLaSemanaId = falloDeLaSemanaId;
  }

  if (q) {
    where.OR = [
      { titulo: { contains: q, mode: "insensitive" } },
      { resumen: { contains: q, mode: "insensitive" } },
    ];
  }

  // ─── Query ────────────────────────────────────────────────

  const analisis = await prisma.analisisSentencia.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
        },
      },
      ...(authUser
        ? {
            apoyos: {
              where: { userId: authUser.id },
              select: { id: true },
            },
            guardados: {
              where: { userId: authUser.id },
              select: { id: true },
            },
            comuniquese: {
              where: { userId: authUser.id },
              select: { id: true },
            },
          }
        : {}),
    },
  });

  const hasMore = analisis.length > limit;
  const items = hasMore ? analisis.slice(0, limit) : analisis;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // ─── Response ─────────────────────────────────────────────

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      materia: a.materia,
      tags: a.tags,
      tribunal: a.tribunal,
      numeroRol: a.numeroRol,
      fechaFallo: a.fechaFallo.toISOString(),
      partes: a.partes,
      resumen: a.resumen,
      tiempoLectura: a.tiempoLectura,
      formato: (a as typeof a & { formato?: string }).formato ?? "completo",
      falloDeLaSemanaId: (a as typeof a & { falloDeLaSemanaId?: string | null }).falloDeLaSemanaId ?? null,
      apoyosCount: a.apoyosCount,
      citasCount: a.citasCount,
      guardadosCount: a.guardadosCount,
      comuniqueseCount: a.comuniqueseCount,
      viewsCount: a.viewsCount,
      createdAt: a.createdAt.toISOString(),
      user: a.user,
      ...(authUser
        ? {
            hasApoyado:
              (a as typeof a & { apoyos: { id: string }[] }).apoyos?.length >
              0,
            hasGuardado:
              (a as typeof a & { guardados: { id: string }[] }).guardados
                ?.length > 0,
            hasComunicado:
              (a as typeof a & { comuniquese: { id: string }[] }).comuniquese
                ?.length > 0,
          }
        : {}),
    })),
    nextCursor,
    hasMore,
  });
}

// ─── POST: Crear Análisis de Sentencia ──────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    titulo,
    materia,
    tags,
    tribunal,
    numeroRol,
    fechaFallo,
    partes,
    falloUrl,
    hechos,
    ratioDecidendi,
    opinion,
    resumen,
    showInFeed,
    formato: rawFormato,
    falloDeLaSemanaId,
  } = body as {
    titulo: string;
    materia: string;
    tags?: string;
    tribunal: string;
    numeroRol: string;
    fechaFallo: string;
    partes: string;
    falloUrl?: string;
    hechos: string;
    ratioDecidendi: string;
    opinion: string;
    resumen: string;
    showInFeed?: boolean;
    formato?: string;
    falloDeLaSemanaId?: string;
  };

  // ─── Determine formato ─────────────────────────────────────

  const formato: AnalisisFormato =
    rawFormato === "mini" ? "mini" : "completo";
  const limits = ANALISIS_LIMITS[formato];

  // ─── Validaciones ─────────────────────────────────────────

  if (!titulo || !titulo.trim()) {
    return NextResponse.json(
      { error: "El titulo es requerido" },
      { status: 400 }
    );
  }

  if (!tribunal || !tribunal.trim()) {
    return NextResponse.json(
      { error: "El tribunal es requerido" },
      { status: 400 }
    );
  }

  if (!numeroRol || !numeroRol.trim()) {
    return NextResponse.json(
      { error: "El numero de rol es requerido" },
      { status: 400 }
    );
  }

  if (!partes || !partes.trim()) {
    return NextResponse.json(
      { error: "Las partes son requeridas" },
      { status: 400 }
    );
  }

  if (!materia || !materia.trim()) {
    return NextResponse.json(
      { error: "La materia es requerida" },
      { status: 400 }
    );
  }

  if (!hechos || !hechos.trim()) {
    return NextResponse.json(
      { error: "Los hechos son requeridos" },
      { status: 400 }
    );
  }

  if (limits.maxHechos > 0 && hechos.length > limits.maxHechos) {
    return NextResponse.json(
      {
        error: `Los hechos no pueden exceder ${limits.maxHechos} caracteres`,
      },
      { status: 400 }
    );
  }

  if (!ratioDecidendi || !ratioDecidendi.trim()) {
    return NextResponse.json(
      { error: "La ratio decidendi es requerida" },
      { status: 400 }
    );
  }

  if (limits.maxRatio > 0 && ratioDecidendi.length > limits.maxRatio) {
    return NextResponse.json(
      {
        error: `La ratio decidendi no puede exceder ${limits.maxRatio} caracteres`,
      },
      { status: 400 }
    );
  }

  if (!opinion || !opinion.trim()) {
    return NextResponse.json(
      { error: "La opinion es requerida" },
      { status: 400 }
    );
  }

  if (limits.maxOpinion > 0 && opinion.length > limits.maxOpinion) {
    return NextResponse.json(
      {
        error: `La opinion no puede exceder ${limits.maxOpinion} caracteres`,
      },
      { status: 400 }
    );
  }

  if (!resumen || !resumen.trim()) {
    return NextResponse.json(
      { error: "El resumen es requerido" },
      { status: 400 }
    );
  }

  if (limits.maxResumen > 0 && resumen.length > limits.maxResumen) {
    return NextResponse.json(
      {
        error: `El resumen no puede exceder ${limits.maxResumen} caracteres`,
      },
      { status: 400 }
    );
  }

  // ─── Limite diario ────────────────────────────────────────

  const publishCheck = await canPublishLongContent(authUser.id);
  if (!publishCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Has alcanzado tu limite de publicaciones largas diarias. Actualiza a Premium para publicar sin limites.",
        remaining: 0,
      },
      { status: 429 }
    );
  }

  // ─── Calcular tiempo de lectura ───────────────────────────

  const tiempoLectura = calculateReadingTime(hechos, ratioDecidendi, opinion);

  // ─── Crear analisis ───────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createData: any = {
    userId: authUser.id,
    titulo: titulo.trim(),
    materia: materia.trim(),
    tags: tags?.trim() || null,
    tribunal: tribunal.trim(),
    numeroRol: numeroRol.trim(),
    fechaFallo: new Date(fechaFallo),
    partes: partes.trim(),
    falloUrl: falloUrl || null,
    hechos: hechos.trim(),
    ratioDecidendi: ratioDecidendi.trim(),
    opinion: opinion.trim(),
    resumen: resumen.trim(),
    tiempoLectura,
    showInFeed: showInFeed ?? true,
    formato,
  };

  if (falloDeLaSemanaId) {
    createData.falloDeLaSemanaId = falloDeLaSemanaId;
  }

  const analisis = await prisma.analisisSentencia.create({
    data: createData,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // ─── XP al autor (via awardXp centralizado) ─────────────
  const { awardXp } = await import("@/lib/xp-config");

  // XP based on formato
  await awardXp({
    userId: authUser.id,
    amount: limits.xp,
    category: "publicaciones",
    detalle: `Analisis de Sentencia (${limits.label})`,
    prisma,
  });

  // Extra XP for Fallo de la Semana participation
  if (falloDeLaSemanaId) {
    await awardXp({
      userId: authUser.id,
      amount: XP_FALLO_SEMANA_PARTICIPAR,
      category: "publicaciones",
      detalle: "Participacion Fallo de la Semana",
      prisma,
    });
  }

  // Badge evaluation
  const { evaluateBadges } = await import("@/lib/badges");
  evaluateBadges(authUser.id, "diario").catch(() => {});

  // ─── Auto-OD-resumen en el feed principal ──────────────
  // Genera un OD que vive en el feed del Diario y enlaza al análisis,
  // para que la conversación pública pase ahí. Best-effort.
  const { createSummaryObiter } = await import("@/lib/obiter-auto-summary");
  await createSummaryObiter(prisma, {
    kind: "analisis_summary",
    userId: authUser.id,
    citedAnalisisId: analisis.id,
    titulo: analisis.titulo,
    excerpt: analisis.resumen,
    hashtagSeed: [analisis.materia, "AnalisisDeSentencia"],
  });

  return NextResponse.json({ analisis }, { status: 201 });
}
