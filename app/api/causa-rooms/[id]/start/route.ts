import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ROOM_MIN_PLAYERS } from "@/lib/causa-room";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const roomId = params.id;

  const room = await prisma.causaRoom.findUnique({
    where: { id: roomId },
    include: { _count: { select: { participants: true } } },
  });

  if (!room) {
    return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });
  }

  if (room.createdById !== authUser.id) {
    return NextResponse.json(
      { error: "Solo el creador puede iniciar la sala" },
      { status: 403 }
    );
  }

  if (room.status !== "lobby") {
    return NextResponse.json(
      { error: "La sala ya no está en lobby" },
      { status: 400 }
    );
  }

  if (room._count.participants < ROOM_MIN_PLAYERS) {
    return NextResponse.json(
      { error: `Se necesitan al menos ${ROOM_MIN_PLAYERS} participantes` },
      { status: 400 }
    );
  }

  await prisma.causaRoom.update({
    where: { id: roomId },
    data: { status: "active" },
  });

  return NextResponse.json({ status: "active" });
}
