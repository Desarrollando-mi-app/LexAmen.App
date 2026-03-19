import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { REVIEW_CONFIG } from "@/lib/peer-review-config";
import { sendNotification } from "@/lib/notifications";

// ─── GET: Detalle de un Review ───────────────────────────────

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

  const review = await prisma.peerReview.findUnique({
    where: { id },
    include: {
      reviewer: {
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

  if (!review) {
    return NextResponse.json({ error: "Review no encontrado" }, { status: 404 });
  }

  // Solo el reviewer o el autor pueden ver el review
  if (review.reviewerId !== authUser.id && review.autorId !== authUser.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Fetch publication info
  let publicacion: {
    id: string;
    titulo: string;
    materia: string;
    hechos?: string;
    ratioDecidendi?: string;
    opinion?: string;
    resumen?: string;
    tribunal?: string;
    numeroRol?: string;
    partes?: string;
    archivoUrl?: string;
    archivoNombre?: string;
    tipo?: string;
  } | null = null;

  if (review.publicacionTipo === "analisis") {
    const a = await prisma.analisisSentencia.findUnique({
      where: { id: review.publicacionId },
      select: {
        id: true,
        titulo: true,
        materia: true,
        hechos: true,
        ratioDecidendi: true,
        opinion: true,
        resumen: true,
        tribunal: true,
        numeroRol: true,
        partes: true,
      },
    });
    if (a) publicacion = a;
  } else {
    const e = await prisma.ensayo.findUnique({
      where: { id: review.publicacionId },
      select: {
        id: true,
        titulo: true,
        materia: true,
        resumen: true,
        archivoUrl: true,
        archivoNombre: true,
        tipo: true,
      },
    });
    if (e) publicacion = { ...e, resumen: e.resumen ?? undefined };
  }

  // Fetch author info
  const autor = await prisma.user.findUnique({
    where: { id: review.autorId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      universidad: true,
    },
  });

  return NextResponse.json({
    review: {
      id: review.id,
      publicacionId: review.publicacionId,
      publicacionTipo: review.publicacionTipo,
      autorId: review.autorId,
      reviewerId: review.reviewerId,
      estado: review.estado,
      claridadScore: review.claridadScore,
      rigorScore: review.rigorScore,
      originalidadScore: review.originalidadScore,
      comentarioGeneral: review.comentarioGeneral,
      sugerencias: review.sugerencias,
      createdAt: review.createdAt.toISOString(),
      completedAt: review.completedAt?.toISOString() ?? null,
      reviewer: review.reviewer,
      autor,
      publicacion,
    },
  });
}

// ─── PATCH: Completar Review ─────────────────────────────────

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

  const review = await prisma.peerReview.findUnique({
    where: { id },
  });

  if (!review) {
    return NextResponse.json({ error: "Review no encontrado" }, { status: 404 });
  }

  if (review.reviewerId !== authUser.id) {
    return NextResponse.json(
      { error: "Solo el reviewer asignado puede completar este review" },
      { status: 403 }
    );
  }

  if (review.estado === "completado") {
    return NextResponse.json(
      { error: "Este review ya fue completado" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { claridadScore, rigorScore, originalidadScore, comentarioGeneral, sugerencias } = body as {
    claridadScore: number;
    rigorScore: number;
    originalidadScore: number;
    comentarioGeneral: string;
    sugerencias?: string;
  };

  // ─── Validaciones ──────────────────────────────────────────

  const validateScore = (score: number, name: string) => {
    if (typeof score !== "number" || score < 1 || score > 5 || !Number.isInteger(score)) {
      return `${name} debe ser un entero entre 1 y 5`;
    }
    return null;
  };

  const errors: string[] = [];
  const e1 = validateScore(claridadScore, "claridadScore");
  if (e1) errors.push(e1);
  const e2 = validateScore(rigorScore, "rigorScore");
  if (e2) errors.push(e2);
  const e3 = validateScore(originalidadScore, "originalidadScore");
  if (e3) errors.push(e3);

  if (!comentarioGeneral || !comentarioGeneral.trim()) {
    errors.push("El comentario general es requerido");
  }
  if (comentarioGeneral && comentarioGeneral.length > 1000) {
    errors.push("El comentario general no puede exceder 1000 caracteres");
  }
  if (sugerencias && sugerencias.length > 1000) {
    errors.push("Las sugerencias no pueden exceder 1000 caracteres");
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(". ") }, { status: 400 });
  }

  // ─── Actualizar review ────────────────────────────────────

  const updatedReview = await prisma.peerReview.update({
    where: { id },
    data: {
      claridadScore,
      rigorScore,
      originalidadScore,
      comentarioGeneral: comentarioGeneral.trim(),
      sugerencias: sugerencias?.trim() || null,
      estado: "completado",
      completedAt: new Date(),
    },
  });

  // ─── Award XP al reviewer ─────────────────────────────────

  const { awardXp } = await import("@/lib/xp-config");
  await awardXp({
    userId: authUser.id,
    amount: REVIEW_CONFIG.XP_POR_REVIEW,
    category: "publicaciones",
    detalle: "Peer Review completado",
    prisma,
  });

  // Badge evaluation
  const { evaluateBadges } = await import("@/lib/badges");
  evaluateBadges(authUser.id, "diario").catch(() => {});

  // ─── Verificar si todos los reviews estan completados ──────

  const allReviews = await prisma.peerReview.findMany({
    where: { publicacionId: review.publicacionId },
  });

  const allCompleted = allReviews.every((r) => r.estado === "completado");

  if (allCompleted) {
    if (review.publicacionTipo === "analisis") {
      await prisma.analisisSentencia.update({
        where: { id: review.publicacionId },
        data: { estadoReview: "revisado" },
      });
    } else {
      await prisma.ensayo.update({
        where: { id: review.publicacionId },
        data: { estadoReview: "revisado" },
      });
    }

    // Notificar al autor que la revision esta completa
    const reviewerUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true },
    });

    sendNotification({
      type: "SYSTEM_INDIVIDUAL",
      title: "Peer Review completado",
      body: `${reviewerUser?.firstName ?? "Un revisor"} completó la revisión de tu publicación.`,
      targetUserId: review.autorId,
      metadata: {
        publicacionId: review.publicacionId,
        publicacionTipo: review.publicacionTipo,
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    review: {
      id: updatedReview.id,
      estado: updatedReview.estado,
      claridadScore: updatedReview.claridadScore,
      rigorScore: updatedReview.rigorScore,
      originalidadScore: updatedReview.originalidadScore,
      completedAt: updatedReview.completedAt?.toISOString(),
    },
    allCompleted,
    xpGanado: REVIEW_CONFIG.XP_POR_REVIEW,
  });
}
