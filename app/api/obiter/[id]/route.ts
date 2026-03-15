import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getColegaIdsForUser } from "@/lib/obiter-utils";

// ─── GET: Obiter individual (con hilo + cadena de citas) ────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const obiter = await prisma.obiterDictum.findUnique({
    where: { id },
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
          materia: true,
          tipo: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
          apoyosCount: true,
          citasCount: true,
        },
      },
      citadoPor: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          apoyosCount: true,
          citasCount: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { apoyosCount: "desc" },
        take: 10,
      },
    },
  });

  if (!obiter) {
    return NextResponse.json(
      { error: "Obiter no encontrado" },
      { status: 404 }
    );
  }

  // ─── Si es hilo: traer todas las partes ────────────────

  let threadParts = null;
  if (obiter.threadId) {
    threadParts = await prisma.obiterDictum.findMany({
      where: { threadId: obiter.threadId },
      orderBy: { threadOrder: "asc" },
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
  }

  // ─── Flags de interacción ──────────────────────────────

  let interaction = null;
  let colegasQueApoyaron: { firstName: string; lastName: string }[] = [];

  if (authUser) {
    const [apoyo, guardado, comuniquese] = await Promise.all([
      prisma.obiterApoyo.findUnique({
        where: { obiterId_userId: { obiterId: id, userId: authUser.id } },
        select: { id: true },
      }),
      prisma.obiterGuardado.findUnique({
        where: { obiterId_userId: { obiterId: id, userId: authUser.id } },
        select: { id: true },
      }),
      prisma.obiterComuniquese.findUnique({
        where: { obiterId_userId: { obiterId: id, userId: authUser.id } },
        select: { id: true },
      }),
    ]);

    interaction = {
      hasApoyado: !!apoyo,
      hasGuardado: !!guardado,
      hasComunicado: !!comuniquese,
    };

    // Apoyos semi-públicos
    const colegaIds = await getColegaIdsForUser(authUser.id);
    if (colegaIds.length > 0) {
      const apoyosColegas = await prisma.obiterApoyo.findMany({
        where: {
          obiterId: id,
          userId: { in: colegaIds },
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      });
      colegasQueApoyaron = apoyosColegas.map((a) => ({
        firstName: a.user.firstName,
        lastName: a.user.lastName,
      }));
    }
  }

  // ─── Preview del content de citas ──────────────────────

  const citadoPorFormatted = obiter.citadoPor.map((c) => ({
    id: c.id,
    content:
      c.content.length > 200
        ? c.content.slice(0, 200) + "…"
        : c.content,
    createdAt: c.createdAt.toISOString(),
    apoyosCount: c.apoyosCount,
    citasCount: c.citasCount,
    user: c.user,
  }));

  return NextResponse.json({
    obiter: {
      id: obiter.id,
      content: obiter.content,
      materia: obiter.materia,
      tipo: obiter.tipo,
      threadId: obiter.threadId,
      threadOrder: obiter.threadOrder,
      citedObiterId: obiter.citedObiterId,
      citedObiter: obiter.citedObiter
        ? {
            id: obiter.citedObiter.id,
            content: obiter.citedObiter.content,
            materia: obiter.citedObiter.materia,
            tipo: obiter.citedObiter.tipo,
            createdAt: obiter.citedObiter.createdAt.toISOString(),
            user: obiter.citedObiter.user,
            apoyosCount: obiter.citedObiter.apoyosCount,
            citasCount: obiter.citedObiter.citasCount,
          }
        : null,
      apoyosCount: obiter.apoyosCount,
      citasCount: obiter.citasCount,
      guardadosCount: obiter.guardadosCount,
      comuniqueseCount: obiter.comuniqueseCount,
      createdAt: obiter.createdAt.toISOString(),
      user: obiter.user,
      citadoPor: citadoPorFormatted,
      ...(interaction ?? {}),
      colegasQueApoyaron,
    },
    threadParts: threadParts?.map((p) => ({
      id: p.id,
      content: p.content,
      threadOrder: p.threadOrder,
      apoyosCount: p.apoyosCount,
      citasCount: p.citasCount,
      guardadosCount: p.guardadosCount,
      comuniqueseCount: p.comuniqueseCount,
      createdAt: p.createdAt.toISOString(),
      user: p.user,
    })) ?? null,
  });
}

// ─── DELETE: Eliminar Obiter ────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const obiter = await prisma.obiterDictum.findUnique({
    where: { id },
    select: {
      userId: true,
      threadId: true,
      threadOrder: true,
    },
  });

  if (!obiter) {
    return NextResponse.json(
      { error: "Obiter no encontrado" },
      { status: 404 }
    );
  }

  // Verificar que es el autor o admin
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (obiter.userId !== authUser.id && !user?.isAdmin) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar este Obiter" },
      { status: 403 }
    );
  }

  // Si es inicio de un hilo (threadOrder === 1): eliminar todo el hilo
  if (obiter.threadId && obiter.threadOrder === 1) {
    await prisma.obiterDictum.deleteMany({
      where: { threadId: obiter.threadId },
    });
  } else {
    await prisma.obiterDictum.delete({ where: { id } });
  }

  return NextResponse.json({ deleted: true });
}
