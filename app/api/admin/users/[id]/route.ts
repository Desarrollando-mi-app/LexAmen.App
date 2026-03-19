import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
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

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const [
    flashcardsDominadas,
    mcqCorrectas,
    mcqTotal,
    vfCorrectas,
    vfTotal,
    simulacrosCompletados,
    obiters,
    analisis,
    ensayos,
    colegasCount,
    badgesCount,
    actividad,
    insignias,
    ligaHistory,
    reportesRecibidos,
  ] = await Promise.all([
    // Flashcards dominadas: repetitions >= 3
    prisma.userFlashcardProgress.count({
      where: { userId: id, repetitions: { gte: 3 } },
    }),
    // MCQ correctas
    prisma.userMCQAttempt.count({
      where: { userId: id, isCorrect: true },
    }),
    // MCQ total
    prisma.userMCQAttempt.count({
      where: { userId: id },
    }),
    // V/F correctas
    prisma.userTrueFalseAttempt.count({
      where: { userId: id, isCorrect: true },
    }),
    // V/F total
    prisma.userTrueFalseAttempt.count({
      where: { userId: id },
    }),
    // Simulacros completados
    prisma.simulacroSesion.count({
      where: { userId: id, completada: true },
    }),
    // Publicaciones: obiters
    prisma.obiterDictum.count({
      where: { userId: id },
    }),
    // Publicaciones: analisis
    prisma.analisisSentencia.count({
      where: { userId: id },
    }),
    // Publicaciones: ensayos
    prisma.ensayo.count({
      where: { userId: id },
    }),
    // Colegas count (accepted, sent or received)
    prisma.colegaRequest.count({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: id }, { receiverId: id }],
      },
    }),
    // Badges count
    prisma.userBadge.count({
      where: { userId: id },
    }),
    // Actividad: last 20 XpLogs
    prisma.xpLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        detalle: true,
        amount: true,
        materia: true,
        category: true,
        createdAt: true,
      },
    }),
    // Insignias
    prisma.userBadge.findMany({
      where: { userId: id },
      orderBy: { earnedAt: "desc" },
      select: {
        id: true,
        badge: true,
        earnedAt: true,
      },
    }),
    // Liga history: last 5
    prisma.leagueMember.findMany({
      where: { userId: id },
      orderBy: { league: { weekStart: "desc" } },
      take: 5,
      select: {
        id: true,
        weeklyXp: true,
        rank: true,
        league: {
          select: {
            tier: true,
            weekStart: true,
            weekEnd: true,
          },
        },
      },
    }),
    // Reportes recibidos
    prisma.reporteUsuario.count({
      where: { reportadoId: id },
    }),
  ]);

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      deletedAt: user.deletedAt?.toISOString() ?? null,
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
      planExpiresAt: user.planExpiresAt?.toISOString() ?? null,
      termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
      examDate: user.examDate?.toISOString() ?? null,
    },
    estadisticas: {
      flashcardsDominadas,
      mcqCorrectas,
      mcqTotal,
      vfCorrectas,
      vfTotal,
      simulacrosCompletados,
      causasGanadas: user.causasGanadas,
      causasPerdidas: user.causasPerdidas,
      publicaciones: { obiters, analisis, ensayos },
      colegasCount,
      badgesCount,
    },
    actividad: actividad.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    insignias: insignias.map((i) => ({
      ...i,
      earnedAt: i.earnedAt.toISOString(),
    })),
    ligaHistory: ligaHistory.map((l) => ({
      id: l.id,
      weeklyXp: l.weeklyXp,
      rank: l.rank,
      tier: l.league.tier,
      weekStart: l.league.weekStart.toISOString(),
      weekEnd: l.league.weekEnd.toISOString(),
    })),
    reportesRecibidos,
  });
}

export async function PATCH(
  request: NextRequest,
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

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body as { action?: string };

  // Handle suspend/unsuspend actions
  if (action === "suspend") {
    if (id === authUser.id) {
      return NextResponse.json(
        { error: "No puedes suspenderte a ti mismo" },
        { status: 400 }
      );
    }
    await prisma.user.update({
      where: { id },
      data: {
        suspended: true,
        suspendedAt: new Date(),
        suspendedReason: body.reason ?? null,
      },
    });
    await prisma.adminLog.create({
      data: {
        adminId: authUser.id,
        action: "SUSPEND_USER",
        target: id,
        metadata: { reason: body.reason },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unsuspend") {
    await prisma.user.update({
      where: { id },
      data: {
        suspended: false,
        suspendedAt: null,
        suspendedReason: null,
      },
    });
    await prisma.adminLog.create({
      data: {
        adminId: authUser.id,
        action: "UNSUSPEND_USER",
        target: id,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Handle field updates (plan, grado, universidad, sede, isAdmin)
  const allowedFields = ["plan", "grado", "universidad", "sede", "isAdmin"] as const;
  const updateData: Record<string, unknown> = {};
  const changes: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "grado") {
        updateData[field] = parseInt(body[field], 10);
      } else if (field === "isAdmin") {
        if (id === authUser.id) {
          return NextResponse.json(
            { error: "No puedes cambiar tu propio rol de admin" },
            { status: 400 }
          );
        }
        updateData[field] = Boolean(body[field]);
      } else {
        updateData[field] = body[field];
      }
      changes[field] = updateData[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: updateData,
  });

  await prisma.adminLog.create({
    data: {
      adminId: authUser.id,
      action: "UPDATE_USER_FIELDS",
      target: id,
      metadata: changes as Record<string, string | number | boolean>,
    },
  });

  return NextResponse.json({ ok: true });
}
