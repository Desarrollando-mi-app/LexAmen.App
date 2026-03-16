import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds } from "@/lib/league";

const DAILY_FREE_LIMIT = 15;
const XP_CORRECT = 2;

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Parse body
  let body: { definicionId: string; respuesta: string; tiempoMs?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { definicionId, respuesta, tiempoMs } = body;

  if (!definicionId || !respuesta) {
    return NextResponse.json(
      { error: "definicionId y respuesta son requeridos" },
      { status: 400 }
    );
  }

  // 3. Get user
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

  // 4. Daily limit for FREE plan
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.definicionIntento.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  if (dbUser.plan === "FREE" && attemptsToday >= DAILY_FREE_LIMIT) {
    return NextResponse.json(
      {
        error: "Has alcanzado el límite diario de definiciones.",
        limit: true,
        attemptsToday,
      },
      { status: 403 }
    );
  }

  // 5. Get definition
  const definicion = await prisma.definicion.findUnique({
    where: { id: definicionId },
    select: { concepto: true, explicacion: true },
  });

  if (!definicion) {
    return NextResponse.json(
      { error: "Definición no encontrada" },
      { status: 404 }
    );
  }

  // 6. Evaluate
  const isCorrect = respuesta === definicion.concepto;
  const xpGained = isCorrect ? XP_CORRECT : 0;

  // 7. Save attempt
  await prisma.definicionIntento.create({
    data: {
      definicionId,
      userId: authUser.id,
      respuesta,
      correcta: isCorrect,
      tiempoMs: tiempoMs ?? null,
    },
  });

  // 8. Increment XP if correct
  if (xpGained > 0) {
    await prisma.user.update({
      where: { id: authUser.id },
      data: { xp: { increment: xpGained } },
    });

    // 9. Update league weekly XP
    const { weekStart } = getCurrentWeekBounds();
    await prisma.leagueMember.updateMany({
      where: {
        userId: authUser.id,
        league: { weekStart },
      },
      data: { weeklyXp: { increment: xpGained } },
    });
  }

  // 10. Return result
  return NextResponse.json({
    isCorrect,
    correctAnswer: definicion.concepto,
    explicacion: definicion.explicacion,
    xpGained,
    attemptsToday: attemptsToday + 1,
  });
}
