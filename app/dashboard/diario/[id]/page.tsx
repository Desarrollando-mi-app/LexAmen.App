import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PostDetail } from "./post-detail";

export const metadata = {
  title: "Publicación — El Diario — Iuris Studio",
};

export default async function DiarioPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

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
      _count: { select: { citas: true, guardados: true } },
      guardados: {
        where: { userId: authUser.id },
        select: { id: true },
      },
    },
  });

  if (!post) notFound();

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
    if (!isColega) notFound();
  }

  // Incrementar views
  prisma.diarioPost
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  const serialized = {
    id: post.id,
    formato: post.formato,
    visibilidad: post.visibilidad,
    titulo: post.titulo,
    materia: post.materia,
    contenido: post.contenido,
    rol: post.rol,
    tribunal: post.tribunal,
    fecha: post.fecha,
    partes: post.partes,
    hechos: post.hechos,
    ratio: post.ratio,
    norma: post.norma,
    opinion: post.opinion,
    pdfUrl: post.pdfUrl,
    views: post.views,
    citadoDeId: post.citadoDeId,
    createdAt: post.createdAt.toISOString(),
    userId: post.userId,
    user: post.user,
    hashtags: post.hashtags.map((h) => h.hashtag),
    citadoDe: post.citadoDe
      ? {
          id: post.citadoDe.id,
          titulo: post.citadoDe.titulo,
          formato: post.citadoDe.formato,
          userName: `${post.citadoDe.user.firstName} ${post.citadoDe.user.lastName}`,
          createdAt: post.citadoDe.createdAt.toISOString(),
        }
      : null,
    citas: post.citas.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      formato: c.formato,
      contenido: c.contenido,
      opinion: c.opinion,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
    })),
    citasCount: post._count.citas,
    guardadosCount: post._count.guardados,
    isGuardado: post.guardados.length > 0,
  };

  return (
    <PostDetail
      post={serialized}
      currentUserId={authUser.id}
    />
  );
}
