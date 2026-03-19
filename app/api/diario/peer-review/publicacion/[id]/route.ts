import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Reviews de una publicacion ─────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: publicacionId } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Fetch all reviews for this publication
  const reviews = await prisma.peerReview.findMany({
    where: { publicacionId },
    orderBy: { createdAt: "asc" },
    include: {
      reviewer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
          grado: true,
        },
      },
    },
  });

  if (reviews.length === 0) {
    return NextResponse.json({ reviews: [], promedio: null });
  }

  // Verify access: only author or reviewers can see
  const isAuthor = reviews[0].autorId === authUser.id;
  const isReviewer = reviews.some((r) => r.reviewerId === authUser.id);

  if (!isAuthor && !isReviewer) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Compute averages from completed reviews
  const completedReviews = reviews.filter((r) => r.estado === "completado");
  let promedio: {
    claridad: number;
    rigor: number;
    originalidad: number;
    general: number;
    totalReviewers: number;
  } | null = null;

  if (completedReviews.length > 0) {
    const sumClaridad = completedReviews.reduce((s, r) => s + (r.claridadScore ?? 0), 0);
    const sumRigor = completedReviews.reduce((s, r) => s + (r.rigorScore ?? 0), 0);
    const sumOriginalidad = completedReviews.reduce((s, r) => s + (r.originalidadScore ?? 0), 0);
    const n = completedReviews.length;

    const avgClaridad = sumClaridad / n;
    const avgRigor = sumRigor / n;
    const avgOriginalidad = sumOriginalidad / n;

    promedio = {
      claridad: Math.round(avgClaridad * 10) / 10,
      rigor: Math.round(avgRigor * 10) / 10,
      originalidad: Math.round(avgOriginalidad * 10) / 10,
      general: Math.round(((avgClaridad + avgRigor + avgOriginalidad) / 3) * 10) / 10,
      totalReviewers: n,
    };
  }

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      reviewerId: r.reviewerId,
      estado: r.estado,
      claridadScore: r.claridadScore,
      rigorScore: r.rigorScore,
      originalidadScore: r.originalidadScore,
      comentarioGeneral: r.comentarioGeneral,
      sugerencias: r.sugerencias,
      createdAt: r.createdAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      reviewer: r.reviewer,
    })),
    promedio,
  });
}
