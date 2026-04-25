import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { GestionTabsClient } from "./gestion-tabs-client";

export const metadata = {
  title: "Gestión de pasantías — Studio Iuris",
};

/**
 * Panel de gestión del usuario para pasantías V4.
 *
 * 4 vistas:
 *  - Feed: el listado completo (mantiene el CRUD legacy con filtros y crear).
 *  - Enviadas: mis postulaciones, con estado y enlaces a la oferta.
 *  - Recibidas: postulaciones que llegaron a mis publicaciones, agrupadas
 *               por pasantía con CTAs para mover el estado.
 *  - Reseñas: reseñas que recibí en mis pasantías y que aún no respondí.
 */
export default async function PasantiasGestionPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  // Feed (tab "Todas") — mismo data set que la página antigua, ahora vive
  // dentro de una pestaña.
  const pasantias = await prisma.pasantia.findMany({
    where: { isActive: true, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 50,
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
    },
  });

  const feed = pasantias.map((p) => ({
    id: p.id,
    userId: p.userId,
    empresa: p.empresa,
    areaPractica: p.areaPractica,
    titulo: p.titulo,
    descripcion: p.descripcion,
    ciudad: p.ciudad,
    formato: p.formato,
    duracion: p.duracion,
    remuneracion: p.remuneracion,
    montoRemu: p.montoRemu,
    requisitos: p.requisitos,
    metodoPostulacion: p.metodoPostulacion,
    contactoPostulacion: p.contactoPostulacion,
    createdAt: p.createdAt.toISOString(),
    user: p.user,
  }));

  // Enviadas: postulaciones donde soy el postulante.
  const enviadasRaw = await prisma.pasantiaPostulacion.findMany({
    where: { postulanteId: authUser.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      pasantia: {
        select: {
          id: true,
          titulo: true,
          empresa: true,
          areaPractica: true,
          ciudad: true,
          fechaLimite: true,
          estudio: { select: { id: true, slug: true, nombre: true } },
        },
      },
      review: { select: { id: true, rating: true } },
    },
  });

  const enviadas = enviadasRaw.map((p) => ({
    id: p.id,
    estado: p.estado,
    createdAt: p.createdAt.toISOString(),
    fechaInicio: p.fechaInicio?.toISOString() ?? null,
    fechaCompletada: p.fechaCompletada?.toISOString() ?? null,
    mensaje: p.mensaje,
    cvUrl: p.cvUrl,
    cartaUrl: p.cartaUrl,
    pasantia: {
      id: p.pasantia.id,
      titulo: p.pasantia.titulo,
      empresa: p.pasantia.empresa,
      areaPractica: p.pasantia.areaPractica,
      ciudad: p.pasantia.ciudad,
      fechaLimite: p.pasantia.fechaLimite?.toISOString() ?? null,
      estudio: p.pasantia.estudio,
    },
    review: p.review ? { id: p.review.id, rating: p.review.rating } : null,
  }));

  // Recibidas: postulaciones a pasantías que yo publiqué (o donde soy
  // miembro del estudio que publica). Por ahora restringimos al publicador
  // directo; un siguiente paso podría agrupar por estudio.
  const recibidasRaw = await prisma.pasantiaPostulacion.findMany({
    where: { pasantia: { userId: authUser.id } },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: {
      pasantia: {
        select: { id: true, titulo: true, areaPractica: true, ciudad: true },
      },
      postulante: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
          etapaActual: true,
          universityYear: true,
          email: true,
        },
      },
      review: { select: { id: true, rating: true, estudioResponse: true } },
    },
  });

  const recibidas = recibidasRaw.map((p) => ({
    id: p.id,
    estado: p.estado,
    createdAt: p.createdAt.toISOString(),
    fechaInicio: p.fechaInicio?.toISOString() ?? null,
    fechaCompletada: p.fechaCompletada?.toISOString() ?? null,
    mensaje: p.mensaje,
    cvUrl: p.cvUrl,
    cartaUrl: p.cartaUrl,
    pasantia: p.pasantia,
    postulante: p.postulante,
    review: p.review,
  }));

  // Reseñas pendientes: reseñas en pasantías que publiqué, que aún no
  // tienen estudioResponse. Le agrego datos del postulante para poder
  // mostrar autor (si no es anónima) y la pasantía.
  const reviewsRaw = await prisma.pasantiaReview.findMany({
    where: {
      postulacion: { pasantia: { userId: authUser.id } },
      estudioResponse: null,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      postulacion: {
        select: {
          id: true,
          pasantia: {
            select: { id: true, titulo: true, areaPractica: true },
          },
          postulante: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
              universidad: true,
            },
          },
        },
      },
    },
  });

  const reviews = reviewsRaw.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    isAnonymous: r.isAnonymous,
    authorDisplay: r.authorDisplay,
    createdAt: r.createdAt.toISOString(),
    reported: r.reported,
    postulacion: {
      id: r.postulacion.id,
      pasantia: r.postulacion.pasantia,
      postulante: r.postulacion.postulante,
    },
  }));

  return (
    <GestionTabsClient
      userId={authUser.id}
      feed={feed}
      enviadas={enviadas}
      recibidas={recibidas}
      reviews={reviews}
    />
  );
}
