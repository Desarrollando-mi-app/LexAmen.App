import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { progressKey } from "@/lib/progress-utils";
import { checkStreakPenalty } from "@/lib/xp-config";
import type { ProgressData } from "./components/curriculum-progress";
import { RAMA_LABELS, CURRICULUM } from "@/lib/curriculum-data";

import { GzMasthead } from "./components/gz-masthead";
import { GzUserBar } from "./components/gz-user-bar";
import { GzHeadline } from "./components/gz-headline";
import { GzCausasWire } from "./components/gz-causas-wire";
import { GzStudyColumns } from "./components/gz-study-columns";
import { GzCommunity } from "./components/gz-community";
import { GzObiterSemana } from "./components/gz-obiter-semana";
import { GzMiExamenResumen } from "./components/gz-mi-examen-resumen";
import { GzFooter } from "./components/gz-footer";
import { GzLigaResumen } from "./components/gz-liga-resumen";
import { OnboardingCard } from "./components/onboarding-card";
import { StreakDetector } from "./components/streak-detector";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { getDaysRemaining } from "@/lib/league";

// ─── Cálculo de racha ────────────────────────────────────

function calculateStreak(dates: (Date | null)[]): number {
  const daySet = new Set<string>();
  for (const d of dates) {
    if (d) {
      const key = d.toISOString().slice(0, 10);
      daySet.add(key);
    }
  }

  if (daySet.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = today.toISOString().slice(0, 10);

  const cursor = new Date(today);
  if (!daySet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(cursor.toISOString().slice(0, 10))) {
      return 0;
    }
  }

  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// ─── Calcular progreso por rama ─────────────────────────────

function getRamaProgress(
  progressData: ProgressData,
  ramaKey: string
): number {
  const rama = CURRICULUM[ramaKey];
  if (!rama) return 0;

  let totalFlashcards = 0;
  let dominatedFlashcards = 0;

  for (const seccion of rama.secciones) {
    for (const titulo of seccion.titulos) {
      const key = progressKey(ramaKey, seccion.libro, titulo.id);
      const p = progressData[key];
      if (p) {
        totalFlashcards += p.flashcardTotal;
        dominatedFlashcards += p.flashcardDominated;
      }
    }
  }

  if (totalFlashcards === 0) return 0;
  return Math.round((dominatedFlashcards / totalFlashcards) * 100);
}

// ─── Página principal ────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Buscar o crear usuario
  let user = await prisma.user.findUnique({ where: { id: authUser.id } });

  if (!user) {
    try {
      const fullName = authUser.user_metadata?.full_name ?? "";
      const parts = fullName.split(" ");
      user = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          firstName: parts[0] || "Usuario",
          lastName: parts.slice(1).join(" ") || "Nuevo",
        },
      });
    } catch {
      user = await prisma.user.update({
        where: { email: authUser.email! },
        data: { id: authUser.id },
      });
    }
  }

  // ─── Verificar penalización por romper racha ────────────
  await checkStreakPenalty(authUser.id, prisma);

  // ─── Consultas de estadísticas (en paralelo) ──────────────
  const [
    masteredCount,
    reviewDatesRaw,
    flashcardsByTitulo,
    dominatedRecords,
    curriculumProgressRecords,
    flashcardReviews30d,
    mcqAttempts30d,
    tfAttempts30d,
    // Gazette queries
    totalFlashcards,
    mcqTotal,
    mcqCorrect,
    causaRoomsRaw,
    userBadgesRaw,
    colegasRaw,
    ayudantiasRaw,
    obiterDeLaSemanaRaw,
    examenConfigRaw,
    // La Sala resumen
    proximoEventoRaw,
    pasantiasNuevasCount,
    ayudantiasActivasCount,
    // Expediente Abierto
    expedienteActivoRaw,
  ] = await Promise.all([
    prisma.userFlashcardProgress.count({
      where: { userId: authUser.id, repetitions: { gte: 3 } },
    }),

    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id, lastReviewedAt: { not: null } },
      select: { lastReviewedAt: true },
    }),

    prisma.flashcard.groupBy({
      by: ["rama", "libro", "titulo"],
      _count: { id: true },
    }),

    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id, repetitions: { gte: 3 } },
      select: {
        flashcard: { select: { rama: true, libro: true, titulo: true } },
      },
    }),

    prisma.curriculumProgress.findMany({
      where: { userId: authUser.id },
      select: { rama: true, libro: true, titulo: true, completions: true },
    }),

    prisma.userFlashcardProgress.findMany({
      where: {
        userId: authUser.id,
        lastReviewedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { lastReviewedAt: true },
    }),

    prisma.userMCQAttempt.findMany({
      where: {
        userId: authUser.id,
        attemptedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { attemptedAt: true },
    }),

    prisma.userTrueFalseAttempt.findMany({
      where: {
        userId: authUser.id,
        attemptedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { attemptedAt: true },
    }),

    // ── Gazette-specific ─────────────────────────────────────
    prisma.flashcard.count(),

    prisma.userMCQAttempt.count({
      where: { userId: authUser.id },
    }),

    prisma.userMCQAttempt.count({
      where: { userId: authUser.id, isCorrect: true },
    }),

    prisma.causaRoom.findMany({
      where: { status: { in: ["lobby", "active"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        createdBy: { select: { firstName: true } },
        _count: { select: { participants: true } },
      },
    }),

    prisma.userBadge.findMany({
      where: { userId: authUser.id },
      select: { badge: true, earnedAt: true },
    }),

    prisma.colegaRequest.findMany({
      where: {
        OR: [
          { senderId: authUser.id, status: "ACCEPTED" },
          { receiverId: authUser.id, status: "ACCEPTED" },
        ],
      },
      take: 4,
      orderBy: { updatedAt: "desc" },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    }),

    prisma.ayudantia.findMany({
      where: { isActive: true },
      take: 3,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true } } },
    }),

    // Obiter de la Semana (más citado de los últimos 7 días)
    prisma.obiterDictum.findFirst({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        citasCount: { gte: 1 },
      },
      orderBy: { citasCount: "desc" },
      select: {
        id: true,
        content: true,
        citasCount: true,
        apoyosCount: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),

    // Mi Examen config (para mini-resumen)
    prisma.examenConfig.findUnique({
      where: { userId: authUser.id },
      select: {
        universidad: true,
        sede: true,
        fechaExamen: true,
        parseStatus: true,
        temas: {
          where: { tieneContenido: true },
          select: {
            nombre: true,
            porcentajeAvance: true,
            peso: true,
          },
          orderBy: { porcentajeAvance: "asc" },
        },
      },
    }),

    // ── La Sala resumen ─────────────────────────────────────
    prisma.eventoAcademico.findFirst({
      where: {
        approvalStatus: "aprobado",
        isActive: true,
        isHidden: false,
        fecha: { gte: new Date() },
      },
      orderBy: { fecha: "asc" },
      select: {
        titulo: true,
        fecha: true,
        lugar: true,
        _count: { select: { interesados: true } },
      },
    }),

    prisma.pasantia.count({
      where: {
        isActive: true,
        isHidden: false,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),

    prisma.ayudantia.count({
      where: { isActive: true, isHidden: false },
    }),

    // Expediente Abierto activo
    prisma.expediente.findFirst({
      where: { estado: "abierto", aprobado: true },
      orderBy: { fechaApertura: "desc" },
      select: {
        id: true,
        numero: true,
        titulo: true,
        fechaCierre: true,
        _count: { select: { argumentos: true } },
      },
    }),
  ]);

  // ─── Calcular racha ───────────────────────────────────────
  const streak = calculateStreak(
    reviewDatesRaw.map((r) => r.lastReviewedAt)
  );

  // ─── Calcular progressData ────────────────────────────────
  const flashcardTotalByKey: Record<string, number> = {};
  for (const group of flashcardsByTitulo) {
    const key = progressKey(group.rama, group.libro, group.titulo);
    flashcardTotalByKey[key] = group._count.id;
  }

  const flashcardDominatedByKey: Record<string, number> = {};
  for (const record of dominatedRecords) {
    const { rama, libro, titulo } = record.flashcard;
    const key = progressKey(rama, libro, titulo);
    flashcardDominatedByKey[key] = (flashcardDominatedByKey[key] ?? 0) + 1;
  }

  const completionsByKey: Record<string, number> = {};
  for (const cp of curriculumProgressRecords) {
    const key = progressKey(cp.rama, cp.libro, cp.titulo);
    completionsByKey[key] = cp.completions;
  }

  const allKeys = Array.from(
    new Set([
      ...Object.keys(flashcardTotalByKey),
      ...Object.keys(flashcardDominatedByKey),
      ...Object.keys(completionsByKey),
    ])
  );

  const progressData: ProgressData = {};
  for (const key of allKeys) {
    progressData[key] = {
      completions: completionsByKey[key] ?? 0,
      flashcardTotal: flashcardTotalByKey[key] ?? 0,
      flashcardDominated: flashcardDominatedByKey[key] ?? 0,
      mcqTotal: 0,
      mcqCorrect: 0,
      tfTotal: 0,
      tfCorrect: 0,
    };
  }

  // ─── Progreso por rama para las barras ─────────────────────
  const ramaProgressItems = Object.keys(CURRICULUM).map((ramaKey) => ({
    label: RAMA_LABELS[ramaKey] ?? ramaKey,
    percent: getRamaProgress(progressData, ramaKey),
  }));

  // ─── Construir actividad de 30 días ──────────────────────
  const activityMap: Record<string, number> = {};

  for (const r of flashcardReviews30d) {
    if (r.lastReviewedAt) {
      const key = r.lastReviewedAt.toISOString().slice(0, 10);
      activityMap[key] = (activityMap[key] ?? 0) + 1;
    }
  }
  for (const a of mcqAttempts30d) {
    const key = a.attemptedAt.toISOString().slice(0, 10);
    activityMap[key] = (activityMap[key] ?? 0) + 1;
  }
  for (const a of tfAttempts30d) {
    const key = a.attemptedAt.toISOString().slice(0, 10);
    activityMap[key] = (activityMap[key] ?? 0) + 1;
  }

  const activityDays: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    activityDays.push({ date: key, count: activityMap[key] ?? 0 });
  }

  // ─── Detectar actividad de ayer (para streak detector) ────
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const hadActivityYesterday = (activityMap[yesterdayKey] ?? 0) > 0;

  // ─── Serializar datos gazette ─────────────────────────────
  const mcqPercent =
    mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;

  const serializedRooms = causaRoomsRaw.map((r) => ({
    id: r.id,
    mode: r.mode,
    status: r.status,
    rama: r.rama,
    maxPlayers: r.maxPlayers,
    createdAt: r.createdAt.toISOString(),
    createdBy: r.createdBy,
    _count: r._count,
  }));

  const serializedBadges = userBadgesRaw.map((b) => ({
    badge: b.badge,
    earnedAt: b.earnedAt.toISOString(),
  }));

  const serializedColegas = colegasRaw.map((c) => {
    const other = c.senderId === authUser.id ? c.receiver : c.sender;
    return {
      id: other.id,
      firstName: other.firstName,
      lastName: other.lastName,
      avatarUrl: other.avatarUrl,
    };
  });

  const serializedAyudantias = ayudantiasRaw.map((a) => ({
    id: a.id,
    type: a.type,
    materia: a.materia,
    description: a.description,
    format: a.format,
    priceType: a.priceType,
    priceAmount: a.priceAmount,
    universidad: a.universidad,
    user: a.user,
  }));

  const obiterDeLaSemana = obiterDeLaSemanaRaw
    ? {
        id: obiterDeLaSemanaRaw.id,
        content: obiterDeLaSemanaRaw.content,
        apoyosCount: obiterDeLaSemanaRaw.apoyosCount,
        citasCount: obiterDeLaSemanaRaw.citasCount,
        userName: `${obiterDeLaSemanaRaw.user.firstName} ${obiterDeLaSemanaRaw.user.lastName}`,
      }
    : null;

  // ─── Mi Examen resumen ───────────────────────────────────
  let examenResumen: {
    universidad: string;
    sede: string | null;
    fechaExamen: string | null;
    progresoGlobal: number;
    temaDebil: string | null;
    temaDebilPorcentaje: number | null;
  } | null = null;

  if (examenConfigRaw && examenConfigRaw.parseStatus === "completed" && examenConfigRaw.temas.length > 0) {
    let totalWeight = 0;
    let weightedProgress = 0;
    for (const tema of examenConfigRaw.temas) {
      totalWeight += tema.peso;
      weightedProgress += tema.porcentajeAvance * tema.peso;
    }
    const progresoGlobal = totalWeight > 0 ? Math.round((weightedProgress / totalWeight) * 10) / 10 : 0;
    const weakest = examenConfigRaw.temas[0]; // already sorted by porcentajeAvance asc

    examenResumen = {
      universidad: examenConfigRaw.universidad,
      sede: examenConfigRaw.sede,
      fechaExamen: examenConfigRaw.fechaExamen?.toISOString() ?? null,
      progresoGlobal,
      temaDebil: weakest?.nombre ?? null,
      temaDebilPorcentaje: weakest ? Math.round(weakest.porcentajeAvance) : null,
    };
  }

  // ─── La Sala resumen ─────────────────────────────────────
  const salaResumen = {
    proximoEvento: proximoEventoRaw
      ? {
          titulo: proximoEventoRaw.titulo,
          fecha: proximoEventoRaw.fecha.toISOString(),
          lugar: proximoEventoRaw.lugar,
          interesadosCount: proximoEventoRaw._count.interesados,
        }
      : null,
    pasantiasNuevas: pasantiasNuevasCount,
    ayudantiasActivas: ayudantiasActivasCount,
  };

  // ─── Expediente Abierto ─────────────────────────────────────
  const expedienteActivo = expedienteActivoRaw
    ? {
        id: expedienteActivoRaw.id,
        numero: expedienteActivoRaw.numero,
        titulo: expedienteActivoRaw.titulo,
        fechaCierre: expedienteActivoRaw.fechaCierre.toISOString(),
        _count: expedienteActivoRaw._count,
      }
    : null;

  // ─── Liga resumen ──────────────────────────────────────────
  const ligaMembership = await ensureLeagueMembership(authUser.id);
  const ligaMembers = await prisma.leagueMember.findMany({
    where: { leagueId: ligaMembership.leagueId },
    orderBy: { weeklyXp: "desc" },
    include: { user: { select: { id: true, firstName: true } } },
  });

  const ligaMyPosition = ligaMembers.findIndex((m) => m.user.id === authUser.id) + 1 || null;
  const ligaMyXp = ligaMembers.find((m) => m.user.id === authUser.id)?.weeklyXp ?? 0;
  const ligaTopMembers = ligaMembers.slice(0, 5).map((m, i) => ({
    position: i + 1,
    userId: m.user.id,
    firstName: m.user.firstName,
    weeklyXp: m.weeklyXp,
  }));

  // ─── Render ───────────────────────────────────────────────

  return (
    <main className="gz-page min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      {/* Hide standard dashboard header on this page only */}
      <style
        dangerouslySetInnerHTML={{
          __html: "#dashboard-standard-header { display: none !important; }",
        }}
      />

      <GzMasthead />

      <GzUserBar
        userName={user.firstName}
        avatarUrl={user.avatarUrl}
        streak={streak}
        causasGanadas={user.causasGanadas}
        tasaAcierto={mcqPercent}
      />

      <StreakDetector streak={streak} hadActivityYesterday={hadActivityYesterday} />

      <div className="mx-auto max-w-[1280px] px-4 lg:px-10 py-6 pb-20">
        {/* Onboarding for new users */}
        {user.xp === 0 && masteredCount === 0 && (
          <div className="mb-6">
            <OnboardingCard />
          </div>
        )}

        <GzHeadline
          flashcardsDominated={masteredCount}
          flashcardsTotal={totalFlashcards}
          streak={streak}
          activityDays={activityDays}
        />

        <div className="mt-4 mb-2">
          <GzMiExamenResumen config={examenResumen} />
        </div>

        <GzCausasWire initialRooms={serializedRooms} />

        <GzStudyColumns
          ramaProgressItems={ramaProgressItems}
          flashcardsDominated={masteredCount}
          flashcardsTotal={totalFlashcards}
          mcqCorrect={mcqCorrect}
          mcqTotal={mcqTotal}
          mcqPercent={mcqPercent}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <GzObiterSemana obiter={obiterDeLaSemana} />
          <GzLigaResumen
            tier={ligaMembership.league.tier}
            userGrado={user.grado}
            daysRemaining={getDaysRemaining()}
            userId={authUser.id}
            myPosition={ligaMyPosition}
            myWeeklyXp={ligaMyXp}
            totalMembers={ligaMembers.length}
            topMembers={ligaTopMembers}
          />
        </div>

        <GzCommunity
          badges={serializedBadges}
          colegas={serializedColegas}
          ayudantias={serializedAyudantias}
          userId={authUser.id}
          salaResumen={salaResumen}
          expedienteActivo={expedienteActivo}
        />
      </div>

      <GzFooter />
    </main>
  );
}
