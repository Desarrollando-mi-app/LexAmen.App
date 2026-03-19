import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Mis Reviews Pendientes ─────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const pendingReviews = await prisma.peerReview.findMany({
    where: {
      reviewerId: authUser.id,
      estado: "pendiente",
    },
    orderBy: { createdAt: "desc" },
    include: {
      reviewer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Enrich with publication info and author info
  const enriched = await Promise.all(
    pendingReviews.map(async (review) => {
      let publicacion: {
        titulo: string;
        materia: string;
        tipo?: string;
      } | null = null;

      if (review.publicacionTipo === "analisis") {
        const a = await prisma.analisisSentencia.findUnique({
          where: { id: review.publicacionId },
          select: { titulo: true, materia: true },
        });
        if (a) publicacion = a;
      } else {
        const e = await prisma.ensayo.findUnique({
          where: { id: review.publicacionId },
          select: { titulo: true, materia: true, tipo: true },
        });
        if (e) publicacion = e;
      }

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

      // Calculate deadline
      const deadline = new Date(review.createdAt);
      deadline.setDate(deadline.getDate() + 5); // PLAZO_REVIEW_DIAS

      return {
        id: review.id,
        publicacionId: review.publicacionId,
        publicacionTipo: review.publicacionTipo,
        estado: review.estado,
        createdAt: review.createdAt.toISOString(),
        deadline: deadline.toISOString(),
        publicacion,
        autor,
      };
    })
  );

  return NextResponse.json({ reviews: enriched });
}
