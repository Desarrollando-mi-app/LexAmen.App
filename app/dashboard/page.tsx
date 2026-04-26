import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { progressKey } from "@/lib/progress-utils";
import { checkStreakPenalty } from "@/lib/xp-config";
import { noticiasVigentesWhere } from "@/lib/noticias-ttl";
import type { ProgressData } from "./components/curriculum-progress";
// getGradoInfo moved to layout.tsx

import { GzPanelHero } from "./components/gz-panel-hero";
import { GzCausasWire } from "./components/gz-causas-wire";
import { GzModulosGrid } from "./components/gz-modulos-grid";
import { GzCommunity } from "./components/gz-community";
import { GzObiterSemana } from "./components/gz-obiter-semana";
import { GzMiExamenResumen } from "./components/gz-mi-examen-resumen";
import { GzLigaResumen } from "./components/gz-liga-resumen";
import { OnboardingCard } from "./components/onboarding-card";
import { OnboardingWizard } from "./components/onboarding-wizard";
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

// ─── Página principal ────────────────────────────────────

export default async function DashboardPage() {
  const perfStart = Date.now();
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
  // Ventana de 42 días (6 semanas) para alimentar el activity strip del hero.
  const THIRTY_DAYS_AGO = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);
  const [
    masteredCount,
    reviewDatesRaw,
    flashcardsByTitulo,
    dominatedRecords,
    curriculumProgressRecords,
    flashcardReviews30d,
    mcqAttempts30d,
    tfAttempts30d,
    // Módulos adicionales para actividad + racha
    defAttempts30d,
    fbAttempts30d,
    eiAttempts30d,
    osAttempts30d,
    mcAttempts30d,
    cpAttempts30d,
    dictAttempts30d,
    tlAttempts30d,
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
    // Noticias jurídicas
    noticiasJuridicasRaw,
  ] = await Promise.all([
    // "Flashcards estudiadas" — al menos una revisión con respuesta (repetitions >= 1)
    prisma.userFlashcardProgress.count({
      where: { userId: authUser.id, repetitions: { gte: 1 } },
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
      where: { userId: authUser.id, repetitions: { gte: 1 } },
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
        lastReviewedAt: { gte: THIRTY_DAYS_AGO },
      },
      select: { lastReviewedAt: true },
    }),

    prisma.userMCQAttempt.findMany({
      where: {
        userId: authUser.id,
        attemptedAt: { gte: THIRTY_DAYS_AGO },
      },
      select: { attemptedAt: true },
    }),

    prisma.userTrueFalseAttempt.findMany({
      where: {
        userId: authUser.id,
        attemptedAt: { gte: THIRTY_DAYS_AGO },
      },
      select: { attemptedAt: true },
    }),

    // ── Módulos adicionales para actividad + racha ───────────
    prisma.definicionIntento.findMany({
      where: { userId: authUser.id, createdAt: { gte: THIRTY_DAYS_AGO } },
      select: { createdAt: true },
    }),
    prisma.fillBlankAttempt.findMany({
      where: { userId: authUser.id, createdAt: { gte: THIRTY_DAYS_AGO } },
      select: { createdAt: true },
    }),
    prisma.errorIdentificationAttempt.findMany({
      where: { userId: authUser.id, createdAt: { gte: THIRTY_DAYS_AGO } },
      select: { createdAt: true },
    }),
    prisma.orderSequenceAttempt.findMany({
      where: { userId: authUser.id, createdAt: { gte: THIRTY_DAYS_AGO } },
      select: { createdAt: true },
    }),
    prisma.matchColumnsAttempt.findMany({
      where: { userId: authUser.id, createdAt: { gte: THIRTY_DAYS_AGO } },
      select: { createdAt: true },
    }),
    prisma.casoPracticoAttempt.findMany({
      where: { userId: authUser.id, createdAt: { gte: THIRTY_DAYS_AGO } },
      select: { createdAt: true },
    }),
    prisma.dictadoAttempt.findMany({
      where: { userId: authUser.id, createdAt: { gte: THIRTY_DAYS_AGO } },
      select: { createdAt: true },
    }),
    prisma.timelineAttempt.findMany({
      where: { userId: authUser.id, createdAt: { gte: THIRTY_DAYS_AGO } },
      select: { createdAt: true },
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

    // Noticias jurídicas recientes (TTL 48h)
    prisma.noticiaJuridica.findMany({
      where: noticiasVigentesWhere(),
      orderBy: { fechaAprobacion: "desc" },
      take: 3,
      select: {
        id: true,
        titulo: true,
        fuente: true,
        fuenteNombre: true,
        urlFuente: true,
        fechaAprobacion: true,
      },
    }),
  ]);

  // ─── Calcular racha — considera actividad en CUALQUIER módulo ──
  // Recoge todas las fechas de los últimos 30 días (todos los módulos)
  // + las fechas históricas de flashcards para detectar rachas largas.
  const allStreakDates: (Date | null)[] = [
    ...reviewDatesRaw.map((r) => r.lastReviewedAt),
    ...mcqAttempts30d.map((a) => a.attemptedAt),
    ...tfAttempts30d.map((a) => a.attemptedAt),
    ...defAttempts30d.map((a) => a.createdAt),
    ...fbAttempts30d.map((a) => a.createdAt),
    ...eiAttempts30d.map((a) => a.createdAt),
    ...osAttempts30d.map((a) => a.createdAt),
    ...mcAttempts30d.map((a) => a.createdAt),
    ...cpAttempts30d.map((a) => a.createdAt),
    ...dictAttempts30d.map((a) => a.createdAt),
    ...tlAttempts30d.map((a) => a.createdAt),
  ];
  const streak = calculateStreak(allStreakDates);

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

  // ─── Construir actividad de 42 días ──────────────────────
  // Ahora considera los 11 módulos: Flashcards + MCQ + V/F + Definiciones +
  // FillBlank + ErrorIdentification + OrderSequence + MatchColumns +
  // CasoPractico + Dictado + Timeline
  const activityMap: Record<string, number> = {};
  const addToMap = (date: Date | null | undefined) => {
    if (!date) return;
    const key = date.toISOString().slice(0, 10);
    activityMap[key] = (activityMap[key] ?? 0) + 1;
  };
  for (const r of flashcardReviews30d) addToMap(r.lastReviewedAt);
  for (const a of mcqAttempts30d) addToMap(a.attemptedAt);
  for (const a of tfAttempts30d) addToMap(a.attemptedAt);
  for (const a of defAttempts30d) addToMap(a.createdAt);
  for (const a of fbAttempts30d) addToMap(a.createdAt);
  for (const a of eiAttempts30d) addToMap(a.createdAt);
  for (const a of osAttempts30d) addToMap(a.createdAt);
  for (const a of mcAttempts30d) addToMap(a.createdAt);
  for (const a of cpAttempts30d) addToMap(a.createdAt);
  for (const a of dictAttempts30d) addToMap(a.createdAt);
  for (const a of tlAttempts30d) addToMap(a.createdAt);

  const activityDays: Array<{ date: string; count: number }> = [];
  for (let i = 41; i >= 0; i--) {
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

  // ─── Noticias jurídicas ─────────────────────────────────────
  const noticiasJuridicas = noticiasJuridicasRaw.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    fuente: n.fuente,
    fuenteNombre: n.fuenteNombre,
    urlFuente: n.urlFuente,
    fechaAprobacion: n.fechaAprobacion?.toISOString() ?? null,
  }));

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

  // ─── Onboarding check ──────────────────────────────────────
  if (!user.onboardingCompleted) {
    // Get a simple flashcard for the wizard step 4
    const sampleFc = await prisma.flashcard.findFirst({
      where: { dificultad: "BASICO" },
      select: { id: true, front: true, back: true, rama: true },
    });
    const sampleFlashcard = sampleFc
      ? { id: sampleFc.id, question: sampleFc.front, answer: sampleFc.back, rama: sampleFc.rama }
      : null;

    return (
      <OnboardingWizard
        userName={user.firstName}
        initialEtapa={user.etapaActual}
        initialUniversidad={user.universidad}
        initialSede={user.sede}
        flashcard={sampleFlashcard}
      />
    );
  }

  // ─── Render ───────────────────────────────────────────────
  console.log("[PERF] Dashboard:", Date.now() - perfStart, "ms");

  return (
    <main>
      <StreakDetector streak={streak} hadActivityYesterday={hadActivityYesterday} />

      <div className="mx-auto max-w-[1280px] px-4 lg:px-10 py-6 pb-20">
        {/* Onboarding for new users */}
        {user.xp === 0 && masteredCount === 0 && (
          <div className="mb-6">
            <OnboardingCard />
          </div>
        )}

        <GzPanelHero
          userName={user.firstName}
          flashcardsDominated={masteredCount}
          flashcardsTotal={totalFlashcards}
          streak={streak}
          xp={user.xp}
          activityDays={activityDays}
          examDays={
            examenResumen?.fechaExamen
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(examenResumen.fechaExamen).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )
              : null
          }
        />

        <div className="mb-6">
          <GzMiExamenResumen config={examenResumen} />
        </div>

        <GzCausasWire initialRooms={serializedRooms} />

        <GzModulosGrid
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

        {/* ─── Noticias Jurídicas mini-widget ─── */}
        {noticiasJuridicas.length > 0 && (
          <section className="relative mt-7 bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
            <div className="h-[3px] w-full bg-gradient-to-r from-gz-navy via-gz-gold to-gz-burgundy" />
            <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-gz-navy" />
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
                  La Gaceta · Noticias Jurídicas
                </p>
              </div>
              <Link
                href="/dashboard/noticias"
                className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold hover:text-gz-burgundy transition-colors"
              >
                Ver todas →
              </Link>
            </div>
            <div className="divide-y divide-gz-rule/40">
              {noticiasJuridicas.map((n, idx) => {
                const isInternal = n.fuente === "STUDIO_IURIS";
                return (
                  <a
                    key={n.id}
                    href={isInternal ? `/dashboard/noticias/${n.id}` : n.urlFuente}
                    target={isInternal ? undefined : "_blank"}
                    rel={isInternal ? undefined : "noopener noreferrer"}
                    className="group flex items-start gap-4 px-5 py-3.5 hover:bg-gz-cream-dark/20 transition-colors"
                  >
                    <span className="font-cormorant text-[18px] font-bold text-gz-gold/60 leading-none w-5 shrink-0 group-hover:text-gz-burgundy transition-colors">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-cormorant text-[17px] font-bold text-gz-ink leading-snug mb-1 line-clamp-2 group-hover:text-gz-burgundy transition-colors">
                        {n.titulo}
                      </h4>
                      <div className="flex items-center gap-2 font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                        <span>{n.fuenteNombre}</span>
                        {n.fechaAprobacion && (
                          <>
                            <span className="text-gz-rule-dark">·</span>
                            <span>
                              {new Date(n.fechaAprobacion).toLocaleDateString("es-CL", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="font-archivo text-[11px] font-semibold text-gz-gold opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0 mt-1">
                      Leer →
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
