import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Find invitation
  const invitacion = await prisma.colaboracionInvitacion.findUnique({
    where: { id },
  });

  if (!invitacion) {
    return NextResponse.json(
      { error: "Invitacion no encontrada." },
      { status: 404 }
    );
  }

  if (invitacion.invitadoId !== authUser.id) {
    return NextResponse.json(
      { error: "Esta invitacion no te pertenece." },
      { status: 403 }
    );
  }

  if (invitacion.estado !== "pendiente") {
    return NextResponse.json(
      { error: "Esta invitacion ya fue procesada." },
      { status: 400 }
    );
  }

  // Update invitation
  await prisma.colaboracionInvitacion.update({
    where: { id },
    data: { estado: "aceptada" },
  });

  // Add user to coAutores on the publication
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publicacion: any = null;

  if (invitacion.publicacionTipo === "analisis") {
    publicacion = await prisma.analisisSentencia.findUnique({
      where: { id: invitacion.publicacionId },
      select: { coAutores: true, titulo: true },
    });
  } else {
    publicacion = await prisma.ensayo.findUnique({
      where: { id: invitacion.publicacionId },
      select: { coAutores: true, titulo: true },
    });
  }

  if (!publicacion) {
    return NextResponse.json(
      { error: "Publicacion no encontrada." },
      { status: 404 }
    );
  }

  const currentCoAutores: string[] = publicacion.coAutores
    ? JSON.parse(publicacion.coAutores)
    : [];

  if (!currentCoAutores.includes(authUser.id)) {
    currentCoAutores.push(authUser.id);
  }

  const updateData = {
    coAutores: JSON.stringify(currentCoAutores),
    estadoBorrador: "editando",
  };

  if (invitacion.publicacionTipo === "analisis") {
    await prisma.analisisSentencia.update({
      where: { id: invitacion.publicacionId },
      data: updateData,
    });
  } else {
    await prisma.ensayo.update({
      where: { id: invitacion.publicacionId },
      data: updateData,
    });
  }

  // Notify inviter
  const acceptingUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, lastName: true },
  });

  await sendNotification({
    type: "NEW_CONTENT",
    title: "Co-autor aceptado",
    body: `${acceptingUser?.firstName} ${acceptingUser?.lastName} acepto colaborar en "${publicacion.titulo}"`,
    targetUserId: invitacion.invitadoPor,
    metadata: {
      colaboracionInvitacionId: id,
      publicacionId: invitacion.publicacionId,
      publicacionTipo: invitacion.publicacionTipo,
    },
  });

  return NextResponse.json({ ok: true });
}
