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

  await prisma.colaboracionInvitacion.update({
    where: { id },
    data: { estado: "rechazada" },
  });

  // Notify inviter
  const rejectingUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, lastName: true },
  });

  // Get publication title for notification
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let publicacion: any = null;
  if (invitacion.publicacionTipo === "analisis") {
    publicacion = await prisma.analisisSentencia.findUnique({
      where: { id: invitacion.publicacionId },
      select: { titulo: true },
    });
  } else {
    publicacion = await prisma.ensayo.findUnique({
      where: { id: invitacion.publicacionId },
      select: { titulo: true },
    });
  }

  await sendNotification({
    type: "NEW_CONTENT",
    title: "Invitacion rechazada",
    body: `${rejectingUser?.firstName} ${rejectingUser?.lastName} rechazo la invitacion a colaborar en "${publicacion?.titulo ?? "publicacion"}"`,
    targetUserId: invitacion.invitadoPor,
    metadata: {
      colaboracionInvitacionId: id,
      publicacionId: invitacion.publicacionId,
      publicacionTipo: invitacion.publicacionTipo,
    },
  });

  return NextResponse.json({ ok: true });
}
