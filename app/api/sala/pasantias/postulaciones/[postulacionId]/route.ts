import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

const VALID_ESTADOS = new Set([
  "ENVIADA",
  "REVISADA",
  "ACEPTADA",
  "RECHAZADA",
  "COMPLETADA",
]);

/**
 * GET  — cualquiera de las partes (postulante o publicador) puede leer.
 * PATCH — sólo el publicador (o miembro del estudio vinculado) puede cambiar
 *         el estado. Transiciones válidas:
 *           ENVIADA   → REVISADA | ACEPTADA | RECHAZADA
 *           REVISADA  → ACEPTADA | RECHAZADA
 *           ACEPTADA  → COMPLETADA
 *         No se permite volver atrás ni editar una postulación RECHAZADA.
 */
export async function GET(
  _request: Request,
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

  const postulacion = await prisma.pasantiaPostulacion.findUnique({
    where: { id: postulacionId },
    include: {
      pasantia: {
        select: {
          id: true,
          titulo: true,
          userId: true,
          estudioId: true,
          estudio: { select: { id: true, slug: true, nombre: true } },
        },
      },
      postulante: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
          etapaActual: true,
        },
      },
      review: true,
    },
  });

  if (!postulacion) {
    return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  }

  const isPostulante = postulacion.postulanteId === authUser.id;
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

  if (!isPostulante && !isPublisher && !isEstudioMember) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  return NextResponse.json(postulacion);
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

  let body: {
    estado?: string;
    fechaInicio?: string | null;
    fechaCompletada?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const postulacion = await prisma.pasantiaPostulacion.findUnique({
    where: { id: postulacionId },
    include: {
      pasantia: {
        select: { id: true, userId: true, estudioId: true, titulo: true },
      },
      postulante: { select: { id: true, firstName: true } },
    },
  });

  if (!postulacion) {
    return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  }

  // Autorización: publicador o miembro del estudio
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
      { error: "Sólo el publicador puede cambiar el estado" },
      { status: 403 },
    );
  }

  // Validar transición
  if (body.estado && !VALID_ESTADOS.has(body.estado)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  const current = postulacion.estado;
  const next = body.estado;
  if (next) {
    const transitions: Record<string, string[]> = {
      ENVIADA: ["REVISADA", "ACEPTADA", "RECHAZADA"],
      REVISADA: ["ACEPTADA", "RECHAZADA"],
      ACEPTADA: ["COMPLETADA"],
      RECHAZADA: [],
      COMPLETADA: [],
    };
    if (!transitions[current]?.includes(next)) {
      return NextResponse.json(
        { error: `Transición inválida: ${current} → ${next}` },
        { status: 400 },
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (next) updateData.estado = next;
  if (body.fechaInicio !== undefined) {
    updateData.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
  }
  // fechaCompletada se setea automáticamente cuando pasa a COMPLETADA
  if (next === "COMPLETADA") {
    updateData.fechaCompletada = new Date();
  } else if (body.fechaCompletada !== undefined) {
    updateData.fechaCompletada = body.fechaCompletada
      ? new Date(body.fechaCompletada)
      : null;
  }

  const updated = await prisma.pasantiaPostulacion.update({
    where: { id: postulacionId },
    data: updateData,
  });

  // Notificar al postulante sobre el cambio de estado
  if (next && next !== current) {
    const labels: Record<string, string> = {
      REVISADA: "Tu postulación fue revisada",
      ACEPTADA: "¡Tu postulación fue aceptada!",
      RECHAZADA: "Tu postulación no avanzó",
      COMPLETADA: "Tu pasantía fue marcada como completada",
    };
    await sendNotification({
      type: "SYSTEM_INDIVIDUAL",
      title: labels[next] ?? "Estado de postulación actualizado",
      body: `Pasantía: ${postulacion.pasantia.titulo}`,
      targetUserId: postulacion.postulanteId,
      metadata: {
        postulacionId,
        pasantiaId: postulacion.pasantia.id,
        estado: next,
      },
    });
  }

  return NextResponse.json(updated);
}
