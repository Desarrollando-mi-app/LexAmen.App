import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";
import { BADGE_MAP } from "@/lib/badge-constants";
import { isFreePlan } from "@/lib/plan-utils";

const DAILY_LIMIT = 5;

/* ─── Text comparison engine ─── */

function evaluarDictado(original: string, usuario: string) {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^\w\s]/g, "") // remove punctuation
      .replace(/\s+/g, " ")
      .trim();

  const origWords = original.split(/\s+/);
  const normalizedOrig = normalize(original).split(" ");
  const normalizedUser = normalize(usuario).split(" ");

  let correctas = 0;
  const resultados = normalizedOrig.map((w, i) => {
    const userWord = normalizedUser[i] || "";
    const match = w === userWord;
    if (match) correctas++;
    return {
      original: origWords[i] || w,
      usuario: usuario.split(/\s+/)[i] || "",
      correcto: match,
    };
  });

  // Extra words typed by user beyond the original length
  const extras = normalizedUser.slice(normalizedOrig.length).map((_, i) => ({
    original: "",
    usuario: usuario.split(/\s+/)[normalizedOrig.length + i] || "",
    correcto: false,
  }));

  const precision =
    normalizedOrig.length > 0
      ? Math.round((correctas / normalizedOrig.length) * 1000) / 10
      : 0;

  return {
    resultados: [...resultados, ...extras],
    precision,
    palabrasCorrectas: correctas,
    palabrasTotales: normalizedOrig.length,
  };
}

/* ─── XP tiers ─── */

function calcularXp(precision: number): number {
  if (precision >= 95) return 4;
  if (precision >= 80) return 3;
  if (precision >= 60) return 2;
  if (precision >= 40) return 1;
  return 0;
}

/**
 * POST /api/dictado/attempt — evaluate a dictado attempt (PAID ONLY)
 * Body: { dictadoId: string, textoUsuario: string }
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
  let body: { dictadoId: string; textoUsuario: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const { dictadoId, textoUsuario } = body;

  if (!dictadoId || !textoUsuario) {
    return NextResponse.json(
      { error: "dictadoId y textoUsuario son requeridos" },
      { status: 400 },
    );
  }

  // 3. Get user + verify NOT free plan
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, isAdmin: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (isFreePlan(dbUser)) {
    return NextResponse.json(
      { error: "Dictado Juridico es exclusivo para planes de pago." },
      { status: 403 },
    );
  }

  // 4. Daily limit check
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.dictadoAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  if (attemptsToday >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: "Has alcanzado el limite de dictados diarios.",
        limit: true,
        attemptsToday,
      },
      { status: 403 },
    );
  }

  // 5. Fetch dictado
  const dictado = await prisma.dictadoJuridico.findUnique({
    where: { id: dictadoId },
    select: { textoCompleto: true, materia: true },
  });

  if (!dictado) {
    return NextResponse.json({ error: "Dictado no encontrado" }, { status: 404 });
  }

  // 6. Evaluate
  const { resultados, precision, palabrasCorrectas, palabrasTotales } =
    evaluarDictado(dictado.textoCompleto, textoUsuario);

  // 7. Calculate XP
  const xpGained = calcularXp(precision);

  // 8. Save attempt
  await prisma.dictadoAttempt.create({
    data: {
      userId: authUser.id,
      dictadoId,
      textoUsuario,
      precision,
      palabrasCorrectas,
      palabrasTotales,
    },
  });

  // 9. Award XP
  if (xpGained > 0) {
    await awardXp({
      userId: authUser.id,
      amount: xpGained,
      category: "estudio",
      detalle: "Dictado juridico",
      materia: dictado.materia ?? undefined,
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
    precision,
    palabrasCorrectas,
    palabrasTotales,
    xpGained,
    attemptsToday: attemptsToday + 1,
    newBadges,
  });
}
