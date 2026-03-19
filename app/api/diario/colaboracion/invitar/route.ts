import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { publicacionId, publicacionTipo, coAutorId } = body as {
    publicacionId?: string;
    publicacionTipo?: "analisis" | "ensayo";
    coAutorId?: string;
  };

  if (!publicacionId || !publicacionTipo || !coAutorId) {
    return NextResponse.json(
      { error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  if (!["analisis", "ensayo"].includes(publicacionTipo)) {
    return NextResponse.json(
      { error: "Tipo de publicacion invalido." },
      { status: 400 }
    );
  }

  if (coAutorId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes invitarte a ti mismo." },
      { status: 400 }
    );
  }

  // 1. Verify ownership and estadoBorrador
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publicacion: any = null;

  if (publicacionTipo === "analisis") {
    publicacion = await prisma.analisisSentencia.findUnique({
      where: { id: publicacionId },
      select: {
        id: true,
        userId: true,
        titulo: true,
        estadoBorrador: true,
        colaborativo: true,
        coAutores: true,
      },
    });
  } else {
    publicacion = await prisma.ensayo.findUnique({
      where: { id: publicacionId },
      select: {
        id: true,
        userId: true,
        titulo: true,
        estadoBorrador: true,
        colaborativo: true,
        coAutores: true,
      },
    });
  }

  if (!publicacion) {
    return NextResponse.json(
      { error: "Publicacion no encontrada." },
      { status: 404 }
    );
  }

  if (publicacion.userId !== authUser.id) {
    return NextResponse.json(
      { error: "Solo el autor puede invitar co-autores." },
      { status: 403 }
    );
  }

  if (!["borrador", "invitando"].includes(publicacion.estadoBorrador)) {
    return NextResponse.json(
      { error: "Solo se puede invitar en borradores." },
      { status: 400 }
    );
  }

  // 2. Verify mutual colega relationship
  const colegaRelation = await prisma.colegaRequest.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: authUser.id, receiverId: coAutorId },
        { senderId: coAutorId, receiverId: authUser.id },
      ],
    },
  });

  if (!colegaRelation) {
    return NextResponse.json(
      { error: "Solo puedes invitar a tus colegas." },
      { status: 400 }
    );
  }

  // 3. Check max 2 co-autores
  const existingCoAutores: string[] = publicacion.coAutores
    ? JSON.parse(publicacion.coAutores)
    : [];

  const existingInvitations = await prisma.colaboracionInvitacion.count({
    where: {
      publicacionId,
      publicacionTipo,
      estado: { in: ["pendiente", "aceptada"] },
    },
  });

  if (existingInvitations >= 2 || existingCoAutores.length >= 2) {
    return NextResponse.json(
      { error: "Maximo 2 co-autores por publicacion." },
      { status: 400 }
    );
  }

  // 4. Check duplicate invitation
  const alreadyInvited = await prisma.colaboracionInvitacion.findFirst({
    where: {
      publicacionId,
      publicacionTipo,
      invitadoId: coAutorId,
      estado: { in: ["pendiente", "aceptada"] },
    },
  });

  if (alreadyInvited) {
    return NextResponse.json(
      { error: "Ya has invitado a este colega." },
      { status: 400 }
    );
  }

  // 5. Create invitation
  const invitacion = await prisma.colaboracionInvitacion.create({
    data: {
      publicacionId,
      publicacionTipo,
      invitadoPor: authUser.id,
      invitadoId: coAutorId,
      estado: "pendiente",
    },
  });

  // 6. Update publication
  if (publicacionTipo === "analisis") {
    await prisma.analisisSentencia.update({
      where: { id: publicacionId },
      data: { estadoBorrador: "invitando", colaborativo: true },
    });
  } else {
    await prisma.ensayo.update({
      where: { id: publicacionId },
      data: { estadoBorrador: "invitando", colaborativo: true },
    });
  }

  // 7. Notify co-author
  const inviterUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, lastName: true },
  });

  await sendNotification({
    type: "NEW_CONTENT",
    title: "Invitacion a colaborar",
    body: `${inviterUser?.firstName} ${inviterUser?.lastName} te invito a co-autorar "${publicacion.titulo}"`,
    targetUserId: coAutorId,
    metadata: {
      colaboracionInvitacionId: invitacion.id,
      publicacionId,
      publicacionTipo,
    },
  });

  return NextResponse.json({ invitacion });
}
