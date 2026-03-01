import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { roomIdToCode } from "@/lib/causa-room";

export async function GET(
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
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      participants: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { joinedAt: "asc" },
      },
      questions: {
        include: {
          mcq: {
            select: {
              id: true,
              question: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              correctOption: true,
              explanation: true,
            },
          },
        },
        orderBy: { questionIndex: "asc" },
      },
      answers: true,
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });
  }

  // Verificar participante
  const isParticipant = room.participants.some(
    (p) => p.user.id === authUser.id
  );
  if (!isParticipant) {
    return NextResponse.json(
      { error: "No eres participante de esta sala" },
      { status: 403 }
    );
  }

  const base = {
    id: room.id,
    code: roomIdToCode(room.id),
    mode: room.mode,
    status: room.status,
    maxPlayers: room.maxPlayers,
    materia: room.materia,
    difficulty: room.difficulty,
    timeLimitSeconds: room.timeLimitSeconds,
    createdAt: room.createdAt.toISOString(),
    createdBy: {
      id: room.createdBy.id,
      name: `${room.createdBy.firstName} ${room.createdBy.lastName}`,
    },
    participants: room.participants.map((p) => ({
      userId: p.user.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      score: p.score,
      position: p.position,
      joinedAt: p.joinedAt.toISOString(),
    })),
  };

  // LOBBY: solo info básica
  if (room.status === "lobby") {
    return NextResponse.json(base);
  }

  // ACTIVE: preguntas + mis respuestas + progreso de otros
  if (room.status === "active") {
    const myAnswers = room.answers
      .filter((a) => a.userId === authUser.id)
      .map((a) => ({
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        score: a.score,
        timeMs: a.timeMs,
      }));

    // Progreso de otros: solo cuántas respondieron (no sus respuestas)
    const othersProgress: Record<string, number> = {};
    for (const p of room.participants) {
      if (p.user.id !== authUser.id) {
        othersProgress[p.user.id] = room.answers.filter(
          (a) => a.userId === p.user.id
        ).length;
      }
    }

    // Calcular mi score total actual
    const myTotalScore = myAnswers.reduce((sum, a) => sum + a.score, 0);

    // Scores parciales de otros (total de lo respondido)
    const participantScores = room.participants.map((p) => {
      const pAnswers = room.answers.filter((a) => a.userId === p.user.id);
      return {
        userId: p.user.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        score: pAnswers.reduce((sum, a) => sum + a.score, 0),
        answeredCount: pAnswers.length,
      };
    });

    return NextResponse.json({
      ...base,
      questions: room.questions.map((q) => ({
        questionIndex: q.questionIndex,
        mcq: {
          id: q.mcq.id,
          question: q.mcq.question,
          optionA: q.mcq.optionA,
          optionB: q.mcq.optionB,
          optionC: q.mcq.optionC,
          optionD: q.mcq.optionD,
          // No revelar correctOption — el answer route lo devuelve
        },
      })),
      myAnswers,
      myTotalScore,
      participantScores,
      othersProgress,
    });
  }

  // FINISHED: todo visible
  if (room.status === "finished") {
    // Obtener badges ganados por participantes
    const userIds = room.participants.map((p) => p.user.id);
    const badges = await prisma.userBadge.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, badge: true },
    });

    const badgesByUser: Record<string, string[]> = {};
    for (const b of badges) {
      if (!badgesByUser[b.userId]) badgesByUser[b.userId] = [];
      badgesByUser[b.userId].push(b.badge);
    }

    return NextResponse.json({
      ...base,
      questions: room.questions.map((q) => ({
        questionIndex: q.questionIndex,
        mcq: {
          id: q.mcq.id,
          question: q.mcq.question,
          optionA: q.mcq.optionA,
          optionB: q.mcq.optionB,
          optionC: q.mcq.optionC,
          optionD: q.mcq.optionD,
          correctOption: q.mcq.correctOption,
          explanation: q.mcq.explanation,
        },
      })),
      allAnswers: room.answers.map((a) => ({
        userId: a.userId,
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        score: a.score,
        timeMs: a.timeMs,
      })),
      badgesByUser,
    });
  }

  return NextResponse.json(base);
}
