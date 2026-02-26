import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { calculateCausaScore, CAUSA_QUESTIONS, CAUSA_WINNER_XP } from "@/lib/causa";
import { getCurrentWeekBounds } from "@/lib/league";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: causaId } = await params;

  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Body
  let body: { questionIdx: number; selectedOption: string; timeMs: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { questionIdx, selectedOption, timeMs } = body;

  // 3. Fetch causa
  const causa = await prisma.causa.findUnique({
    where: { id: causaId },
  });

  if (!causa) {
    return NextResponse.json(
      { error: "Causa no encontrada" },
      { status: 404 }
    );
  }

  if (causa.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "La causa no está activa" },
      { status: 400 }
    );
  }

  // Verificar participante
  const isParticipant =
    causa.challengerId === authUser.id ||
    causa.challengedId === authUser.id;

  if (!isParticipant) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // 4. Fetch el CausaAnswer shell
  const answerRecord = await prisma.causaAnswer.findUnique({
    where: {
      causaId_userId_questionIdx: {
        causaId,
        userId: authUser.id,
        questionIdx,
      },
    },
    include: {
      mcq: { select: { correctOption: true } },
    },
  });

  if (!answerRecord) {
    return NextResponse.json(
      { error: "Pregunta no encontrada" },
      { status: 404 }
    );
  }

  if (answerRecord.selectedOption !== null) {
    return NextResponse.json(
      { error: "Ya respondiste esta pregunta" },
      { status: 400 }
    );
  }

  // 5. Evaluar y calcular score
  const isCorrect = selectedOption === answerRecord.mcq.correctOption;
  const score = calculateCausaScore(isCorrect, timeMs);

  // 6. Actualizar respuesta
  await prisma.causaAnswer.update({
    where: { id: answerRecord.id },
    data: {
      selectedOption,
      isCorrect,
      timeMs,
      score,
    },
  });

  // 7. Verificar si ambos jugadores terminaron
  const allAnswers = await prisma.causaAnswer.findMany({
    where: { causaId },
  });

  const challengerAnswered = allAnswers.filter(
    (a) => a.userId === causa.challengerId && a.selectedOption !== null
  ).length;
  const challengedAnswered = allAnswers.filter(
    (a) => a.userId === causa.challengedId && a.selectedOption !== null
  ).length;

  const bothComplete =
    challengerAnswered >= CAUSA_QUESTIONS &&
    challengedAnswered >= CAUSA_QUESTIONS;

  const result: {
    isCorrect: boolean;
    correctOption: string;
    score: number;
    causaComplete: boolean;
    winnerId?: string | null;
  } = {
    isCorrect,
    correctOption: answerRecord.mcq.correctOption,
    score,
    causaComplete: false,
  };

  if (bothComplete) {
    // Calcular scores totales
    const challengerScore = allAnswers
      .filter((a) => a.userId === causa.challengerId)
      .reduce((sum, a) => sum + a.score, 0);
    const challengedScore = allAnswers
      .filter((a) => a.userId === causa.challengedId)
      .reduce((sum, a) => sum + a.score, 0);

    let winnerId: string | null = null;

    if (challengerScore > challengedScore) {
      winnerId = causa.challengerId;
    } else if (challengedScore > challengerScore) {
      winnerId = causa.challengedId;
    } else {
      // Empate: menor tiempo total gana
      const challengerTime = allAnswers
        .filter((a) => a.userId === causa.challengerId)
        .reduce((sum, a) => sum + (a.timeMs ?? 0), 0);
      const challengedTime = allAnswers
        .filter((a) => a.userId === causa.challengedId)
        .reduce((sum, a) => sum + (a.timeMs ?? 0), 0);

      if (challengerTime < challengedTime) {
        winnerId = causa.challengerId;
      } else if (challengedTime < challengerTime) {
        winnerId = causa.challengedId;
      }
      // Si empate total → null (sin ganador)
    }

    // Actualizar causa
    await prisma.causa.update({
      where: { id: causaId },
      data: {
        status: "COMPLETED",
        winnerId,
        completedAt: new Date(),
      },
    });

    // Si hay ganador: +XP y actualizar stats
    if (winnerId) {
      const loserId =
        winnerId === causa.challengerId
          ? causa.challengedId
          : causa.challengerId;

      await prisma.user.update({
        where: { id: winnerId },
        data: {
          xp: { increment: CAUSA_WINNER_XP },
          causasGanadas: { increment: 1 },
        },
      });

      await prisma.user.update({
        where: { id: loserId },
        data: { causasPerdidas: { increment: 1 } },
      });

      // Incrementar weeklyXp del ganador
      const { weekStart } = getCurrentWeekBounds();
      await prisma.leagueMember.updateMany({
        where: {
          userId: winnerId,
          league: { weekStart },
        },
        data: { weeklyXp: { increment: CAUSA_WINNER_XP } },
      });
    }

    result.causaComplete = true;
    result.winnerId = winnerId;
  }

  return NextResponse.json(result);
}
