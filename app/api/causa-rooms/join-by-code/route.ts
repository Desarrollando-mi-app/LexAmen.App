import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { code: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const code = body.code?.trim().toLowerCase();
  if (!code || code.length < 4) {
    return NextResponse.json(
      { error: "Código inválido" },
      { status: 400 }
    );
  }

  // Buscar sala en lobby cuyo id termina con el código
  const rooms = await prisma.causaRoom.findMany({
    where: { status: "lobby" },
    select: { id: true, maxPlayers: true, _count: { select: { participants: true } } },
  });

  const matchingRoom = rooms.find((r) =>
    r.id.toLowerCase().endsWith(code)
  );

  if (!matchingRoom) {
    return NextResponse.json(
      { error: "No se encontró sala con ese código" },
      { status: 404 }
    );
  }

  // Verificar cupo
  if (matchingRoom._count.participants >= matchingRoom.maxPlayers) {
    return NextResponse.json({ error: "Sala llena" }, { status: 400 });
  }

  // Verificar que no esté ya dentro
  const existing = await prisma.causaParticipant.findUnique({
    where: { roomId_userId: { roomId: matchingRoom.id, userId: authUser.id } },
  });

  if (!existing) {
    await prisma.causaParticipant.create({
      data: { roomId: matchingRoom.id, userId: authUser.id },
    });
  }

  return NextResponse.json({ roomId: matchingRoom.id });
}
