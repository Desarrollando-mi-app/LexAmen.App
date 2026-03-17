import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { calculateXP, calculateStreakBonus, awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";

const DAILY_FREE_LIMIT = 10;

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
  let body: { mcqId: string; selectedOption: string; streak?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { mcqId, selectedOption, streak } = body;

  // 3. Validar campos
  if (!mcqId) {
    return NextResponse.json(
      { error: "mcqId es requerido" },
      { status: 400 }
    );
  }

  if (!["A", "B", "C", "D"].includes(selectedOption)) {
    return NextResponse.json(
      { error: "selectedOption debe ser A, B, C o D" },
      { status: 400 }
    );
  }

  // 4. Obtener usuario de Prisma para verificar plan y xp
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, xp: true },
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

  const attemptsToday = await prisma.userMCQAttempt.count({
    where: {
      userId: authUser.id,
      attemptedAt: { gte: startOfToday },
    },
  });

  if (dbUser.plan === "FREE" && attemptsToday >= DAILY_FREE_LIMIT) {
    return NextResponse.json(
      {
        error: "Has alcanzado el límite de 10 preguntas diarias.",
        limit: true,
        attemptsToday,
      },
      { status: 403 }
    );
  }

  // 6. Buscar MCQ (incluyendo dificultad para cálculo de XP)
  const mcq = await prisma.mCQ.findUnique({
    where: { id: mcqId },
    select: { correctOption: true, explanation: true, dificultad: true, rama: true },
  });

  if (!mcq) {
    return NextResponse.json(
      { error: "Pregunta no encontrada" },
      { status: 404 }
    );
  }

  // 7. Evaluar respuesta y calcular XP por dificultad
  const isCorrect = selectedOption === mcq.correctOption;
  const baseXP = calculateXP("MCQ", mcq.dificultad, isCorrect);
  const streakBonus = isCorrect ? calculateStreakBonus(streak ?? 0) : 0;
  const xpGained = baseXP + streakBonus;

  // 8. Guardar intento
  await prisma.userMCQAttempt.create({
    data: {
      userId: authUser.id,
      mcqId,
      selectedOption,
      isCorrect,
    },
  });

  // 9. Otorgar XP via awardXp centralizado (user.xp + leagueMember.weeklyXp + XpLog)
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "MCQ",
      materia: mcq.rama,
      prisma,
    });
  }

  // Badge evaluation
  evaluateBadges(authUser.id, "estudio").catch(() => {});

  // 10. Retornar resultado
  return NextResponse.json({
    isCorrect,
    correctOption: mcq.correctOption,
    explanation: mcq.explanation,
    xpGained,
    streakBonus,
    attemptsToday: attemptsToday + 1,
  });
}
