import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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
    include: {
      participants: { select: { userId: true } },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });
  }

  if (room.status !== "lobby") {
    return NextResponse.json(
      { error: "La sala ya no está en lobby" },
      { status: 400 }
    );
  }

  // Verificar que no esté ya dentro
  if (room.participants.some((p) => p.userId === authUser.id)) {
    return NextResponse.json(
      { error: "Ya estás en esta sala" },
      { status: 400 }
    );
  }

  // Verificar cupo
  if (room.participants.length >= room.maxPlayers) {
    return NextResponse.json({ error: "Sala llena" }, { status: 400 });
  }

  await prisma.causaParticipant.create({
    data: { roomId, userId: authUser.id },
  });

  // Retornar participantes actualizados
  const participants = await prisma.causaParticipant.findMany({
    where: { roomId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({
    roomId,
    participants: participants.map((p) => ({
      userId: p.userId,
      name: `${p.user.firstName} ${p.user.lastName}`,
      joinedAt: p.joinedAt.toISOString(),
    })),
  });
}
