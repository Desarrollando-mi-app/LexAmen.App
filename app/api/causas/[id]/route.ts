import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Fetch causa completa
  const causa = await prisma.causa.findUnique({
    where: { id },
    include: {
      challenger: {
        select: { id: true, firstName: true, lastName: true },
      },
      challenged: {
        select: { id: true, firstName: true, lastName: true },
      },
      winner: {
        select: { id: true, firstName: true, lastName: true },
      },
      answers: {
        orderBy: { questionIdx: "asc" },
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
            },
          },
        },
      },
    },
  });

  if (!causa) {
    return NextResponse.json(
      { error: "Causa no encontrada" },
      { status: 404 }
    );
  }

  // Verificar que el usuario es participante
  const isParticipant =
    causa.challengerId === authUser.id ||
    causa.challengedId === authUser.id;

  if (!isParticipant) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // 3. Construir respuesta según estado
  const myAnswers = causa.answers.filter((a) => a.userId === authUser.id);
  const opponentAnswers = causa.answers.filter(
    (a) => a.userId !== authUser.id
  );

  const opponentId =
    causa.challengerId === authUser.id
      ? causa.challengedId
      : causa.challengerId;
  const opponent =
    causa.challengerId === authUser.id ? causa.challenged : causa.challenger;

  // Si ACTIVE: solo mostrar mis respuestas + preguntas sin responder
  if (causa.status === "ACTIVE") {
    return NextResponse.json({
      id: causa.id,
      status: causa.status,
      opponent: {
        id: opponentId,
        name: `${opponent.firstName} ${opponent.lastName}`,
      },
      startedAt: causa.startedAt?.toISOString(),
      myAnswers: myAnswers.map((a) => ({
        questionIdx: a.questionIdx,
        mcq: a.mcq,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        timeMs: a.timeMs,
        score: a.score,
      })),
      myScore: myAnswers.reduce((sum, a) => sum + a.score, 0),
      opponentAnswered: opponentAnswers.filter((a) => a.selectedOption !== null)
        .length,
    });
  }

  // Si COMPLETED: mostrar todo
  if (causa.status === "COMPLETED") {
    return NextResponse.json({
      id: causa.id,
      status: causa.status,
      opponent: {
        id: opponentId,
        name: `${opponent.firstName} ${opponent.lastName}`,
      },
      winner: causa.winner
        ? {
            id: causa.winner.id,
            name: `${causa.winner.firstName} ${causa.winner.lastName}`,
          }
        : null,
      startedAt: causa.startedAt?.toISOString(),
      completedAt: causa.completedAt?.toISOString(),
      myAnswers: myAnswers.map((a) => ({
        questionIdx: a.questionIdx,
        mcq: a.mcq,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        timeMs: a.timeMs,
        score: a.score,
      })),
      opponentAnswers: opponentAnswers.map((a) => ({
        questionIdx: a.questionIdx,
        mcq: a.mcq,
        selectedOption: a.selectedOption,
        isCorrect: a.isCorrect,
        timeMs: a.timeMs,
        score: a.score,
      })),
      myScore: myAnswers.reduce((sum, a) => sum + a.score, 0),
      opponentScore: opponentAnswers.reduce((sum, a) => sum + a.score, 0),
    });
  }

  // PENDING o REJECTED o EXPIRED
  return NextResponse.json({
    id: causa.id,
    status: causa.status,
    challenger: {
      id: causa.challenger.id,
      name: `${causa.challenger.firstName} ${causa.challenger.lastName}`,
    },
    challenged: {
      id: causa.challenged.id,
      name: `${causa.challenged.firstName} ${causa.challenged.lastName}`,
    },
    createdAt: causa.createdAt.toISOString(),
  });
}
