import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LIBRO_LABELS } from "@/lib/curriculum-data";

// ─── Helpers ─────────────────────────────────────────────

function calculateStreak(dates: (Date | null)[]): number {
  const daySet = new Set<string>();
  for (const d of dates) {
    if (d) daySet.add(d.toISOString().slice(0, 10));
  }
  if (daySet.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  if (!daySet.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function periodMs(periodo: string): number {
  switch (periodo) {
    case "7d": return 7 * 86400000;
    case "30d": return 30 * 86400000;
    case "90d": return 90 * 86400000;
    default: return 0; // "all"
  }
}

function weekLabel(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

const LIBRO_SHORT: Record<string, string> = {
  TITULO_PRELIMINAR: "T. Preliminar",
  MENSAJE: "Mensaje",
  LIBRO_I: "Libro I CC",
  LIBRO_II: "Libro II CC",
  LIBRO_III: "Libro III CC",
  LIBRO_IV: "Libro IV CC",
  TITULO_FINAL: "T. Final",
  LIBRO_I_CPC: "Libro I CPC",
  LIBRO_II_CPC: "Libro II CPC",
  LIBRO_III_CPC: "Libro III CPC",
  LIBRO_IV_CPC: "Libro IV CPC",
};

// ─── GET ─────────────────────────────────────────────────

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo") || "30d";

  const ms = periodMs(periodo);
  const now = new Date();
  const dateFrom = ms > 0 ? new Date(now.getTime() - ms) : new Date(0);
  const datePrev = ms > 0 ? new Date(dateFrom.getTime() - ms) : new Date(0);
  const date90d = new Date(now.getTime() - 90 * 86400000);

  const userId = authUser.id;

  // ═══ PARALLEL QUERIES ═══
  const [
    user,
    // Flashcard progress
    allFcProgress,
    // MCQ attempts in period
    mcqInPeriod,
    // MCQ attempts in previous period
    mcqPrevPeriod,
    // V/F attempts in period
    vfInPeriod,
    // V/F attempts in previous period
    vfPrevPeriod,
    // Flashcard reviews in period
    fcReviewsInPeriod,
    // All flashcard reviews (for streak)
    allFcReviews,
    // Simulacro sessions in period
    simulacroInPeriod,
    // Causa participations in period
    causasInPeriod,
    // Activity data for heatmap (90 days)
    fcActivity90,
    mcqActivity90,
    vfActivity90,
    simulacroActivity90,
    // MCQ by libro (for competencias)
    mcqByLibro,
    , // mcqCorrectByLibro (handled in combined query)
    // V/F by libro
    vfByLibro,
    , // vfCorrectByLibro (handled in combined query)
    // Flashcards by libro
    fcByLibro,
    fcDomByLibro,
    // ExamenConfig
    examenConfig,
    // XP in period (unused, use user.xp)
    ,
  ] = await Promise.all([
    // User
    prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, universidad: true, causasGanadas: true, causasPerdidas: true },
    }),
    // All FC progress for this user
    prisma.userFlashcardProgress.findMany({
      where: { userId },
      select: {
        repetitions: true,
        lastReviewedAt: true,
        flashcard: { select: { rama: true, libro: true } },
      },
    }),
    // MCQ in period
    prisma.userMCQAttempt.findMany({
      where: { userId, attemptedAt: { gte: dateFrom } },
      select: { isCorrect: true, attemptedAt: true, mcq: { select: { rama: true, libro: true } } },
    }),
    // MCQ previous period
    ms > 0
      ? prisma.userMCQAttempt.findMany({
          where: { userId, attemptedAt: { gte: datePrev, lt: dateFrom } },
          select: { isCorrect: true },
        })
      : Promise.resolve([]),
    // V/F in period
    prisma.userTrueFalseAttempt.findMany({
      where: { userId, attemptedAt: { gte: dateFrom } },
      select: { isCorrect: true, attemptedAt: true, trueFalse: { select: { rama: true, libro: true } } },
    }),
    // V/F previous period
    ms > 0
      ? prisma.userTrueFalseAttempt.findMany({
          where: { userId, attemptedAt: { gte: datePrev, lt: dateFrom } },
          select: { isCorrect: true },
        })
      : Promise.resolve([]),
    // FC reviews in period
    prisma.userFlashcardProgress.findMany({
      where: { userId, lastReviewedAt: { gte: dateFrom } },
      select: { lastReviewedAt: true },
    }),
    // All FC reviews for streak
    prisma.userFlashcardProgress.findMany({
      where: { userId, lastReviewedAt: { not: null } },
      select: { lastReviewedAt: true },
    }),
    // Simulacro in period
    prisma.simulacroSesion.findMany({
      where: { userId, createdAt: { gte: dateFrom }, completada: true },
      select: { correctas: true, incorrectas: true, createdAt: true },
    }),
    // Causas in period
    prisma.causaParticipant.findMany({
      where: { userId, joinedAt: { gte: dateFrom } },
      select: { score: true },
    }),
    // 90-day activity: FC
    prisma.userFlashcardProgress.findMany({
      where: { userId, lastReviewedAt: { gte: date90d } },
      select: { lastReviewedAt: true },
    }),
    // 90-day activity: MCQ
    prisma.userMCQAttempt.findMany({
      where: { userId, attemptedAt: { gte: date90d } },
      select: { attemptedAt: true },
    }),
    // 90-day activity: V/F
    prisma.userTrueFalseAttempt.findMany({
      where: { userId, attemptedAt: { gte: date90d } },
      select: { attemptedAt: true },
    }),
    // 90-day activity: Simulacro
    prisma.simulacroSesion.findMany({
      where: { userId, createdAt: { gte: date90d } },
      select: { createdAt: true },
    }),
    // MCQ total by libro (all time for competencias)
    prisma.userMCQAttempt.groupBy({
      by: ["mcqId"],
      where: { userId },
      _count: true,
    }).then(() =>
      prisma.userMCQAttempt.findMany({
        where: { userId },
        select: { isCorrect: true, mcq: { select: { libro: true } } },
      })
    ),
    // MCQ correct by libro - handled above in combined query
    Promise.resolve(null),
    // V/F by libro (all time)
    prisma.userTrueFalseAttempt.findMany({
      where: { userId },
      select: { isCorrect: true, trueFalse: { select: { libro: true } } },
    }),
    // V/F correct by libro - handled above
    Promise.resolve(null),
    // FC by libro
    prisma.flashcard.groupBy({
      by: ["libro"],
      _count: { id: true },
    }),
    // FC dominated by libro
    prisma.userFlashcardProgress.findMany({
      where: { userId, repetitions: { gte: 3 } },
      select: { flashcard: { select: { libro: true } } },
    }),
    // ExamenConfig
    prisma.examenConfig.findUnique({
      where: { userId },
      select: {
        temas: {
          where: { tieneContenido: true },
          select: { nombre: true, materiaMapping: true, libroMapping: true },
        },
      },
    }),
    // XP data - just use user.xp
    Promise.resolve(null),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // ═══ BLOQUE 1: RESUMEN EJECUTIVO ═══

  const streak = calculateStreak(allFcReviews.map((r) => r.lastReviewedAt));

  const mcqCorrectPeriod = mcqInPeriod.filter((a) => a.isCorrect).length;
  const vfCorrectPeriod = vfInPeriod.filter((a) => a.isCorrect).length;
  const totalCorrectPeriod = mcqCorrectPeriod + vfCorrectPeriod;
  const totalAttemptsPeriod = mcqInPeriod.length + vfInPeriod.length;
  const tasaAcierto = totalAttemptsPeriod > 0
    ? Math.round((totalCorrectPeriod / totalAttemptsPeriod) * 100)
    : 0;

  // Previous period
  const mcqCorrectPrev = mcqPrevPeriod.filter((a) => a.isCorrect).length;
  const vfCorrectPrev = vfPrevPeriod.filter((a) => a.isCorrect).length;
  const totalCorrectPrev = mcqCorrectPrev + vfCorrectPrev;
  const totalAttemptsPrev = mcqPrevPeriod.length + vfPrevPeriod.length;
  const tasaPrev = totalAttemptsPrev > 0
    ? Math.round((totalCorrectPrev / totalAttemptsPrev) * 100)
    : 0;

  const tasaCambio = totalAttemptsPrev > 0 ? tasaAcierto - tasaPrev : 0;

  // Active days in period
  const activeDaysSet = new Set<string>();
  for (const r of fcReviewsInPeriod) {
    if (r.lastReviewedAt) activeDaysSet.add(r.lastReviewedAt.toISOString().slice(0, 10));
  }
  for (const a of mcqInPeriod) activeDaysSet.add(a.attemptedAt.toISOString().slice(0, 10));
  for (const a of vfInPeriod) activeDaysSet.add(a.attemptedAt.toISOString().slice(0, 10));
  const diasActivos = activeDaysSet.size;

  // ═══ BLOQUE 2: COMPETENCIAS POR LIBRO ═══

  const libros = Object.keys(LIBRO_SHORT);
  const competencias: Array<{
    libro: string;
    label: string;
    fcTotal: number;
    fcDom: number;
    mcqTotal: number;
    mcqCorrect: number;
    vfTotal: number;
    vfCorrect: number;
    score: number;
  }> = [];

  // FC totals by libro
  const fcTotalMap: Record<string, number> = {};
  for (const g of fcByLibro) {
    fcTotalMap[g.libro] = g._count.id;
  }
  // FC dominated by libro
  const fcDomMap: Record<string, number> = {};
  for (const p of fcDomByLibro) {
    const k = p.flashcard.libro;
    fcDomMap[k] = (fcDomMap[k] ?? 0) + 1;
  }
  // MCQ by libro
  const mcqTotalMap: Record<string, number> = {};
  const mcqCorrectMap: Record<string, number> = {};
  for (const a of mcqByLibro) {
    const k = a.mcq.libro;
    mcqTotalMap[k] = (mcqTotalMap[k] ?? 0) + 1;
    if (a.isCorrect) mcqCorrectMap[k] = (mcqCorrectMap[k] ?? 0) + 1;
  }
  // V/F by libro
  const vfTotalMap: Record<string, number> = {};
  const vfCorrectMap: Record<string, number> = {};
  for (const a of vfByLibro) {
    const k = a.trueFalse.libro;
    vfTotalMap[k] = (vfTotalMap[k] ?? 0) + 1;
    if (a.isCorrect) vfCorrectMap[k] = (vfCorrectMap[k] ?? 0) + 1;
  }

  for (const libro of libros) {
    const fcT = fcTotalMap[libro] ?? 0;
    const fcD = fcDomMap[libro] ?? 0;
    const mcqT = mcqTotalMap[libro] ?? 0;
    const mcqC = mcqCorrectMap[libro] ?? 0;
    const vfT = vfTotalMap[libro] ?? 0;
    const vfC = vfCorrectMap[libro] ?? 0;

    // Skip libros with zero content
    if (fcT === 0 && mcqT === 0 && vfT === 0) continue;

    const fcScore = fcT > 0 ? (fcD / fcT) : 0;
    const mcqScore = mcqT > 0 ? (mcqC / mcqT) : 0;
    const vfScore = vfT > 0 ? (vfC / vfT) : 0;

    // Weighted composite
    let totalWeight = 0;
    let weightedScore = 0;
    if (fcT > 0) { weightedScore += fcScore * 0.4; totalWeight += 0.4; }
    if (mcqT > 0) { weightedScore += mcqScore * 0.35; totalWeight += 0.35; }
    if (vfT > 0) { weightedScore += vfScore * 0.25; totalWeight += 0.25; }

    const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

    competencias.push({
      libro,
      label: LIBRO_LABELS[libro] || LIBRO_SHORT[libro] || libro,
      fcTotal: fcT,
      fcDom: fcD,
      mcqTotal: mcqT,
      mcqCorrect: mcqC,
      vfTotal: vfT,
      vfCorrect: vfC,
      score,
    });
  }

  // ═══ BLOQUE 3: EVOLUCIÓN TEMPORAL ═══

  const numWeeks = periodo === "7d" ? 4 : periodo === "30d" ? 8 : 12;
  const weekSize = 7 * 86400000;
  const evolucion: Array<{
    semana: string;
    tasa: number;
    intentos: number;
    flashcards: number;
  }> = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekEnd = new Date(now.getTime() - i * weekSize);
    const weekStart = new Date(weekEnd.getTime() - weekSize);

    const mcqWeek = mcqInPeriod.filter(
      (a) => a.attemptedAt >= weekStart && a.attemptedAt < weekEnd
    );
    const vfWeek = vfInPeriod.filter(
      (a) => a.attemptedAt >= weekStart && a.attemptedAt < weekEnd
    );
    const fcWeek = fcReviewsInPeriod.filter(
      (r) => r.lastReviewedAt && r.lastReviewedAt >= weekStart && r.lastReviewedAt < weekEnd
    );

    const weekCorrect = mcqWeek.filter((a) => a.isCorrect).length + vfWeek.filter((a) => a.isCorrect).length;
    const weekTotal = mcqWeek.length + vfWeek.length;

    evolucion.push({
      semana: weekLabel(weekStart),
      tasa: weekTotal > 0 ? Math.round((weekCorrect / weekTotal) * 100) : 0,
      intentos: weekTotal,
      flashcards: fcWeek.length,
    });
  }

  // ═══ BLOQUE 4: DISTRIBUCIÓN ═══

  const totalItems = fcReviewsInPeriod.length + mcqInPeriod.length + vfInPeriod.length
    + simulacroInPeriod.length + causasInPeriod.length;
  const distribucion = [
    { modulo: "Flashcards", cantidad: fcReviewsInPeriod.length, porcentaje: 0 },
    { modulo: "MCQ", cantidad: mcqInPeriod.length, porcentaje: 0 },
    { modulo: "V/F", cantidad: vfInPeriod.length, porcentaje: 0 },
    { modulo: "Simulacro", cantidad: simulacroInPeriod.length, porcentaje: 0 },
    { modulo: "Causas", cantidad: causasInPeriod.length, porcentaje: 0 },
  ];
  for (const d of distribucion) {
    d.porcentaje = totalItems > 0 ? Math.round((d.cantidad / totalItems) * 100) : 0;
  }

  // ═══ BLOQUE 5: CALENDARIO DE ACTIVIDAD (90 días) ═══

  const activityMap: Record<string, { fc: number; mcq: number; vf: number; sim: number }> = {};

  for (const r of fcActivity90) {
    if (r.lastReviewedAt) {
      const k = r.lastReviewedAt.toISOString().slice(0, 10);
      if (!activityMap[k]) activityMap[k] = { fc: 0, mcq: 0, vf: 0, sim: 0 };
      activityMap[k].fc++;
    }
  }
  for (const a of mcqActivity90) {
    const k = a.attemptedAt.toISOString().slice(0, 10);
    if (!activityMap[k]) activityMap[k] = { fc: 0, mcq: 0, vf: 0, sim: 0 };
    activityMap[k].mcq++;
  }
  for (const a of vfActivity90) {
    const k = a.attemptedAt.toISOString().slice(0, 10);
    if (!activityMap[k]) activityMap[k] = { fc: 0, mcq: 0, vf: 0, sim: 0 };
    activityMap[k].vf++;
  }
  for (const s of simulacroActivity90) {
    const k = s.createdAt.toISOString().slice(0, 10);
    if (!activityMap[k]) activityMap[k] = { fc: 0, mcq: 0, vf: 0, sim: 0 };
    activityMap[k].sim++;
  }

  const dias: Array<{
    date: string;
    count: number;
    detalle: { fc: number; mcq: number; vf: number; sim: number };
  }> = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    const det = activityMap[k] || { fc: 0, mcq: 0, vf: 0, sim: 0 };
    dias.push({ date: k, count: det.fc + det.mcq + det.vf + det.sim, detalle: det });
  }

  // Best streak in 90 days
  let mejorRacha = 0;
  let currentRacha = 0;
  for (const d of dias) {
    if (d.count > 0) { currentRacha++; mejorRacha = Math.max(mejorRacha, currentRacha); }
    else { currentRacha = 0; }
  }

  // Most active day of week
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
  for (const d of dias) {
    if (d.count > 0) {
      const dow = new Date(d.date).getDay(); // 0=Sun
      dayOfWeekCounts[dow] += d.count;
    }
  }
  const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const maxDow = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
  const diaMasActivo = daysOfWeek[maxDow];

  // ═══ BLOQUE 6: MATERIAS OLVIDADAS ═══

  // Last activity per libro
  const lastActivityByLibro: Record<string, Date> = {};
  for (const p of allFcProgress) {
    if (p.lastReviewedAt) {
      const libro = p.flashcard.libro;
      if (!lastActivityByLibro[libro] || p.lastReviewedAt > lastActivityByLibro[libro]) {
        lastActivityByLibro[libro] = p.lastReviewedAt;
      }
    }
  }

  // MCQ/VF activity for olvidadas is already covered via mcqByLibro aggregation above

  // Examen tema libros for "en cedulario" check
  const cedularioLibros = new Set<string>();
  if (examenConfig) {
    for (const tema of examenConfig.temas) {
      if (tema.libroMapping) cedularioLibros.add(tema.libroMapping);
    }
  }

  const olvidadas: Array<{
    libro: string;
    label: string;
    diasSinPracticar: number;
    nivelDominio: number;
    enCedulario: boolean;
  }> = [];

  for (const libro of libros) {
    const fcT = fcTotalMap[libro] ?? 0;
    if (fcT === 0) continue; // No content for this libro

    const lastDate = lastActivityByLibro[libro];
    if (!lastDate) {
      // Never practiced
      const comp = competencias.find((c) => c.libro === libro);
      olvidadas.push({
        libro,
        label: LIBRO_LABELS[libro] || LIBRO_SHORT[libro] || libro,
        diasSinPracticar: 999,
        nivelDominio: comp?.score ?? 0,
        enCedulario: cedularioLibros.has(libro),
      });
      continue;
    }

    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
    if (daysSince > 7) {
      const comp = competencias.find((c) => c.libro === libro);
      olvidadas.push({
        libro,
        label: LIBRO_LABELS[libro] || LIBRO_SHORT[libro] || libro,
        diasSinPracticar: daysSince,
        nivelDominio: comp?.score ?? 0,
        enCedulario: cedularioLibros.has(libro),
      });
    }
  }
  olvidadas.sort((a, b) => b.diasSinPracticar - a.diasSinPracticar);

  // Count materias al día
  const materiasAlDia = libros.filter((l) => {
    if ((fcTotalMap[l] ?? 0) === 0) return false;
    const last = lastActivityByLibro[l];
    if (!last) return false;
    return Math.floor((now.getTime() - last.getTime()) / 86400000) <= 7;
  }).length;

  // ═══ MATERIAS DÉBILES (para frase) ═══

  const materiaDebil = competencias.length > 0
    ? competencias.reduce((a, b) => (a.score < b.score ? a : b))
    : null;

  const materiaOlvidada = olvidadas.length > 0 ? olvidadas[0] : null;

  // Build frase
  let frase = "";
  if (totalAttemptsPeriod > 0 && totalAttemptsPrev > 0) {
    if (tasaCambio > 0) {
      frase = `Tu tasa de acierto subió ${tasaCambio}% en este período.`;
    } else if (tasaCambio < 0) {
      frase = `Tu tasa de acierto bajó ${Math.abs(tasaCambio)}%.`;
    } else {
      frase = "Tu rendimiento se mantiene estable.";
    }
  } else if (totalAttemptsPeriod > 0) {
    frase = `Has respondido ${totalAttemptsPeriod} preguntas con ${tasaAcierto}% de acierto.`;
  } else {
    frase = "Aún no hay suficiente actividad para analizar tendencias.";
  }
  if (materiaDebil && materiaDebil.score < 80) {
    frase += ` Tu área más débil es ${materiaDebil.label}.`;
  }
  if (materiaOlvidada && materiaOlvidada.diasSinPracticar < 999) {
    frase += ` Llevas ${materiaOlvidada.diasSinPracticar} días sin practicar ${materiaOlvidada.label}.`;
  }

  // ═══ PERCENTIL COMPARATIVO ═══

  let percentil: {
    global: number;
    porMateria: Array<{ libro: string; label: string; percentil: number }>;
    totalUsuarios: number;
    universidad: string;
  } | null = null;

  if (user.universidad) {
    // Count users from same university
    const univUsers = await prisma.user.findMany({
      where: { universidad: user.universidad },
      select: { id: true },
    });

    if (univUsers.length >= 5) {
      const univUserIds = univUsers.map((u) => u.id);

      // Get MCQ accuracy for all university users
      const univMcqStats = await prisma.userMCQAttempt.groupBy({
        by: ["userId"],
        where: { userId: { in: univUserIds } },
        _count: true,
      });

      const univMcqCorrect = await prisma.userMCQAttempt.groupBy({
        by: ["userId"],
        where: { userId: { in: univUserIds }, isCorrect: true },
        _count: true,
      });

      const correctMap: Record<string, number> = {};
      for (const r of univMcqCorrect) correctMap[r.userId] = r._count;
      const totalMap: Record<string, number> = {};
      for (const r of univMcqStats) totalMap[r.userId] = r._count;

      const userScores: number[] = [];
      for (const uid of univUserIds) {
        const total = totalMap[uid] ?? 0;
        const correct = correctMap[uid] ?? 0;
        if (total > 0) userScores.push(Math.round((correct / total) * 100));
      }

      const myScore = tasaAcierto;
      const belowMe = userScores.filter((s) => s < myScore).length;
      const globalPercentil = userScores.length > 0
        ? Math.round((belowMe / userScores.length) * 100)
        : 50;

      percentil = {
        global: globalPercentil,
        porMateria: [], // Simplified for v1
        totalUsuarios: univUsers.length,
        universidad: user.universidad,
      };
    }
  }

  // ═══ RESPONSE ═══

  return NextResponse.json({
    resumen: {
      xp: user.xp,
      racha: streak,
      tasaAcierto,
      diasActivos,
      tendencias: {
        tasaCambio,
        intentosCambio: totalAttemptsPeriod - totalAttemptsPrev,
      },
      frase,
    },
    competencias: competencias.map((c) => ({
      libro: c.libro,
      label: c.label,
      score: c.score,
      fcDom: c.fcDom,
      fcTotal: c.fcTotal,
      mcqCorrect: c.mcqCorrect,
      mcqTotal: c.mcqTotal,
      vfCorrect: c.vfCorrect,
      vfTotal: c.vfTotal,
    })),
    evolucion,
    distribucion,
    totalItems,
    actividad: {
      dias,
      mejorRacha,
      diaMasActivo,
      materiasAlDia,
    },
    olvidadas,
    percentil,
  });
}
