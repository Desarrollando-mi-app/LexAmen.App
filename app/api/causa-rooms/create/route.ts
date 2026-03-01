import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  selectRandomMCQs,
  roomIdToCode,
  ROOM_QUESTIONS,
  ROOM_MAX_PLAYERS_DEFAULT,
} from "@/lib/causa-room";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    mode?: string;
    materia?: string;
    difficulty?: string;
    maxPlayers?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const mode = body.mode || "individual";
  const materia = body.materia || null;
  const difficulty = body.difficulty || null;
  const maxPlayers = Math.min(Math.max(body.maxPlayers ?? ROOM_MAX_PLAYERS_DEFAULT, 2), 10);

  // Seleccionar MCQs al azar
  let mcqIds: string[];
  try {
    mcqIds = await selectRandomMCQs(ROOM_QUESTIONS, materia, difficulty);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error seleccionando MCQs" },
      { status: 400 }
    );
  }

  // Crear sala con preguntas y creador como primer participante
  const room = await prisma.causaRoom.create({
    data: {
      mode,
      maxPlayers,
      materia,
      difficulty,
      createdById: authUser.id,
      questions: {
        create: mcqIds.map((mcqId, idx) => ({
          mcqId,
          questionIndex: idx,
        })),
      },
      participants: {
        create: {
          userId: authUser.id,
        },
      },
    },
  });

  return NextResponse.json({
    roomId: room.id,
    code: roomIdToCode(room.id),
  });
}
