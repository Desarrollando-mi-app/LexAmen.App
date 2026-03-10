import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { extractHashtags, registerHashtags } from "@/lib/hashtags";
import { OBITER_MAX_WORDS } from "@/lib/diario-constants";
import type {
  DiarioFormato,
  DiarioVisibilidad,
} from "@/app/generated/prisma/client";

// ─── POST: Crear publicacion ─────────────────────────────

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
    formato,
    visibilidad,
    titulo,
    materia,
    contenido,
    rol,
    tribunal,
    fecha,
    partes,
    hechos,
    ratio,
    norma,
    opinion,
    pdfUrl,
    citadoDeId,
  } = body as {
    formato: DiarioFormato;
    visibilidad?: DiarioVisibilidad;
    titulo: string;
    materia?: string;
    contenido?: string;
    rol?: string;
    tribunal?: string;
    fecha?: string;
    partes?: string;
    hechos?: string;
    ratio?: string;
    norma?: string;
    opinion?: string;
    pdfUrl?: string;
    citadoDeId?: string;
  };

  // Validaciones
  if (!titulo || !formato) {
    return NextResponse.json(
      { error: "Titulo y formato son requeridos" },
      { status: 400 }
    );
  }

  if (!["OBITER_DICTUM", "ANALISIS_FALLOS"].includes(formato)) {
    return NextResponse.json(
      { error: "Formato no valido" },
      { status: 400 }
    );
  }

  if (formato === "OBITER_DICTUM") {
    if (!contenido) {
      return NextResponse.json(
        { error: "El contenido es requerido para Obiter Dictum" },
        { status: 400 }
      );
    }
    const wordCount = contenido.trim().split(/\s+/).length;
    if (wordCount > OBITER_MAX_WORDS) {
      return NextResponse.json(
        { error: `Obiter Dictum no puede exceder ${OBITER_MAX_WORDS} palabras (actual: ${wordCount})` },
        { status: 400 }
      );
    }
  }

  if (formato === "ANALISIS_FALLOS") {
    if (!hechos || !ratio || !opinion) {
      return NextResponse.json(
        { error: "Hechos, ratio decidendi y opinion son requeridos para Analisis de Fallos" },
        { status: 400 }
      );
    }
  }

  // Crear post
  const post = await prisma.diarioPost.create({
    data: {
      userId: authUser.id,
      formato,
      visibilidad: visibilidad ?? "PUBLICO",
      titulo,
      materia: materia || null,
      contenido: contenido || null,
      rol: rol || null,
      tribunal: tribunal || null,
      fecha: fecha || null,
      partes: partes || null,
      hechos: hechos || null,
      ratio: ratio || null,
      norma: norma || null,
      opinion: opinion || null,
      pdfUrl: pdfUrl || null,
      citadoDeId: citadoDeId || null,
    },
  });

  // Extraer y registrar hashtags
  const textForHashtags =
    formato === "OBITER_DICTUM" ? contenido || "" : opinion || "";
  const tags = extractHashtags(textForHashtags);
  if (tags.length > 0) {
    await registerHashtags(post.id, tags);
  }

  return NextResponse.json({ id: post.id });
}

// ─── GET: Feed con cursor pagination ─────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 10, 30);
  const formato = searchParams.get("formato");
  const hashtag = searchParams.get("hashtag");
  const guardados = searchParams.get("guardados") === "true";
  const userId = searchParams.get("userId"); // para perfil publico

  // Obtener IDs de colegas para visibilidad COLEGAS
  const colegaRequests = await prisma.colegaRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: authUser.id }, { receiverId: authUser.id }],
    },
    select: { senderId: true, receiverId: true },
  });
  const colegaIds = new Set<string>();
  for (const r of colegaRequests) {
    if (r.senderId !== authUser.id) colegaIds.add(r.senderId);
    if (r.receiverId !== authUser.id) colegaIds.add(r.receiverId);
  }

  // Construir where
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // Si es para un usuario especifico (perfil publico)
  if (userId) {
    where.userId = userId;
    // Solo mostrar publicos, o COLEGAS si es colega
    if (userId !== authUser.id) {
      const isColega = colegaIds.has(userId);
      if (isColega) {
        where.visibilidad = { in: ["PUBLICO", "COLEGAS"] };
      } else {
        where.visibilidad = "PUBLICO";
      }
    }
  } else {
    // Feed general: publico + colegas + propios
    where.OR = [
      { visibilidad: "PUBLICO" },
      { visibilidad: "COLEGAS", userId: { in: Array.from(colegaIds) } },
      { userId: authUser.id },
    ];
  }

  if (formato) {
    where.formato = formato;
  }

  if (hashtag) {
    where.hashtags = {
      some: { hashtag: { tag: hashtag.toLowerCase() } },
    };
  }

  if (guardados) {
    where.guardados = {
      some: { userId: authUser.id },
    };
  }

  const posts = await prisma.diarioPost.findMany({
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
          institution: true,
        },
      },
      hashtags: {
        include: { hashtag: { select: { id: true, tag: true } } },
      },
      _count: {
        select: { citas: true, guardados: true },
      },
      guardados: {
        where: { userId: authUser.id },
        select: { id: true },
      },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      formato: p.formato,
      visibilidad: p.visibilidad,
      titulo: p.titulo,
      materia: p.materia,
      contenido: p.contenido,
      tribunal: p.tribunal,
      hechos: p.hechos,
      ratio: p.ratio,
      opinion: p.opinion,
      views: p.views,
      citadoDeId: p.citadoDeId,
      createdAt: p.createdAt.toISOString(),
      user: p.user,
      hashtags: p.hashtags.map((h) => h.hashtag),
      citasCount: p._count.citas,
      guardadosCount: p._count.guardados,
      isGuardado: p.guardados.length > 0,
    })),
    nextCursor,
    hasMore,
  });
}
