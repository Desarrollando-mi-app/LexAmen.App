import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  calculateReadingTime,
  ANALISIS_HECHOS_MAX_CHARS,
  ANALISIS_RATIO_MAX_CHARS,
  ANALISIS_RESUMEN_MAX_CHARS,
} from "@/lib/diario-utils";

// ─── GET: Análisis individual ───────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const analisis = await prisma.analisisSentencia.findUnique({
    where: { id, isActive: true },
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
      citadoPorObiters: {
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

  if (!analisis) {
    return NextResponse.json(
      { error: "Análisis no encontrado" },
      { status: 404 }
    );
  }

  // Incrementar viewsCount
  await prisma.analisisSentencia.update({
    where: { id },
    data: { viewsCount: { increment: 1 } },
  });

  // ─── Flags de interacción ──────────────────────────────────

  let interaction = null;

  if (authUser) {
    const [apoyo, guardado, comuniquese] = await Promise.all([
      prisma.analisisApoyo.findUnique({
        where: {
          analisisId_userId: { analisisId: id, userId: authUser.id },
        },
        select: { id: true },
      }),
      prisma.analisisGuardado.findUnique({
        where: {
          analisisId_userId: { analisisId: id, userId: authUser.id },
        },
        select: { id: true },
      }),
      prisma.analisisComuniquese.findUnique({
        where: {
          analisisId_userId: { analisisId: id, userId: authUser.id },
        },
        select: { id: true },
      }),
    ]);

    interaction = {
      hasApoyado: !!apoyo,
      hasGuardado: !!guardado,
      hasComunicado: !!comuniquese,
    };
  }

  // ─── Response ─────────────────────────────────────────────

  return NextResponse.json({
    analisis: {
      id: analisis.id,
      titulo: analisis.titulo,
      materia: analisis.materia,
      tags: analisis.tags,
      tribunal: analisis.tribunal,
      numeroRol: analisis.numeroRol,
      fechaFallo: analisis.fechaFallo.toISOString(),
      partes: analisis.partes,
      falloUrl: analisis.falloUrl,
      falloPdfUrl: analisis.falloPdfUrl,
      hechos: analisis.hechos,
      ratioDecidendi: analisis.ratioDecidendi,
      opinion: analisis.opinion,
      resumen: analisis.resumen,
      tiempoLectura: analisis.tiempoLectura,
      showInFeed: analisis.showInFeed,
      apoyosCount: analisis.apoyosCount,
      citasCount: analisis.citasCount,
      guardadosCount: analisis.guardadosCount,
      comuniqueseCount: analisis.comuniqueseCount,
      viewsCount: analisis.viewsCount + 1,
      createdAt: analisis.createdAt.toISOString(),
      updatedAt: analisis.updatedAt.toISOString(),
      user: analisis.user,
      citadoPorObiters: analisis.citadoPorObiters.map((o) => ({
        id: o.id,
        content:
          o.content.length > 200
            ? o.content.slice(0, 200) + "…"
            : o.content,
        createdAt: o.createdAt.toISOString(),
        apoyosCount: o.apoyosCount,
        citasCount: o.citasCount,
        user: o.user,
      })),
      ...(interaction ?? {}),
    },
  });
}

// ─── PATCH: Actualizar Análisis ─────────────────────────────

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

  const analisis = await prisma.analisisSentencia.findUnique({
    where: { id, isActive: true },
    select: { userId: true },
  });

  if (!analisis) {
    return NextResponse.json(
      { error: "Análisis no encontrado" },
      { status: 404 }
    );
  }

  if (analisis.userId !== authUser.id) {
    return NextResponse.json(
      { error: "No tienes permiso para editar este análisis" },
      { status: 403 }
    );
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
    titulo?: string;
    materia?: string;
    tags?: string;
    tribunal?: string;
    numeroRol?: string;
    fechaFallo?: string;
    partes?: string;
    falloUrl?: string;
    hechos?: string;
    ratioDecidendi?: string;
    opinion?: string;
    resumen?: string;
    showInFeed?: boolean;
  };

  // ─── Validaciones ─────────────────────────────────────────

  if (hechos !== undefined && hechos.length > ANALISIS_HECHOS_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `Los hechos no pueden exceder ${ANALISIS_HECHOS_MAX_CHARS} caracteres`,
      },
      { status: 400 }
    );
  }

  if (
    ratioDecidendi !== undefined &&
    ratioDecidendi.length > ANALISIS_RATIO_MAX_CHARS
  ) {
    return NextResponse.json(
      {
        error: `La ratio decidendi no puede exceder ${ANALISIS_RATIO_MAX_CHARS} caracteres`,
      },
      { status: 400 }
    );
  }

  if (resumen !== undefined && resumen.length > ANALISIS_RESUMEN_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `El resumen no puede exceder ${ANALISIS_RESUMEN_MAX_CHARS} caracteres`,
      },
      { status: 400 }
    );
  }

  // ─── Construir datos de actualización ─────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (titulo !== undefined) updateData.titulo = titulo.trim();
  if (materia !== undefined) updateData.materia = materia.trim();
  if (tags !== undefined) updateData.tags = tags?.trim() || null;
  if (tribunal !== undefined) updateData.tribunal = tribunal.trim();
  if (numeroRol !== undefined) updateData.numeroRol = numeroRol.trim();
  if (fechaFallo !== undefined) updateData.fechaFallo = new Date(fechaFallo);
  if (partes !== undefined) updateData.partes = partes.trim();
  if (falloUrl !== undefined) updateData.falloUrl = falloUrl || null;
  if (hechos !== undefined) updateData.hechos = hechos.trim();
  if (ratioDecidendi !== undefined)
    updateData.ratioDecidendi = ratioDecidendi.trim();
  if (opinion !== undefined) updateData.opinion = opinion.trim();
  if (resumen !== undefined) updateData.resumen = resumen.trim();
  if (showInFeed !== undefined) updateData.showInFeed = showInFeed;

  // Recalcular tiempoLectura si algún campo de contenido cambió
  if (
    hechos !== undefined ||
    ratioDecidendi !== undefined ||
    opinion !== undefined
  ) {
    // Fetch current values for fields not being updated
    const current = await prisma.analisisSentencia.findUnique({
      where: { id },
      select: { hechos: true, ratioDecidendi: true, opinion: true },
    });

    if (current) {
      updateData.tiempoLectura = calculateReadingTime(
        hechos ?? current.hechos,
        ratioDecidendi ?? current.ratioDecidendi,
        opinion ?? current.opinion
      );
    }
  }

  const updated = await prisma.analisisSentencia.update({
    where: { id },
    data: updateData,
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

  return NextResponse.json({ analisis: updated });
}

// ─── DELETE: Eliminar Análisis ──────────────────────────────

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

  const analisis = await prisma.analisisSentencia.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!analisis) {
    return NextResponse.json(
      { error: "Análisis no encontrado" },
      { status: 404 }
    );
  }

  // Verificar que es el autor o admin
  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (analisis.userId !== authUser.id && !admin?.isAdmin) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar este análisis" },
      { status: 403 }
    );
  }

  // Soft delete
  await prisma.analisisSentencia.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ deleted: true });
}
