import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { VALID_ENSAYO_TIPOS } from "@/lib/diario-utils";

// ─── GET: Ensayo individual ─────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const ensayo = await prisma.ensayo.findUnique({
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

  if (!ensayo) {
    return NextResponse.json(
      { error: "Ensayo no encontrado" },
      { status: 404 }
    );
  }

  // Incrementar viewsCount
  await prisma.ensayo.update({
    where: { id },
    data: { viewsCount: { increment: 1 } },
  });

  // ─── Flags de interacción ────────────────────────────────

  let interaction = null;

  if (authUser) {
    const [apoyo, guardado, comuniquese] = await Promise.all([
      prisma.ensayoApoyo.findUnique({
        where: { ensayoId_userId: { ensayoId: id, userId: authUser.id } },
        select: { id: true },
      }),
      prisma.ensayoGuardado.findUnique({
        where: { ensayoId_userId: { ensayoId: id, userId: authUser.id } },
        select: { id: true },
      }),
      prisma.ensayoComuniquese.findUnique({
        where: { ensayoId_userId: { ensayoId: id, userId: authUser.id } },
        select: { id: true },
      }),
    ]);

    interaction = {
      hasApoyado: !!apoyo,
      hasGuardado: !!guardado,
      hasComunicado: !!comuniquese,
    };
  }

  return NextResponse.json({
    ensayo: {
      id: ensayo.id,
      titulo: ensayo.titulo,
      materia: ensayo.materia,
      tipo: ensayo.tipo,
      tags: ensayo.tags,
      resumen: ensayo.resumen,
      archivoUrl: ensayo.archivoUrl,
      archivoNombre: ensayo.archivoNombre,
      archivoFormato: ensayo.archivoFormato,
      archivoTamano: ensayo.archivoTamano,
      showInFeed: ensayo.showInFeed,
      apoyosCount: ensayo.apoyosCount,
      citasCount: ensayo.citasCount,
      guardadosCount: ensayo.guardadosCount,
      comuniqueseCount: ensayo.comuniqueseCount,
      viewsCount: ensayo.viewsCount + 1,
      downloadsCount: ensayo.downloadsCount,
      createdAt: ensayo.createdAt.toISOString(),
      updatedAt: ensayo.updatedAt.toISOString(),
      user: ensayo.user,
      citadoPorObiters: ensayo.citadoPorObiters.map((o) => ({
        id: o.id,
        content:
          o.content.length > 200
            ? o.content.slice(0, 200) + "…"
            : o.content,
        createdAt: o.createdAt.toISOString(),
        apoyosCount: o.apoyosCount,
        user: o.user,
      })),
      ...(interaction ?? {}),
    },
  });
}

// ─── PATCH: Actualizar Ensayo ───────────────────────────────

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

  const ensayo = await prisma.ensayo.findUnique({
    where: { id, isActive: true },
    select: { userId: true },
  });

  if (!ensayo) {
    return NextResponse.json(
      { error: "Ensayo no encontrado" },
      { status: 404 }
    );
  }

  if (ensayo.userId !== authUser.id) {
    return NextResponse.json(
      { error: "No tienes permiso para editar este ensayo" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { titulo, materia, tipo, tags, resumen, showInFeed } = body as {
    titulo?: string;
    materia?: string;
    tipo?: string;
    tags?: string | null;
    resumen?: string | null;
    showInFeed?: boolean;
  };

  if (tipo !== undefined && !VALID_ENSAYO_TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: `Tipo no válido. Tipos permitidos: ${VALID_ENSAYO_TIPOS.join(", ")}` },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (titulo !== undefined) data.titulo = titulo.trim();
  if (materia !== undefined) data.materia = materia.trim();
  if (tipo !== undefined) data.tipo = tipo;
  if (tags !== undefined) data.tags = tags?.trim() || null;
  if (resumen !== undefined) data.resumen = resumen?.trim() || null;
  if (showInFeed !== undefined) data.showInFeed = showInFeed;

  const updated = await prisma.ensayo.update({
    where: { id },
    data,
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

  return NextResponse.json({ ensayo: updated });
}

// ─── DELETE: Eliminar Ensayo (soft delete) ──────────────────

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

  const ensayo = await prisma.ensayo.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!ensayo) {
    return NextResponse.json(
      { error: "Ensayo no encontrado" },
      { status: 404 }
    );
  }

  // Verificar que es el autor o admin
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (ensayo.userId !== authUser.id && !user?.isAdmin) {
    return NextResponse.json(
      { error: "No tienes permiso para eliminar este ensayo" },
      { status: 403 }
    );
  }

  await prisma.ensayo.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ deleted: true });
}
