import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { evaluateObiterBadges } from "@/lib/badges";
import {
  canPublishObiter,
  getColegaIdsForUser,
  OBITER_MAX_CHARS,
  OBITER_MAX_WORDS,
  OBITER_MAX_THREAD_PARTS,
} from "@/lib/obiter-utils";
import { awardXp, XP_CITADO_OBITER } from "@/lib/xp-config";
import { buildPreviewsForContent, serializeLinkPreviews, parseLinkPreviews } from "@/lib/og-preview";

// ─── POST: Crear Obiter ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { content, materia, tipo, citedObiterId, citedAnalisisId, citedEnsayoId, threadId, threadOrder } =
    body as {
      content: string;
      materia?: string;
      tipo?: string;
      citedObiterId?: string;
      citedAnalisisId?: string;
      citedEnsayoId?: string;
      threadId?: string;
      threadOrder?: number;
    };

  // ─── Validación: content ────────────────────────────────

  if (!content || !content.trim()) {
    return NextResponse.json(
      { error: "El contenido es requerido" },
      { status: 400 }
    );
  }

  if (content.length > OBITER_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `El contenido no puede exceder ${OBITER_MAX_CHARS} caracteres`,
      },
      { status: 400 }
    );
  }

  const wordCount = content.trim().split(/\s+/).length;
  if (wordCount > OBITER_MAX_WORDS) {
    return NextResponse.json(
      {
        error: `El contenido no puede exceder ${OBITER_MAX_WORDS} palabras (actual: ${wordCount})`,
      },
      { status: 400 }
    );
  }

  // ─── Validación: límite diario (solo free, solo obiters raíz) ──

  const isThreadContinuation = threadId && threadOrder && threadOrder > 1;

  if (!isThreadContinuation) {
    const publishCheck = await canPublishObiter(authUser.id);
    if (!publishCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "Has alcanzado tu límite de 5 publicaciones diarias. Actualiza a Premium para publicar sin límites.",
          remaining: 0,
          isPremium: false,
        },
        { status: 429 }
      );
    }
  }

  // ─── Validación: hilo ──────────────────────────────────

  if (threadId) {
    // Caso A: ya existe el hilo (alguna parte con este threadId).
    let firstInThread = await prisma.obiterDictum.findFirst({
      where: { threadId, threadOrder: 1 },
      select: { userId: true },
    });

    // Caso B: el threadId apunta a un OD standalone (sin threadId aún).
    // Si es propiedad del usuario, lo upgradeamos a parte 1 del hilo.
    // Esto permite "convertir un OD ya publicado en hilo" agregando una
    // parte 2 sin requerir un endpoint separado.
    if (!firstInThread) {
      const standaloneCandidate = await prisma.obiterDictum.findUnique({
        where: { id: threadId },
        select: { id: true, userId: true, threadId: true, threadOrder: true },
      });

      if (
        standaloneCandidate &&
        standaloneCandidate.userId === authUser.id &&
        standaloneCandidate.threadId === null &&
        standaloneCandidate.threadOrder === null
      ) {
        // Promovemos el standalone a parte 1 del nuevo hilo.
        await prisma.obiterDictum.update({
          where: { id: standaloneCandidate.id },
          data: { threadId, threadOrder: 1 },
        });
        firstInThread = { userId: standaloneCandidate.userId };
      }
    }

    if (!firstInThread) {
      return NextResponse.json(
        { error: "El hilo indicado no existe" },
        { status: 400 }
      );
    }

    if (firstInThread.userId !== authUser.id) {
      return NextResponse.json(
        { error: "Solo el autor del hilo puede continuarlo" },
        { status: 403 }
      );
    }

    if (!threadOrder || threadOrder < 1) {
      return NextResponse.json(
        { error: "threadOrder debe ser >= 1" },
        { status: 400 }
      );
    }

    if (threadOrder > OBITER_MAX_THREAD_PARTS) {
      return NextResponse.json(
        {
          error: `Un hilo no puede tener más de ${OBITER_MAX_THREAD_PARTS} partes`,
        },
        { status: 400 }
      );
    }

    // Verificar que threadOrder es secuencial (no gaps).
    // Si recién promovimos un standalone, lastInThread devolverá la parte 1
    // y el expectedOrder será 2 — coincidente con lo que pidió el cliente.
    const lastInThread = await prisma.obiterDictum.findFirst({
      where: { threadId },
      orderBy: { threadOrder: "desc" },
      select: { threadOrder: true },
    });

    const expectedOrder = (lastInThread?.threadOrder ?? 0) + 1;
    if (threadOrder !== expectedOrder) {
      return NextResponse.json(
        {
          error: `El siguiente número de parte debe ser ${expectedOrder}`,
        },
        { status: 400 }
      );
    }
  }

  // ─── Validación: cita ──────────────────────────────────

  if (citedObiterId) {
    const citedObiter = await prisma.obiterDictum.findUnique({
      where: { id: citedObiterId },
      select: { id: true },
    });

    if (!citedObiter) {
      return NextResponse.json(
        { error: "El Obiter citado no existe" },
        { status: 400 }
      );
    }
  }

  if (citedAnalisisId) {
    const cited = await prisma.analisisSentencia.findUnique({ where: { id: citedAnalisisId }, select: { id: true } });
    if (!cited) return NextResponse.json({ error: "El Análisis citado no existe" }, { status: 400 });
  }

  if (citedEnsayoId) {
    const cited = await prisma.ensayo.findUnique({ where: { id: citedEnsayoId }, select: { id: true } });
    if (!cited) return NextResponse.json({ error: "El Ensayo citado no existe" }, { status: 400 });
  }

  // ─── Link previews ────────────────────────────────────
  // Detecta URLs en el contenido y obtiene metadata Open Graph para
  // mostrarlas como tarjetas en el card. Si la columna linkPreviews aún
  // no existe (migración pendiente), no falla — se omite el campo.
  let linkPreviewsJson: string | null = null;
  try {
    const previews = await buildPreviewsForContent(content.trim());
    linkPreviewsJson = serializeLinkPreviews(previews);
  } catch (err) {
    console.warn("[obiter] buildPreviewsForContent failed:", err);
  }

  // ─── Crear obiter ─────────────────────────────────────

  const obiter = await prisma.obiterDictum.create({
    data: {
      userId: authUser.id,
      content: content.trim(),
      materia: materia || null,
      tipo: tipo || null,
      citedObiterId: citedObiterId || null,
      citedAnalisisId: citedAnalisisId || null,
      citedEnsayoId: citedEnsayoId || null,
      threadId: threadId || null,
      threadOrder: threadId ? threadOrder : null,
      ...(linkPreviewsJson != null && { linkPreviews: linkPreviewsJson }),
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

  // ─── Side effects ──────────────────────────────────────

  // Si es CITA: incrementar contador + XP + notificación
  if (citedObiterId) {
    const citedObiter = await prisma.obiterDictum.update({
      where: { id: citedObiterId },
      data: { citasCount: { increment: 1 } },
      select: { userId: true },
    });

    // XP al autor citado (si no es el mismo usuario)
    if (citedObiter.userId !== authUser.id) {
      await awardXp({
        userId: citedObiter.userId,
        amount: XP_CITADO_OBITER,
        category: "publicaciones",
        detalle: "Obiter Dictum",
        prisma,
      });

      // Notificación
      await sendNotification({
        type: "OBITER_CITA",
        title: "Tu Obiter fue citado",
        body: `${obiter.user.firstName} ${obiter.user.lastName} citó tu Obiter`,
        targetUserId: citedObiter.userId,
        metadata: {
          obiterId: obiter.id,
          citedObiterId,
          actorId: authUser.id,
          actorName: `${obiter.user.firstName} ${obiter.user.lastName}`,
        },
      });

      // Evaluar badges de Obiter para el autor citado
      evaluateObiterBadges(citedObiter.userId).catch(() => {});
    }
  }

  if (citedAnalisisId) {
    await prisma.analisisSentencia.update({
      where: { id: citedAnalisisId },
      data: { citasCount: { increment: 1 } },
    });
  }

  if (citedEnsayoId) {
    await prisma.ensayo.update({
      where: { id: citedEnsayoId },
      data: { citasCount: { increment: 1 } },
    });
  }

  // Devolvemos linkPreviews ya parseado para el cliente.
  const obiterOut = {
    ...obiter,
    linkPreviews: linkPreviewsJson
      ? JSON.parse(linkPreviewsJson)
      : [],
  };
  return NextResponse.json({ obiter: obiterOut }, { status: 201 });
}

// ─── GET: Feed de Obiters ───────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { searchParams } = request.nextUrl;
  const feed = searchParams.get("feed") || "recientes";
  const materia = searchParams.get("materia");
  const userId = searchParams.get("userId");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  // ─── Colega IDs (para feeds que lo requieren) ─────────

  let colegaIds: string[] = [];
  if (authUser) {
    colegaIds = await getColegaIdsForUser(authUser.id);
  }

  // ─── Construir where según feed ────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let orderBy: any = { createdAt: "desc" };

  // Base: solo obiters raíz (no partes 2+ de hilos)
  const rootFilter = {
    OR: [{ threadOrder: null }, { threadOrder: 1 }],
  };

  switch (feed) {
    case "recientes":
      where = { ...rootFilter };
      orderBy = { createdAt: "desc" };
      break;

    case "destacados": {
      const fortyEightHoursAgo = new Date(
        Date.now() - 48 * 60 * 60 * 1000
      );
      where = {
        ...rootFilter,
        createdAt: { gte: fortyEightHoursAgo },
      };
      // Ordenar por engagement: apoyos + citas*2
      orderBy = [
        { apoyosCount: "desc" },
        { citasCount: "desc" },
        { createdAt: "desc" },
      ];
      break;
    }

    case "colegas":
      if (!authUser) {
        return NextResponse.json(
          { error: "Necesitas iniciar sesión para ver el feed de colegas" },
          { status: 401 }
        );
      }
      where = {
        ...rootFilter,
        userId: { in: colegaIds },
      };
      orderBy = { createdAt: "desc" };
      break;

    case "guardados":
      if (!authUser) {
        return NextResponse.json(
          { error: "Necesitas iniciar sesión para ver tus guardados" },
          { status: 401 }
        );
      }
      where = {
        ...rootFilter,
        guardados: { some: { userId: authUser.id } },
      };
      orderBy = { createdAt: "desc" };
      break;

    default:
      where = { ...rootFilter };
      orderBy = { createdAt: "desc" };
  }

  // ─── Filtros adicionales ──────────────────────────────

  if (materia) {
    where.materia = materia;
  }

  if (userId) {
    where.userId = userId;
  }

  // ─── Query ────────────────────────────────────────────

  const obiters = await prisma.obiterDictum.findMany({
    where,
    orderBy,
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
      citedObiter: {
        select: {
          id: true,
          content: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      citedAnalisis: {
        select: {
          id: true,
          titulo: true,
          tribunal: true,
          materia: true,
        },
      },
      citedEnsayo: {
        select: {
          id: true,
          titulo: true,
          tipo: true,
          materia: true,
        },
      },
      _count: {
        select: {
          citadoPor: true,
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

  const hasMore = obiters.length > limit;
  const items = hasMore ? obiters.slice(0, limit) : obiters;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // ─── Hilos: contar partes para obiters que son inicio de hilo ──

  const threadStarters = items.filter(
    (o) => o.threadId && o.threadOrder === 1
  );
  const threadCounts: Record<string, number> = {};
  if (threadStarters.length > 0) {
    const threadIds = threadStarters.map((o) => o.threadId!);
    const counts = await prisma.obiterDictum.groupBy({
      by: ["threadId"],
      where: { threadId: { in: threadIds } },
      _count: true,
    });
    for (const c of counts) {
      if (c.threadId) {
        threadCounts[c.threadId] = c._count;
      }
    }
  }

  // ─── Apoyos semi-públicos: colegas que apoyaron ──────

  let colegasQueApoyaron: Record<string, { firstName: string; lastName: string }[]> = {};
  if (authUser && colegaIds.length > 0) {
    const obiterIds = items.map((o) => o.id);
    const apoyosColegas = await prisma.obiterApoyo.findMany({
      where: {
        obiterId: { in: obiterIds },
        userId: { in: colegaIds },
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
    colegasQueApoyaron = {};
    for (const a of apoyosColegas) {
      if (!colegasQueApoyaron[a.obiterId]) {
        colegasQueApoyaron[a.obiterId] = [];
      }
      colegasQueApoyaron[a.obiterId].push({
        firstName: a.user.firstName,
        lastName: a.user.lastName,
      });
    }
  }

  // ─── Previews de Análisis y Ensayos en feed ──────────
  // Solo para "recientes" y "destacados", sin cursor (primera página)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let analisisPreviews: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ensayoPreviews: any[] = [];

  if ((feed === "recientes" || feed === "destacados") && !cursor) {
    const previewWhere = {
      isActive: true,
      isHidden: false,
      showInFeed: true,
      ...(materia ? { materia } : {}),
      ...(userId ? { userId } : {}),
    };

    const [rawAnalisis, rawEnsayos] = await Promise.all([
      prisma.analisisSentencia.findMany({
        where: previewWhere,
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true },
          },
          ...(authUser
            ? {
                apoyos: { where: { userId: authUser.id }, select: { id: true } },
                guardados: { where: { userId: authUser.id }, select: { id: true } },
                comuniquese: { where: { userId: authUser.id }, select: { id: true } },
              }
            : {}),
        },
      }),
      prisma.ensayo.findMany({
        where: previewWhere,
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true },
          },
          ...(authUser
            ? {
                apoyos: { where: { userId: authUser.id }, select: { id: true } },
                guardados: { where: { userId: authUser.id }, select: { id: true } },
                comuniquese: { where: { userId: authUser.id }, select: { id: true } },
              }
            : {}),
        },
      }),
    ]);

    analisisPreviews = rawAnalisis.map((a) => ({
      type: "analisis_preview" as const,
      data: {
        id: a.id,
        titulo: a.titulo,
        resumen: a.resumen,
        tribunal: a.tribunal,
        numeroRol: a.numeroRol,
        materia: a.materia,
        tiempoLectura: a.tiempoLectura,
        user: a.user,
        apoyosCount: a.apoyosCount,
        citasCount: a.citasCount,
        guardadosCount: a.guardadosCount,
        comuniqueseCount: a.comuniqueseCount,
        ...(authUser
          ? {
              hasApoyado: (a as typeof a & { apoyos: { id: string }[] }).apoyos?.length > 0,
              hasGuardado: (a as typeof a & { guardados: { id: string }[] }).guardados?.length > 0,
              hasComunicado: (a as typeof a & { comuniquese: { id: string }[] }).comuniquese?.length > 0,
            }
          : {}),
        createdAt: a.createdAt.toISOString(),
      },
    }));

    ensayoPreviews = rawEnsayos.map((e) => ({
      type: "ensayo_preview" as const,
      data: {
        id: e.id,
        titulo: e.titulo,
        resumen: e.resumen,
        materia: e.materia,
        tipo: e.tipo,
        archivoFormato: e.archivoFormato,
        user: e.user,
        apoyosCount: e.apoyosCount,
        citasCount: e.citasCount,
        guardadosCount: e.guardadosCount,
        comuniqueseCount: e.comuniqueseCount,
        downloadsCount: e.downloadsCount,
        ...(authUser
          ? {
              hasApoyado: (e as typeof e & { apoyos: { id: string }[] }).apoyos?.length > 0,
              hasGuardado: (e as typeof e & { guardados: { id: string }[] }).guardados?.length > 0,
              hasComunicado: (e as typeof e & { comuniquese: { id: string }[] }).comuniquese?.length > 0,
            }
          : {}),
        createdAt: e.createdAt.toISOString(),
      },
    }));
  }

  // ─── Response ─────────────────────────────────────────

  const obiterItems = items.map((o) => ({
    type: "obiter" as const,
    data: {
      id: o.id,
      userId: o.userId,
      content: o.content,
      materia: o.materia,
      tipo: o.tipo,
      threadId: o.threadId,
      threadOrder: o.threadOrder,
      threadPartsCount: o.threadId ? (threadCounts[o.threadId] ?? 1) : null,
      citedObiterId: o.citedObiterId,
      citedObiter: o.citedObiter
        ? {
            id: o.citedObiter.id,
            content:
              o.citedObiter.content.length > 200
                ? o.citedObiter.content.slice(0, 200) + "…"
                : o.citedObiter.content,
            user: o.citedObiter.user,
          }
        : null,
      citedAnalisisId: o.citedAnalisisId,
      citedAnalisis: o.citedAnalisis,
      citedEnsayoId: o.citedEnsayoId,
      citedEnsayo: o.citedEnsayo,
      apoyosCount: o.apoyosCount,
      citasCount: o.citasCount,
      guardadosCount: o.guardadosCount,
      comuniqueseCount: o.comuniqueseCount,
      linkPreviews: parseLinkPreviews((o as { linkPreviews?: string | null }).linkPreviews ?? null),
      createdAt: o.createdAt.toISOString(),
      user: o.user,
      ...(authUser
        ? {
            hasApoyado: (o as typeof o & { apoyos: { id: string }[] }).apoyos?.length > 0,
            hasGuardado: (o as typeof o & { guardados: { id: string }[] }).guardados?.length > 0,
            hasComunicado: (o as typeof o & { comuniquese: { id: string }[] }).comuniquese?.length > 0,
            colegasQueApoyaron: colegasQueApoyaron[o.id] ?? [],
          }
        : {}),
    },
  }));

  // Merge previews into feed (interleave by createdAt)
  const allFeedItems = [...obiterItems, ...analisisPreviews, ...ensayoPreviews]
    .sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());

  // Also return obiters in legacy format for backward compatibility
  return NextResponse.json({
    obiters: items.map((o) => ({
      id: o.id,
      userId: o.userId,
      content: o.content,
      materia: o.materia,
      tipo: o.tipo,
      threadId: o.threadId,
      threadOrder: o.threadOrder,
      threadPartsCount: o.threadId ? (threadCounts[o.threadId] ?? 1) : null,
      citedObiterId: o.citedObiterId,
      citedObiter: o.citedObiter
        ? {
            id: o.citedObiter.id,
            content:
              o.citedObiter.content.length > 200
                ? o.citedObiter.content.slice(0, 200) + "…"
                : o.citedObiter.content,
            user: o.citedObiter.user,
          }
        : null,
      citedAnalisisId: o.citedAnalisisId,
      citedAnalisis: o.citedAnalisis,
      citedEnsayoId: o.citedEnsayoId,
      citedEnsayo: o.citedEnsayo,
      apoyosCount: o.apoyosCount,
      citasCount: o.citasCount,
      guardadosCount: o.guardadosCount,
      comuniqueseCount: o.comuniqueseCount,
      linkPreviews: parseLinkPreviews((o as { linkPreviews?: string | null }).linkPreviews ?? null),
      createdAt: o.createdAt.toISOString(),
      user: o.user,
      ...(authUser
        ? {
            hasApoyado: (o as typeof o & { apoyos: { id: string }[] }).apoyos?.length > 0,
            hasGuardado: (o as typeof o & { guardados: { id: string }[] }).guardados?.length > 0,
            hasComunicado: (o as typeof o & { comuniquese: { id: string }[] }).comuniquese?.length > 0,
            colegasQueApoyaron: colegasQueApoyaron[o.id] ?? [],
          }
        : {}),
    })),
    // Unified feed items (includes previews)
    feedItems: allFeedItems,
    nextCursor,
    hasMore,
  });
}
