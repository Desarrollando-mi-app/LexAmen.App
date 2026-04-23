import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { isDeadlinePassed } from "@/lib/pasantias-helpers";

/**
 * POST /api/sala/pasantias/[id]/postular
 *
 * Crea una postulación interna a una pasantía tipo OFREZCO. Sólo funciona
 * cuando la pasantía tiene `postulacionTipo = "INTERNA"` (o no declarado,
 * en cuyo caso el default es interna). Si es EXTERNA el cliente debe
 * redirigir al `postulacionUrl` en su lugar.
 *
 * Body: { cvUrl?, cartaUrl?, mensaje? }
 * - cvUrl es opcional en el request pero debe existir en el perfil del user
 *   (se valida si cvAvailable o si se sube uno nuevo).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const pasantia = await prisma.pasantia.findFirst({
    where: { id, type: "ofrezco", isActive: true, isHidden: false },
    select: {
      id: true,
      userId: true,
      titulo: true,
      postulacionTipo: true,
      fechaLimite: true,
      estudio: { select: { id: true, nombre: true } },
    },
  });

  if (!pasantia) {
    return NextResponse.json({ error: "Pasantía no encontrada" }, { status: 404 });
  }

  if (pasantia.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes postular a tu propia publicación" },
      { status: 400 },
    );
  }

  if (pasantia.postulacionTipo === "EXTERNA") {
    return NextResponse.json(
      { error: "Esta pasantía recibe postulaciones por canal externo" },
      { status: 400 },
    );
  }

  if (isDeadlinePassed(pasantia.fechaLimite)) {
    return NextResponse.json(
      { error: "Las postulaciones están cerradas" },
      { status: 400 },
    );
  }

  let body: {
    cvUrl?: string;
    cartaUrl?: string;
    mensaje?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // ¿Ya postuló?
  const existing = await prisma.pasantiaPostulacion.findUnique({
    where: {
      pasantiaId_postulanteId: {
        pasantiaId: pasantia.id,
        postulanteId: authUser.id,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Ya postulaste a esta pasantía" },
      { status: 400 },
    );
  }

  const postulacion = await prisma.pasantiaPostulacion.create({
    data: {
      pasantiaId: pasantia.id,
      postulanteId: authUser.id,
      cvUrl: body.cvUrl?.trim() || null,
      cartaUrl: body.cartaUrl?.trim() || null,
      mensaje: body.mensaje?.trim() || null,
      estado: "ENVIADA",
    },
  });

  // Notificar al publicador
  const publisher = pasantia.estudio?.nombre ?? "publicador";
  await sendNotification({
    type: "SYSTEM_INDIVIDUAL",
    title: "Nueva postulación",
    body: `Recibiste una postulación a "${pasantia.titulo}"`,
    targetUserId: pasantia.userId,
    metadata: {
      postulacionId: postulacion.id,
      pasantiaId: pasantia.id,
      estudioNombre: publisher,
    },
  });

  return NextResponse.json(postulacion, { status: 201 });
}
