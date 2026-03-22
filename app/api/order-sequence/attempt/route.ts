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
  let body: {
    orderSequenceId: string;
    ordenUsuario: { itemId: number; posicion: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const { orderSequenceId, ordenUsuario } = body;

  if (!orderSequenceId || !Array.isArray(ordenUsuario)) {
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

  const attemptsToday = await prisma.orderSequenceAttempt.count({
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

  // 5. Fetch the order sequence item
  const orderSequence = await prisma.orderSequence.findUnique({
    where: { id: orderSequenceId },
  });

  if (!orderSequence) {
    return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
  }

  // 6. Evaluate user order vs correct order
  const correctItems: { id: number; texto: string; orden: number }[] = JSON.parse(
    orderSequence.items,
  );
  const totalItems = correctItems.length;

  // Compare: for each item, check if user placed it in the correct position
  let correctCount = 0;
  const resultados = correctItems.map((ci) => {
    const userEntry = ordenUsuario.find((u) => u.itemId === ci.id);
    const userPos = userEntry?.posicion ?? -1;
    const esCorrecta = userPos === ci.orden;
    if (esCorrecta) correctCount++;
    return {
      itemId: ci.id,
      texto: ci.texto,
      ordenCorrecto: ci.orden,
      ordenUsuario: userPos,
      esCorrecta,
    };
  });

  const perfecto = correctCount === totalItems;
  const ratio = totalItems > 0 ? correctCount / totalItems : 0;

  // 7. Calculate XP: +4 if perfect, +2 if 80%+, +1 if 50%+, +0 otherwise
  let xpGained = 0;
  if (perfecto) xpGained = 4;
  else if (ratio >= 0.8) xpGained = 2;
  else if (ratio >= 0.5) xpGained = 1;

  // 8. Save attempt
  await prisma.orderSequenceAttempt.create({
    data: {
      userId: authUser.id,
      orderSequenceId,
      ordenUsuario: JSON.stringify(ordenUsuario),
      correctos: correctCount,
      totalItems,
      perfecto,
    },
  });

  // 9. Award XP
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "Ordenar secuencias",
      materia: orderSequence.materia ?? undefined,
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
    perfecto,
    correctCount,
    totalItems,
    explicacion: orderSequence.explicacion,
    xpGained,
    attemptsToday: attemptsToday + 1,
    newBadges,
  });
}
