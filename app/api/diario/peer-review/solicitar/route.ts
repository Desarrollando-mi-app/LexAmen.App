import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { REVIEW_CONFIG } from "@/lib/peer-review-config";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Solicitar Peer Review ─────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { publicacionId, publicacionTipo, reviewerIds } = body as {
    publicacionId: string;
    publicacionTipo: "analisis" | "ensayo";
    reviewerIds?: string[];
  };

  // ─── Validar tipo ──────────────────────────────────────────

  if (!publicacionId || !publicacionTipo) {
    return NextResponse.json(
      { error: "publicacionId y publicacionTipo son requeridos" },
      { status: 400 }
    );
  }

  if (publicacionTipo !== "analisis" && publicacionTipo !== "ensayo") {
    return NextResponse.json(
      { error: "publicacionTipo debe ser 'analisis' o 'ensayo'" },
      { status: 400 }
    );
  }

  // ─── Validar que el autor es dueno de la publicacion ───────

  let publicacion: { id: string; userId: string; estadoBorrador: string; estadoReview: string | null; materia: string; titulo: string } | null = null;

  if (publicacionTipo === "analisis") {
    const a = await prisma.analisisSentencia.findUnique({
      where: { id: publicacionId },
      select: { id: true, userId: true, estadoBorrador: true, estadoReview: true, materia: true, titulo: true },
    });
    if (a) publicacion = a;
  } else {
    const e = await prisma.ensayo.findUnique({
      where: { id: publicacionId },
      select: { id: true, userId: true, estadoBorrador: true, estadoReview: true, materia: true, titulo: true },
    });
    if (e) publicacion = e;
  }

  if (!publicacion) {
    return NextResponse.json(
      { error: "Publicacion no encontrada" },
      { status: 404 }
    );
  }

  if (publicacion.userId !== authUser.id) {
    return NextResponse.json(
      { error: "Solo el autor puede solicitar peer review" },
      { status: 403 }
    );
  }

  // ─── Validar estado de la publicacion ──────────────────────

  const estadosValidos = ["borrador", "invitando", "editando", "publicado"];
  if (!estadosValidos.includes(publicacion.estadoBorrador)) {
    return NextResponse.json(
      { error: "La publicacion no esta en un estado valido para solicitar review" },
      { status: 400 }
    );
  }

  if (publicacion.estadoReview === "solicitado" || publicacion.estadoReview === "en_revision") {
    return NextResponse.json(
      { error: "Ya hay una solicitud de peer review activa para esta publicacion" },
      { status: 400 }
    );
  }

  // ─── Resolver reviewers ────────────────────────────────────

  let selectedReviewerIds: string[] = [];

  if (reviewerIds && reviewerIds.length > 0) {
    // Validar que los reviewers cumplen criterios
    const candidates = await prisma.user.findMany({
      where: {
        id: { in: reviewerIds },
        grado: { gte: REVIEW_CONFIG.MIN_GRADO_REVIEWER },
        suspended: false,
        deletedAt: null,
      },
      select: { id: true },
    });

    // Verificar que tienen >= MIN_PUBLICACIONES_REVIEWER publicaciones
    for (const candidate of candidates) {
      const [analisisCount, ensayoCount] = await Promise.all([
        prisma.analisisSentencia.count({
          where: { userId: candidate.id, isActive: true },
        }),
        prisma.ensayo.count({
          where: { userId: candidate.id, isActive: true },
        }),
      ]);

      if (analisisCount + ensayoCount >= REVIEW_CONFIG.MIN_PUBLICACIONES_REVIEWER) {
        selectedReviewerIds.push(candidate.id);
      }
    }

    // Excluir al autor
    selectedReviewerIds = selectedReviewerIds.filter((id) => id !== authUser.id);

    if (selectedReviewerIds.length === 0) {
      return NextResponse.json(
        { error: "Ninguno de los reviewers seleccionados cumple los requisitos (grado >= 8, >= 2 publicaciones)" },
        { status: 400 }
      );
    }
  } else {
    // Auto-asignar reviewers
    // 1. Buscar usuarios elegibles: grado >= 8, no suspendidos, no el autor
    const eligibleUsers = await prisma.user.findMany({
      where: {
        grado: { gte: REVIEW_CONFIG.MIN_GRADO_REVIEWER },
        suspended: false,
        deletedAt: null,
        id: { not: authUser.id },
      },
      select: { id: true, grado: true },
    });

    // 2. Filtrar por minimo de publicaciones
    const qualifiedUsers: { id: string; grado: number; sameMateria: boolean }[] = [];

    for (const u of eligibleUsers) {
      const [analisisCount, ensayoCount] = await Promise.all([
        prisma.analisisSentencia.count({
          where: { userId: u.id, isActive: true },
        }),
        prisma.ensayo.count({
          where: { userId: u.id, isActive: true },
        }),
      ]);

      if (analisisCount + ensayoCount >= REVIEW_CONFIG.MIN_PUBLICACIONES_REVIEWER) {
        // Check if they have publications in the same materia
        const sameMateria = await prisma.analisisSentencia.count({
          where: { userId: u.id, materia: publicacion!.materia, isActive: true },
        });

        qualifiedUsers.push({
          id: u.id,
          grado: u.grado,
          sameMateria: sameMateria > 0,
        });
      }
    }

    if (qualifiedUsers.length === 0) {
      return NextResponse.json(
        { error: "No hay reviewers disponibles que cumplan los requisitos" },
        { status: 400 }
      );
    }

    // 3. Ordenar: preferir misma materia, luego por grado
    qualifiedUsers.sort((a, b) => {
      if (a.sameMateria && !b.sameMateria) return -1;
      if (!a.sameMateria && b.sameMateria) return 1;
      return b.grado - a.grado;
    });

    // 4. Seleccionar los primeros N
    selectedReviewerIds = qualifiedUsers
      .slice(0, REVIEW_CONFIG.REVIEWERS_POR_PUBLICACION)
      .map((u) => u.id);
  }

  // ─── Crear PeerReview records ──────────────────────────────

  const reviews = await Promise.all(
    selectedReviewerIds.map((reviewerId) =>
      prisma.peerReview.create({
        data: {
          publicacionId,
          publicacionTipo,
          autorId: authUser.id,
          reviewerId,
          estado: "pendiente",
        },
      })
    )
  );

  // ─── Actualizar estadoReview de la publicacion ─────────────

  if (publicacionTipo === "analisis") {
    await prisma.analisisSentencia.update({
      where: { id: publicacionId },
      data: { estadoReview: "solicitado" },
    });
  } else {
    await prisma.ensayo.update({
      where: { id: publicacionId },
      data: { estadoReview: "solicitado" },
    });
  }

  // ─── Notificar a reviewers ─────────────────────────────────

  const autor = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, lastName: true },
  });

  for (const reviewerId of selectedReviewerIds) {
    sendNotification({
      type: "SYSTEM_INDIVIDUAL",
      title: "Solicitud de Peer Review",
      body: `${autor?.firstName} ${autor?.lastName} te ha solicitado revisar su ${publicacionTipo === "analisis" ? "analisis" : "ensayo"}: "${publicacion.titulo}"`,
      targetUserId: reviewerId,
      metadata: {
        peerReviewId: reviews.find((r) => r.reviewerId === reviewerId)?.id,
        publicacionId,
        publicacionTipo,
      },
    }).catch(() => {});
  }

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      reviewerId: r.reviewerId,
      estado: r.estado,
    })),
    message: `Peer review solicitado a ${selectedReviewerIds.length} revisor(es)`,
  }, { status: 201 });
}
