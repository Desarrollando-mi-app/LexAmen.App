import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";
import { BADGE_MAP } from "@/lib/badge-constants";

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
    timelineId: string;
    posiciones: { eventoId: number; posicionUsuario: number }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const { timelineId, posiciones } = body;

  if (!timelineId || !Array.isArray(posiciones)) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  // 3. Get user from Prisma
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // 4. Daily limit check for free plan
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.timelineAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  if (dbUser.plan === "FREE" && attemptsToday >= DAILY_FREE_LIMIT) {
    return NextResponse.json(
      {
        error: "Has alcanzado el limite de ejercicios diarios.",
        limit: true,
        attemptsToday,
      },
      { status: 403 },
    );
  }

  // 5. Fetch the timeline
  const timeline = await prisma.timeline.findUnique({
    where: { id: timelineId },
  });

  if (!timeline) {
    return NextResponse.json({ error: "Ejercicio no encontrado" }, { status: 404 });
  }

  // 6. Evaluate user positions vs correct positions (+-1 tolerance)
  const correctEventos: { id: number; texto: string; posicion: number; unidad: string; descripcion: string }[] =
    JSON.parse(timeline.eventos);
  const totalEventos = correctEventos.length;

  let correctCount = 0;
  const resultados = correctEventos.map((ce) => {
    const userEntry = posiciones.find((p) => p.eventoId === ce.id);
    const posicionUsuario = userEntry?.posicionUsuario ?? -999;
    const diferencia = Math.abs(posicionUsuario - ce.posicion);
    const esCorrecta = diferencia <= 1;
    if (esCorrecta) correctCount++;
    return {
      eventoId: ce.id,
      texto: ce.texto,
      posicionCorrecta: ce.posicion,
      posicionUsuario,
      esCorrecta,
      unidad: ce.unidad || "",
      descripcion: ce.descripcion || "",
    };
  });

  const perfecto = correctCount === totalEventos;
  const ratio = totalEventos > 0 ? correctCount / totalEventos : 0;

  // 7. Calculate XP: +4 if perfect, +2 if 80%+, +1 if 50%+, +0 otherwise
  let xpGained = 0;
  if (perfecto) xpGained = 4;
  else if (ratio >= 0.8) xpGained = 2;
  else if (ratio >= 0.5) xpGained = 1;

  // 8. Save attempt
  await prisma.timelineAttempt.create({
    data: {
      userId: authUser.id,
      timelineId,
      posiciones: JSON.stringify(posiciones),
      correctos: correctCount,
      totalEventos,
      perfecto,
    },
  });

  // 9. Award XP
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "Lineas de tiempo",
      materia: timeline.materia ?? undefined,
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
    totalEventos,
    explicacion: timeline.explicacion,
    escala: timeline.escala,
    rangoMin: timeline.rangoMin,
    rangoMax: timeline.rangoMax,
    xpGained,
    attemptsToday: attemptsToday + 1,
    newBadges,
  });
}
