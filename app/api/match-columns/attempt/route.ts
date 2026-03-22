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
    matchColumnsId: string;
    conexiones: { izquierdaId: number; derechaId: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const { matchColumnsId, conexiones } = body;

  if (!matchColumnsId || !Array.isArray(conexiones)) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  // 3. Get user from Prisma
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, isAdmin: true },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 },
    );
  }

  // 4. Daily limit check for free plan
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.matchColumnsAttempt.count({
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

  // 5. Fetch the match columns item
  const matchColumns = await prisma.matchColumns.findUnique({
    where: { id: matchColumnsId },
  });

  if (!matchColumns) {
    return NextResponse.json(
      { error: "Ejercicio no encontrado" },
      { status: 404 },
    );
  }

  // 6. Evaluate connections
  const pares: { id: number; izquierda: string; derecha: string }[] =
    JSON.parse(matchColumns.pares);

  const totalPares = pares.length;

  // Build a map: izquierdaId -> correct derechaId (same id in correct pair)
  // Each pair has the same id for both left and right
  let correctas = 0;
  const resultados = pares.map((par) => {
    const userConexion = conexiones.find((c) => c.izquierdaId === par.id);
    const esCorrecta = userConexion?.derechaId === par.id;
    if (esCorrecta) correctas++;
    return {
      izquierdaId: par.id,
      izquierda: par.izquierda,
      derechaSeleccionada: userConexion?.derechaId ?? null,
      derechaCorrecta: par.id,
      derechaTexto: par.derecha,
      esCorrecta,
    };
  });

  const perfecto = correctas === totalPares;
  const porcentaje = totalPares > 0 ? correctas / totalPares : 0;

  // 7. Calculate XP: +4 if perfect, +2 if 80%+, +1 if 50%+, +0 if less
  let xpGained = 0;
  if (perfecto) xpGained = 4;
  else if (porcentaje >= 0.8) xpGained = 2;
  else if (porcentaje >= 0.5) xpGained = 1;

  // 8. Save attempt
  await prisma.matchColumnsAttempt.create({
    data: {
      userId: authUser.id,
      matchColumnsId,
      conexiones: JSON.stringify(conexiones),
      correctas,
      totalPares,
      perfecto,
    },
  });

  // 9. Award XP
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "Relacionar columnas",
      materia: matchColumns.materia ?? undefined,
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
    correctas,
    totalPares,
    perfecto,
    explicacion: matchColumns.explicacion,
    xpGained,
    attemptsToday: attemptsToday + 1,
    newBadges,
  });
}
