import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { calculateXP, calculateStreakBonus, awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";

const DAILY_FREE_LIMIT = 20;

export async function POST(request: Request) {
  // 1. Autenticar usuario
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Parsear body
  let body: { trueFalseId: string; selectedAnswer: boolean; streak?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { trueFalseId, selectedAnswer, streak } = body;

  // 3. Validar campos
  if (!trueFalseId) {
    return NextResponse.json(
      { error: "trueFalseId es requerido" },
      { status: 400 }
    );
  }

  if (typeof selectedAnswer !== "boolean") {
    return NextResponse.json(
      { error: "selectedAnswer debe ser true o false" },
      { status: 400 }
    );
  }

  // 4. Obtener usuario de Prisma para verificar plan
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  // 5. Verificar límite diario para plan FREE
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.userTrueFalseAttempt.count({
    where: {
      userId: authUser.id,
      attemptedAt: { gte: startOfToday },
    },
  });

  if (dbUser.plan === "FREE" && attemptsToday >= DAILY_FREE_LIMIT) {
    return NextResponse.json(
      {
        error: "Has alcanzado el límite de 20 afirmaciones diarias.",
        limit: true,
        attemptsToday,
      },
      { status: 403 }
    );
  }

  // 6. Buscar TrueFalse (incluyendo dificultad para cálculo de XP)
  const tf = await prisma.trueFalse.findUnique({
    where: { id: trueFalseId },
    select: { isTrue: true, explanation: true, dificultad: true, rama: true },
  });

  if (!tf) {
    return NextResponse.json(
      { error: "Afirmación no encontrada" },
      { status: 404 }
    );
  }

  // 7. Evaluar respuesta y calcular XP por dificultad
  const isCorrect = selectedAnswer === tf.isTrue;
  const baseXP = calculateXP("TRUEFALSE", tf.dificultad, isCorrect);
  const streakBonus = isCorrect ? calculateStreakBonus(streak ?? 0) : 0;
  const xpGained = baseXP + streakBonus;

  // 8. Guardar intento
  await prisma.userTrueFalseAttempt.create({
    data: {
      userId: authUser.id,
      trueFalseId,
      selectedAnswer,
      isCorrect,
    },
  });

  // 9. Otorgar XP via awardXp centralizado (user.xp + leagueMember.weeklyXp + XpLog)
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "Verdadero/Falso",
      materia: tf.rama,
      prisma,
    });
  }

  // Badge evaluation
  evaluateBadges(authUser.id, "estudio").catch(() => {});

  // 10. Retornar resultado
  return NextResponse.json({
    isCorrect,
    correctAnswer: tf.isTrue,
    explanation: tf.explanation,
    xpGained,
    streakBonus,
    attemptsToday: attemptsToday + 1,
  });
}
