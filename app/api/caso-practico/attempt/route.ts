import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";
import { BADGE_MAP } from "@/lib/badge-constants";
import { isFreePlan } from "@/lib/plan-utils";

const DAILY_FREE_LIMIT = 3;

/**
 * POST /api/caso-practico/attempt
 * Body: { casoPracticoId, respuestas: [{ preguntaId: number, respuesta: number }, ...] }
 * XP: +2 per correct + 3 bonus if all 3 correct = max 9 XP
 */
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
  let body: {
    casoPracticoId: string;
    respuestas: { preguntaId: number; respuesta: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { casoPracticoId, respuestas } = body;

  if (!casoPracticoId || !Array.isArray(respuestas)) {
    return NextResponse.json(
      { error: "casoPracticoId y respuestas son requeridos" },
      { status: 400 }
    );
  }

  // 3. Get user plan
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, isAdmin: true },
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

  const attemptsToday = await prisma.casoPracticoAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  if (isFreePlan(dbUser) && attemptsToday >= DAILY_FREE_LIMIT) {
    return NextResponse.json(
      {
        error: "Has alcanzado el límite de 3 casos prácticos diarios.",
        limit: true,
        attemptsToday,
      },
      { status: 403 }
    );
  }

  // 5. Fetch caso practico with preguntas
  const caso = await prisma.casoPractico.findUnique({
    where: { id: casoPracticoId },
    select: { preguntas: true, rama: true, materia: true },
  });

  if (!caso) {
    return NextResponse.json(
      { error: "Caso práctico no encontrado" },
      { status: 404 }
    );
  }

  // 6. Parse preguntas and grade
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let preguntas: any[] = [];
  try {
    preguntas = JSON.parse(caso.preguntas);
  } catch {
    return NextResponse.json(
      { error: "Error interno: preguntas inválidas" },
      { status: 500 }
    );
  }

  let correctas = 0;
  const gradedRespuestas = respuestas.map((r) => {
    const pregunta = preguntas.find((p: any) => p.id === r.preguntaId);
    if (!pregunta) {
      return { preguntaId: r.preguntaId, respuesta: r.respuesta, correcta: false };
    }
    const isCorrect = r.respuesta === pregunta.correcta;
    if (isCorrect) correctas++;
    return {
      preguntaId: r.preguntaId,
      respuesta: r.respuesta,
      correcta: isCorrect,
      explicacion: pregunta.explicacion || null,
      correctaIndex: pregunta.correcta,
    };
  });

  // 7. Calculate XP: +2 per correct + 3 bonus if all correct
  const totalPreguntas = preguntas.length;
  const allCorrect = correctas === totalPreguntas && totalPreguntas > 0;
  const xpGained = correctas * 2 + (allCorrect ? 3 : 0);

  // 8. Save attempt
  await prisma.casoPracticoAttempt.create({
    data: {
      userId: authUser.id,
      casoPracticoId,
      respuestas: JSON.stringify(gradedRespuestas),
      correctas,
    },
  });

  // 9. Award XP
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "Casos prácticos",
      materia: caso.materia || caso.rama,
      prisma,
    });
  }

  // 10. Badge evaluation
  const newBadgeSlugs = await evaluateBadges(authUser.id, "estudio").catch(
    () => [] as string[]
  );
  const newBadges = newBadgeSlugs
    .map((slug) => {
      const b = BADGE_MAP[slug];
      return b
        ? {
            slug: b.slug,
            label: b.label,
            emoji: b.emoji,
            description: b.description,
            tier: b.tier,
          }
        : null;
    })
    .filter(Boolean);

  // 11. Return result
  return NextResponse.json({
    gradedRespuestas,
    correctas,
    totalPreguntas,
    allCorrect,
    xpGained,
    attemptsToday: attemptsToday + 1,
    newBadges,
  });
}
