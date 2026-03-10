import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { unregisterHashtags } from "@/lib/hashtags";

// ─── GET: Detalle de un post ─────────────────────────────

export async function GET(
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

  const post = await prisma.diarioPost.findUnique({
    where: { id },
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
      citadoDe: {
        select: {
          id: true,
          titulo: true,
          formato: true,
          user: { select: { firstName: true, lastName: true } },
          createdAt: true,
        },
      },
      citas: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          titulo: true,
          formato: true,
          contenido: true,
          opinion: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
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

  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  // Verificar visibilidad
  if (post.visibilidad === "COLEGAS" && post.userId !== authUser.id) {
    const isColega = await prisma.colegaRequest.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: authUser.id, receiverId: post.userId },
          { senderId: post.userId, receiverId: authUser.id },
        ],
      },
    });
    if (!isColega) {
      return NextResponse.json(
        { error: "No tienes acceso a este post" },
        { status: 403 }
      );
    }
  }

  // Incrementar views (fire-and-forget)
  prisma.diarioPost
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  return NextResponse.json({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    hashtags: post.hashtags.map((h) => h.hashtag),
    citasCount: post._count.citas,
    guardadosCount: post._count.guardados,
    isGuardado: post.guardados.length > 0,
    citadoDe: post.citadoDe
      ? {
          ...post.citadoDe,
          createdAt: post.citadoDe.createdAt.toISOString(),
        }
      : null,
    citas: post.citas.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

// ─── DELETE: Borrar post propio ──────────────────────────

export async function DELETE(
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

  const post = await prisma.diarioPost.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  if (post.userId !== authUser.id) {
    return NextResponse.json(
      { error: "Solo puedes eliminar tus propias publicaciones" },
      { status: 403 }
    );
  }

  // Decrementar hashtag counts
  await unregisterHashtags(id);

  // Eliminar guardados y el post
  await prisma.diarioGuardado.deleteMany({ where: { postId: id } });
  await prisma.diarioPost.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
