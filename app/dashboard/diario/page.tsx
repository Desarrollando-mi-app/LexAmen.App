import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DiarioFeed } from "./diario-feed";

export const metadata = {
  title: "El Diario — Iuris Studio",
};

export default async function DiarioPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Obtener IDs de colegas
  const colegaRequests = await prisma.colegaRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: authUser.id }, { receiverId: authUser.id }],
    },
    select: { senderId: true, receiverId: true },
  });
  const colegaIds: string[] = [];
  for (const r of colegaRequests) {
    if (r.senderId !== authUser.id) colegaIds.push(r.senderId);
    if (r.receiverId !== authUser.id) colegaIds.push(r.receiverId);
  }

  // Fetch primeros posts (SSR)
  const initialPosts = await prisma.diarioPost.findMany({
    where: {
      OR: [
        { visibilidad: "PUBLICO" },
        { visibilidad: "COLEGAS", userId: { in: colegaIds } },
        { userId: authUser.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 11, // limit + 1 para saber si hay mas
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
      _count: { select: { citas: true, guardados: true } },
      guardados: {
        where: { userId: authUser.id },
        select: { id: true },
      },
    },
  });

  const hasMore = initialPosts.length > 10;
  const items = hasMore ? initialPosts.slice(0, 10) : initialPosts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const serializedPosts = items.map((p) => ({
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
  }));

  // Contingencias
  const contingencias = await prisma.diarioHashtag.findMany({
    where: { isContingencia: true, hidden: false },
    orderBy: [{ pinned: "desc" }, { count: "desc" }],
    take: 10,
    select: { id: true, tag: true, count: true, pinned: true },
  });

  return (
    <DiarioFeed
      initialPosts={serializedPosts}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      contingencias={contingencias}
    />
  );
}
