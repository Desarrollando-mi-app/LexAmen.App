import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

/**
 * Reseñas balanceadas de pasantías.
 *
 * POST  — Sólo el postulante, una vez que la postulación está COMPLETADA,
 *         puede crear la reseña (rating 1-5 + comentario opcional + anonimato
 *         opcional con authorDisplay personalizable).
 * PATCH — Sólo el publicador (o miembro del estudio vinculado) puede agregar
 *         UNA respuesta pública. Una vez respondida, no puede editarse ni
 *         borrarse. Para reportar ver el endpoint /reviews/[id]/reportar.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ postulacionId: string }> },
) {
  const { postulacionId } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    rating: number;
    comment?: string;
    isAnonymous?: boolean;
    authorDisplay?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const rating = Math.round(Number(body.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating debe ser entre 1 y 5" },
      { status: 400 },
    );
  }

  const postulacion = await prisma.pasantiaPostulacion.findUnique({
    where: { id: postulacionId },
    include: {
      pasantia: {
        select: { id: true, userId: true, titulo: true, estudioId: true },
      },
      postulante: {
        select: { firstName: true, lastName: true, etapaActual: true, universidad: true },
      },
      review: { select: { id: true } },
    },
  });

  if (!postulacion) {
    return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  }

  if (postulacion.postulanteId !== authUser.id) {
    return NextResponse.json(
      { error: "Sólo quien fue pasante puede reseñar" },
      { status: 403 },
    );
  }

  if (postulacion.estado !== "COMPLETADA") {
    return NextResponse.json(
      { error: "Sólo se pueden reseñar postulaciones COMPLETADAS" },
      { status: 400 },
    );
  }

  if (postulacion.review) {
    return NextResponse.json(
      { error: "Ya dejaste una reseña para esta pasantía" },
      { status: 400 },
    );
  }

  // authorDisplay: si no viene, derivamos uno decente por defecto.
  const defaultDisplay = [
    postulacion.postulante.etapaActual
      ? postulacion.postulante.etapaActual.charAt(0).toUpperCase() +
        postulacion.postulante.etapaActual.slice(1)
      : "Pasante",
    postulacion.postulante.universidad,
    new Date().getFullYear(),
  ]
    .filter(Boolean)
    .join(" · ");

  const review = await prisma.pasantiaReview.create({
    data: {
      postulacionId,
      authorId: authUser.id,
      authorDisplay: (body.authorDisplay?.trim() || defaultDisplay).slice(0, 120),
      isAnonymous: body.isAnonymous === true,
      rating,
      comment: body.comment?.trim() || null,
    },
  });

  // Notificar al publicador
  await sendNotification({
    type: "SYSTEM_INDIVIDUAL",
    title: "Nueva reseña de pasantía",
    body: `Dejaron una reseña de ${"★".repeat(rating)}${"☆".repeat(5 - rating)} sobre "${postulacion.pasantia.titulo}"`,
    targetUserId: postulacion.pasantia.userId,
    metadata: {
      reviewId: review.id,
      postulacionId,
      pasantiaId: postulacion.pasantia.id,
      rating,
    },
  });

  return NextResponse.json(review, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postulacionId: string }> },
) {
  const { postulacionId } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { estudioResponse?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const text = body.estudioResponse?.trim();
  if (!text) {
    return NextResponse.json(
      { error: "La respuesta no puede estar vacía" },
      { status: 400 },
    );
  }
  if (text.length > 1500) {
    return NextResponse.json(
      { error: "La respuesta supera los 1500 caracteres" },
      { status: 400 },
    );
  }

  const postulacion = await prisma.pasantiaPostulacion.findUnique({
    where: { id: postulacionId },
    include: {
      pasantia: { select: { userId: true, estudioId: true } },
      review: { select: { id: true, estudioResponse: true, authorId: true } },
    },
  });

  if (!postulacion || !postulacion.review) {
    return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });
  }

  const isPublisher = postulacion.pasantia.userId === authUser.id;
  const isEstudioMember = postulacion.pasantia.estudioId
    ? !!(await prisma.estudioMember.findUnique({
        where: {
          estudioId_userId: {
            estudioId: postulacion.pasantia.estudioId,
            userId: authUser.id,
          },
        },
      }))
    : false;

  if (!isPublisher && !isEstudioMember) {
    return NextResponse.json(
      { error: "Sólo el publicador puede responder" },
      { status: 403 },
    );
  }

  if (postulacion.review.estudioResponse) {
    return NextResponse.json(
      { error: "Ya existe una respuesta y no puede modificarse" },
      { status: 400 },
    );
  }

  const updated = await prisma.pasantiaReview.update({
    where: { id: postulacion.review.id },
    data: {
      estudioResponse: text,
      estudioRespondedAt: new Date(),
    },
  });

  // Notificar al autor de la reseña
  await sendNotification({
    type: "SYSTEM_INDIVIDUAL",
    title: "Respuesta a tu reseña",
    body: "El estudio respondió públicamente a tu reseña.",
    targetUserId: postulacion.review.authorId,
    metadata: { reviewId: postulacion.review.id, postulacionId },
  });

  return NextResponse.json(updated);
}
