import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { REVIEW_CONFIG } from "@/lib/peer-review-config";

// ─── GET /api/diario/peer-review/postular ──────────────────
//
// Devuelve el estado actual de postulación del usuario autenticado:
//  - `isPeerReviewer`: si ya está aprobado y activo en el pool.
//  - `cumpleRequisitos`: si pasa el filtro mínimo (grado + publicaciones)
//    para postular en primer lugar.
//  - `postulacion`: la última postulación enviada (si existe), con su
//    estado y nota de resolución.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      grado: true,
      isPeerReviewer: true,
      peerReviewerSince: true,
      suspended: true,
    },
  });

  if (!me) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Conteo de publicaciones para evaluar requisitos.
  const [analisisCount, ensayoCount] = await Promise.all([
    prisma.analisisSentencia.count({
      where: { userId: me.id, isActive: true },
    }),
    prisma.ensayo.count({
      where: { userId: me.id, isActive: true },
    }),
  ]);
  const totalPublicaciones = analisisCount + ensayoCount;

  const cumpleRequisitos =
    !me.suspended &&
    me.grado >= REVIEW_CONFIG.MIN_GRADO_REVIEWER &&
    totalPublicaciones >= REVIEW_CONFIG.MIN_PUBLICACIONES_REVIEWER;

  const postulacion = await prisma.peerReviewPostulacion.findFirst({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      motivacion: true,
      areasInteres: true,
      publicacionMuestra: true,
      estado: true,
      resolucionNota: true,
      resueltaAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    isPeerReviewer: me.isPeerReviewer,
    peerReviewerSince: me.peerReviewerSince,
    cumpleRequisitos,
    requisitos: {
      minGrado: REVIEW_CONFIG.MIN_GRADO_REVIEWER,
      gradoActual: me.grado,
      minPublicaciones: REVIEW_CONFIG.MIN_PUBLICACIONES_REVIEWER,
      publicacionesActuales: totalPublicaciones,
    },
    postulacion,
  });
}

// ─── POST /api/diario/peer-review/postular ─────────────────
//
// Envía una nueva postulación. El usuario debe:
//   1. No ser ya reviewer activo.
//   2. No tener una postulación pendiente.
//   3. Cumplir requisitos mínimos (grado + publicaciones).
//
// Body: { motivacion: string, areasInteres?: string[], publicacionMuestra?: string }

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const motivacion = typeof body.motivacion === "string" ? body.motivacion.trim() : "";
  const areasInteresInput = body.areasInteres;
  const publicacionMuestra =
    typeof body.publicacionMuestra === "string" && body.publicacionMuestra.trim()
      ? body.publicacionMuestra.trim()
      : null;

  if (motivacion.length < 80) {
    return NextResponse.json(
      { error: "La motivación debe tener al menos 80 caracteres." },
      { status: 400 }
    );
  }

  if (motivacion.length > 2000) {
    return NextResponse.json(
      { error: "La motivación no puede superar 2000 caracteres." },
      { status: 400 }
    );
  }

  // Normalizar áreas de interés a JSON-string.
  let areasInteres: string | null = null;
  if (Array.isArray(areasInteresInput)) {
    const normalizadas = areasInteresInput
      .map((a) => (typeof a === "string" ? a.trim() : ""))
      .filter((a) => a.length > 0)
      .slice(0, 10);
    if (normalizadas.length > 0) {
      areasInteres = JSON.stringify(normalizadas);
    }
  }

  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      grado: true,
      isPeerReviewer: true,
      suspended: true,
    },
  });

  if (!me) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (me.suspended) {
    return NextResponse.json(
      { error: "Cuentas suspendidas no pueden postular." },
      { status: 403 }
    );
  }

  if (me.isPeerReviewer) {
    return NextResponse.json(
      { error: "Ya eres reviewer activo." },
      { status: 400 }
    );
  }

  // Verificar requisitos mínimos.
  const [analisisCount, ensayoCount] = await Promise.all([
    prisma.analisisSentencia.count({
      where: { userId: me.id, isActive: true },
    }),
    prisma.ensayo.count({
      where: { userId: me.id, isActive: true },
    }),
  ]);

  if (me.grado < REVIEW_CONFIG.MIN_GRADO_REVIEWER) {
    return NextResponse.json(
      { error: `Necesitas grado ${REVIEW_CONFIG.MIN_GRADO_REVIEWER} o superior para postular.` },
      { status: 400 }
    );
  }

  if (analisisCount + ensayoCount < REVIEW_CONFIG.MIN_PUBLICACIONES_REVIEWER) {
    return NextResponse.json(
      {
        error: `Necesitas al menos ${REVIEW_CONFIG.MIN_PUBLICACIONES_REVIEWER} publicaciones (análisis o ensayos) para postular.`,
      },
      { status: 400 }
    );
  }

  // No permitir postulaciones duplicadas pendientes.
  const pendiente = await prisma.peerReviewPostulacion.findFirst({
    where: { userId: me.id, estado: "pendiente" },
    select: { id: true },
  });

  if (pendiente) {
    return NextResponse.json(
      { error: "Ya tienes una postulación pendiente de revisión." },
      { status: 400 }
    );
  }

  const postulacion = await prisma.peerReviewPostulacion.create({
    data: {
      userId: me.id,
      motivacion,
      areasInteres,
      publicacionMuestra,
    },
    select: {
      id: true,
      estado: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ postulacion }, { status: 201 });
}
