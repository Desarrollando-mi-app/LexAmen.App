import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const colegaRequest = await prisma.colegaRequest.findUnique({
    where: { id: params.requestId },
  });

  if (!colegaRequest) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  // Puede cancelar: el sender (si PENDING) o cualquier parte (si ACCEPTED, para eliminar colega)
  const isSender = colegaRequest.senderId === authUser.id;
  const isReceiver = colegaRequest.receiverId === authUser.id;

  if (!isSender && !isReceiver) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (colegaRequest.status === "PENDING" && !isSender) {
    return NextResponse.json(
      { error: "Solo quien envió puede cancelar una solicitud pendiente" },
      { status: 403 }
    );
  }

  await prisma.colegaRequest.delete({
    where: { id: params.requestId },
  });

  return NextResponse.json({ success: true });
}
