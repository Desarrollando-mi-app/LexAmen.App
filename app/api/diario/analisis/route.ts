import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  canPublishLongContent,
  calculateReadingTime,
  ANALISIS_HECHOS_MAX_CHARS,
  ANALISIS_RATIO_MAX_CHARS,
  ANALISIS_RESUMEN_MAX_CHARS,
} from "@/lib/diario-utils";

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
  };

  // ─── Validaciones ─────────────────────────────────────────

  if (!titulo || !titulo.trim()) {
    return NextResponse.json(
      { error: "El título es requerido" },
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
      { error: "El número de rol es requerido" },
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

  if (hechos.length > ANALISIS_HECHOS_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `Los hechos no pueden exceder ${ANALISIS_HECHOS_MAX_CHARS} caracteres`,
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

  if (ratioDecidendi.length > ANALISIS_RATIO_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `La ratio decidendi no puede exceder ${ANALISIS_RATIO_MAX_CHARS} caracteres`,
      },
      { status: 400 }
    );
  }

  if (!opinion || !opinion.trim()) {
    return NextResponse.json(
      { error: "La opinión es requerida" },
      { status: 400 }
    );
  }

  if (!resumen || !resumen.trim()) {
    return NextResponse.json(
      { error: "El resumen es requerido" },
      { status: 400 }
    );
  }

  if (resumen.length > ANALISIS_RESUMEN_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `El resumen no puede exceder ${ANALISIS_RESUMEN_MAX_CHARS} caracteres`,
      },
      { status: 400 }
    );
  }

  if (!falloUrl) {
    return NextResponse.json(
      { error: "La URL del fallo es requerida" },
      { status: 400 }
    );
  }

  // ─── Límite diario ────────────────────────────────────────

  const publishCheck = await canPublishLongContent(authUser.id);
  if (!publishCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Has alcanzado tu límite de publicaciones largas diarias. Actualiza a Premium para publicar sin límites.",
        remaining: 0,
      },
      { status: 429 }
    );
  }

  // ─── Calcular tiempo de lectura ───────────────────────────

  const tiempoLectura = calculateReadingTime(hechos, ratioDecidendi, opinion);

  // ─── Crear análisis ───────────────────────────────────────

  const analisis = await prisma.analisisSentencia.create({
    data: {
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
    },
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
  const { awardXp, XP_PUBLICAR_ANALISIS } = await import("@/lib/xp-config");
  await awardXp({
    userId: authUser.id,
    amount: XP_PUBLICAR_ANALISIS,
    category: "publicaciones",
    prisma,
  });

  return NextResponse.json({ analisis }, { status: 201 });
}
