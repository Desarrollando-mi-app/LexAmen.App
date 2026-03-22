import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";
import { BADGE_MAP } from "@/lib/badge-constants";
import { isFreePlan } from "@/lib/plan-utils";

const DAILY_FREE_LIMIT = 5;

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
  const body = await request.json();
  const { errorIdentificationId, selecciones } = body;
  // selecciones: [segmentoId1, segmentoId2, ...] -- IDs of segments the user thinks are errors

  if (!errorIdentificationId || !Array.isArray(selecciones)) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  // 3. Obtener usuario de Prisma para verificar plan
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

  // 4. Verificar limite diario para plan FREE
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.errorIdentificationAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  if (isFreePlan(dbUser) && attemptsToday >= DAILY_FREE_LIMIT) {
    return NextResponse.json(
      {
        error: "Limite diario alcanzado",
        limit: true,
        attemptsToday,
      },
      { status: 403 }
    );
  }

  // 5. Buscar ejercicio
  const exercise = await prisma.errorIdentification.findUnique({
    where: { id: errorIdentificationId },
  });

  if (!exercise) {
    return NextResponse.json(
      { error: "Ejercicio no encontrado" },
      { status: 404 }
    );
  }

  // 6. Evaluar respuesta
  const segmentos = JSON.parse(exercise.segmentos);
  const seleccionSet = new Set(selecciones);

  let aciertos = 0;
  let fallosPositivos = 0;

  for (const seg of segmentos) {
    if (seg.esError && seleccionSet.has(seg.id)) aciertos++;
    if (!seg.esError && seleccionSet.has(seg.id)) fallosPositivos++;
  }

  const totalErrores = exercise.totalErrores;

  // 7. Calcular XP: +4 perfect (all errors, no false positives), +2 all errors but some false positives, +1 partial
  let xpGained = 0;
  if (aciertos === totalErrores && fallosPositivos === 0) xpGained = 4;
  else if (aciertos === totalErrores) xpGained = 2;
  else if (aciertos > 0) xpGained = 1;

  // 8. Guardar intento
  await prisma.errorIdentificationAttempt.create({
    data: {
      userId: authUser.id,
      errorIdentificationId,
      selecciones: JSON.stringify(selecciones),
      aciertos,
      fallosPositivos,
    },
  });

  // 9. Otorgar XP via awardXp centralizado
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "Identificar errores",
      materia: exercise.materia ?? undefined,
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

  // 11. Retornar resultado con segmentos completos para feedback
  return NextResponse.json({
    segmentos, // Full segments with esError, textoCorrecto, explicacion
    aciertos,
    fallosPositivos,
    totalErrores,
    explicacionGeneral: exercise.explicacionGeneral,
    xpGained,
    attemptsToday: attemptsToday + 1,
    newBadges,
  });
}
