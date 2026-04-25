import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PostulacionesAdminClient } from "./postulaciones-client";

export const metadata = {
  title: "Peer Review · Postulaciones — Admin",
};

export default async function AdminPeerReviewPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!admin?.isAdmin) redirect("/dashboard");

  // Carga inicial — pendientes primero. El client refetcha cuando se cambia
  // de filtro o se aprueba/rechaza una postulación.
  const postulaciones = await prisma.peerReviewPostulacion.findMany({
    where: { estado: "pendiente" },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          grado: true,
          xp: true,
          etapaActual: true,
          universidad: true,
          isPeerReviewer: true,
        },
      },
      resueltoPor: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Conteo de publicaciones para context.
  const userIds = postulaciones.map((p) => p.user.id);
  const [analisisCounts, ensayoCounts] = await Promise.all([
    userIds.length > 0
      ? prisma.analisisSentencia.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, isActive: true },
          _count: { id: true },
        })
      : Promise.resolve([]),
    userIds.length > 0
      ? prisma.ensayo.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds }, isActive: true },
          _count: { id: true },
        })
      : Promise.resolve([]),
  ]);

  const publicacionesByUser = new Map<string, number>();
  for (const a of analisisCounts) {
    publicacionesByUser.set(a.userId, (publicacionesByUser.get(a.userId) ?? 0) + a._count.id);
  }
  for (const e of ensayoCounts) {
    publicacionesByUser.set(e.userId, (publicacionesByUser.get(e.userId) ?? 0) + e._count.id);
  }

  const serialized = postulaciones.map((p) => ({
    id: p.id,
    motivacion: p.motivacion,
    areasInteres: p.areasInteres,
    publicacionMuestra: p.publicacionMuestra,
    estado: p.estado,
    resolucionNota: p.resolucionNota,
    resueltaAt: p.resueltaAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    user: {
      ...p.user,
      publicacionesCount: publicacionesByUser.get(p.user.id) ?? 0,
    },
    resueltoPor: p.resueltoPor,
  }));

  return <PostulacionesAdminClient initial={serialized} />;
}
