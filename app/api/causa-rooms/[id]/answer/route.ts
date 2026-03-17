import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { calculateCausaScore, ROOM_QUESTIONS, finishRoom } from "@/lib/causa-room";
import { evaluateBadges } from "@/lib/badges";

export async function POST(
  request: Request,
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

  let body: {
    questionIndex: number;
    selectedOption: string;
    timeMs: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { questionIndex, selectedOption, timeMs } = body;

  // Verificar sala activa
  const room = await prisma.causaRoom.findUnique({
    where: { id: roomId },
    select: { status: true },
  });

  if (!room || room.status !== "active") {
    return NextResponse.json(
      { error: "La sala no está activa" },
      { status: 400 }
    );
  }

  // Verificar participante
  const participant = await prisma.causaParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: authUser.id } },
  });

  if (!participant) {
    return NextResponse.json(
      { error: "No eres participante de esta sala" },
      { status: 403 }
    );
  }

  // Obtener la pregunta
  const roomQuestion = await prisma.causaRoomQuestion.findUnique({
    where: { roomId_questionIndex: { roomId, questionIndex } },
    include: { mcq: { select: { id: true, correctOption: true } } },
  });

  if (!roomQuestion) {
    return NextResponse.json(
      { error: "Pregunta no encontrada" },
      { status: 404 }
    );
  }

  // Verificar si ya respondió
  const existing = await prisma.causaRoomAnswer.findUnique({
    where: {
      roomId_userId_questionIndex: { roomId, userId: authUser.id, questionIndex },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya respondiste esta pregunta" },
      { status: 400 }
    );
  }

  // Calcular score
  const isCorrect = selectedOption === roomQuestion.mcq.correctOption;
  const score = calculateCausaScore(isCorrect, timeMs);

  // Guardar respuesta
  await prisma.causaRoomAnswer.create({
    data: {
      roomId,
      userId: authUser.id,
      mcqId: roomQuestion.mcq.id,
      questionIndex,
      selectedOption,
      isCorrect,
      timeMs,
      score,
    },
  });

  // Verificar si TODOS los participantes han respondido TODAS las preguntas
  const totalParticipants = await prisma.causaParticipant.count({
    where: { roomId },
  });

  const totalAnswers = await prisma.causaRoomAnswer.count({
    where: { roomId },
  });

  const expectedTotal = totalParticipants * ROOM_QUESTIONS;
  let roomFinished = false;
  let rankings = null;
  let badgeResults = null;

  if (totalAnswers >= expectedTotal) {
    const result = await finishRoom(roomId);
    roomFinished = true;
    rankings = result.rankings;
    badgeResults = result.badgeResults;
  }

  // Badge evaluation for causas
  evaluateBadges(authUser.id, "causas").catch(() => {});

  return NextResponse.json({
    isCorrect,
    correctOption: roomQuestion.mcq.correctOption,
    score,
    roomFinished,
    ...(rankings && { rankings }),
    ...(badgeResults && { badgeResults }),
  });
}
