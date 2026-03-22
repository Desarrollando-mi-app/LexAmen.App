import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";
import { BADGE_MAP } from "@/lib/badge-constants";
import { isFreePlan } from "@/lib/plan-utils";

const DAILY_FREE_LIMIT = 5;

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
  let body: { fillBlankId: string; respuestas: { blancoId: number; respuesta: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const { fillBlankId, respuestas } = body;

  if (!fillBlankId || !Array.isArray(respuestas)) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  // 3. Get user from Prisma
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, isAdmin: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // 4. Daily limit check for free plan
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.fillBlankAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  if (isFreePlan(dbUser) && attemptsToday >= DAILY_FREE_LIMIT) {
    return NextResponse.json(
      {
        error: "Has alcanzado el limite de ejercicios diarios.",
        limit: true,
        attemptsToday,
      },
      { status: 403 },
    );
  }

  // 5. Fetch the fill blank item
  const fillBlank = await prisma.fillBlank.findUnique({
    where: { id: fillBlankId },
  });

  if (!fillBlank) {
    return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
  }

  // 6. Evaluate each blank
  const blancos: { id: number; correcta: string; opciones: string[] }[] = JSON.parse(fillBlank.blancos);

  const resultados = blancos.map((b) => {
    const userResp = respuestas.find((r) => r.blancoId === b.id);
    const esCorrecta = userResp?.respuesta === b.correcta;
    return {
      blancoId: b.id,
      respuesta: userResp?.respuesta || "",
      correcta: b.correcta,
      esCorrecta,
    };
  });

  const correctCount = resultados.filter((r) => r.esCorrecta).length;
  const totalBlancos = blancos.length;
  const todosCorrectos = correctCount === totalBlancos;

  // 7. Calculate XP: +3 if all correct, +1 if >= half, 0 otherwise
  let xpGained = 0;
  if (todosCorrectos) xpGained = 3;
  else if (correctCount >= totalBlancos / 2) xpGained = 1;

  // 8. Save attempt
  await prisma.fillBlankAttempt.create({
    data: {
      userId: authUser.id,
      fillBlankId,
      respuestas: JSON.stringify(resultados),
      todosCorrectos,
    },
  });

  // 9. Award XP
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "Completar espacios",
      materia: fillBlank.materia ?? undefined,
      prisma,
    });
  }

  // 10. Badge evaluation
  const newBadgeSlugs = await evaluateBadges(authUser.id, "estudio").catch(
    () => [] as string[],
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

  return NextResponse.json({
    resultados,
    todosCorrectos,
    correctCount,
    totalBlancos,
    explicacion: fillBlank.explicacion,
    xpGained,
    attemptsToday: attemptsToday + 1,
    newBadges,
  });
}
