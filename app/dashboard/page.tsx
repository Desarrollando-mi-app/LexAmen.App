import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./logout-button";
import { CurriculumProgress } from "./components/curriculum-progress";
import type { ProgressData } from "./components/curriculum-progress";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { TIER_LABELS, TIER_EMOJIS, getDaysRemaining } from "@/lib/league";
import { SidebarCausas } from "./components/sidebar-causas";
import { SidebarLiga } from "./components/sidebar-liga";
import { CollapsibleSection } from "./components/collapsible-section";

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

  const displayName = user.firstName ?? user.email;

  // ─── Liga (lazy assignment) ──────────────────────────────
  const leagueMembership = await ensureLeagueMembership(authUser.id);
  const tierLabel =
    TIER_LABELS[leagueMembership.league.tier] ?? leagueMembership.league.tier;
  const tierEmoji = TIER_EMOJIS[leagueMembership.league.tier] ?? "";
  const daysRemaining = getDaysRemaining();

  // ─── Consultas de estadísticas (en paralelo) ──────────────
  const [
    masteredCount,
    reviewDatesRaw,
    pendingFlashcards,
    flashcardsBySubmateria,
    dominatedRecords,
    curriculumProgressRecords,
    mcqCount,
    tfCount,
    // Sidebar causas
    pendingCausasDetailed,
    activeCausasDetailed,
    historyCausas,
    // Sidebar liga
    leagueMembers,
  ] = await Promise.all([
    // 1. Flashcards dominadas
    prisma.userFlashcardProgress.count({
      where: { userId: authUser.id, repetitions: { gte: 3 } },
    }),

    // 2. Fechas de revisión para racha
    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id, lastReviewedAt: { not: null } },
      select: { lastReviewedAt: true },
    }),

    // 3. Flashcards pendientes hoy
    prisma.flashcard.count({
      where: {
        OR: [
          { progress: { none: { userId: authUser.id } } },
          {
            progress: {
              some: {
                userId: authUser.id,
                nextReviewAt: { lte: new Date() },
              },
            },
          },
        ],
      },
    }),

    // 4. Total flashcards por submateria
    prisma.flashcard.groupBy({
      by: ["submateria"],
      _count: { id: true },
    }),

    // 5. Flashcards dominadas por submateria
    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id, repetitions: { gte: 3 } },
      select: { flashcard: { select: { submateria: true } } },
    }),

    // 6. CurriculumProgress (vueltas)
    prisma.curriculumProgress.findMany({
      where: { userId: authUser.id },
      select: { submateria: true, completions: true },
    }),

    // 7. MCQs disponibles
    prisma.mCQ.count(),

    // 8. V/F disponibles
    prisma.trueFalse.count(),

    // 9. Causas pendientes con detalles (sidebar)
    prisma.causa.findMany({
      where: { challengedId: authUser.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        challenger: { select: { firstName: true, lastName: true } },
      },
    }),

    // 10. Causas activas con detalles (sidebar)
    prisma.causa.findMany({
      where: {
        OR: [
          { challengerId: authUser.id },
          { challengedId: authUser.id },
        ],
        status: "ACTIVE",
      },
      orderBy: { startedAt: "desc" },
      include: {
        challenger: {
          select: { id: true, firstName: true, lastName: true },
        },
        challenged: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),

    // 11. Historial causas últimas 5 (sidebar)
    prisma.causa.findMany({
      where: {
        OR: [
          { challengerId: authUser.id },
          { challengedId: authUser.id },
        ],
        status: { in: ["COMPLETED", "REJECTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        challenger: {
          select: { id: true, firstName: true, lastName: true },
        },
        challenged: {
          select: { id: true, firstName: true, lastName: true },
        },
        winner: { select: { id: true } },
      },
    }),

    // 12. Liga: todos los miembros (sidebar)
    prisma.leagueMember.findMany({
      where: { leagueId: leagueMembership.leagueId },
      orderBy: { weeklyXp: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  // ─── Derivar counts para badges ───────────────────────────
  const pendingCausas = pendingCausasDetailed.length;
  const activeCausas = activeCausasDetailed.length;

  // ─── Serializar datos para sidebars ───────────────────────
  const serializedPending = pendingCausasDetailed.map((c) => ({
    id: c.id,
    challengerName: `${c.challenger.firstName} ${c.challenger.lastName}`,
    createdAt: c.createdAt.toISOString(),
  }));

  const serializedActive = activeCausasDetailed.map((c) => {
    const opponent =
      c.challengerId === authUser.id ? c.challenged : c.challenger;
    return {
      id: c.id,
      opponentName: `${opponent.firstName} ${opponent.lastName}`,
      startedAt: c.startedAt?.toISOString() ?? "",
    };
  });

  const serializedHistory = historyCausas.map((c) => {
    const opponent =
      c.challengerId === authUser.id ? c.challenged : c.challenger;
    return {
      id: c.id,
      opponentName: `${opponent.firstName} ${opponent.lastName}`,
      status: c.status,
      won: c.winner?.id === authUser.id,
      lost: c.winner !== null && c.winner.id !== authUser.id,
      createdAt: c.createdAt.toISOString(),
    };
  });

  const serializedLeagueMembers = leagueMembers.map((m, idx) => ({
    position: idx + 1,
    userId: m.user.id,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    weeklyXp: m.weeklyXp,
  }));

  // ─── Calcular racha ───────────────────────────────────────
  const streak = calculateStreak(
    reviewDatesRaw.map((r) => r.lastReviewedAt)
  );

  // ─── Calcular progressData ────────────────────────────────
  const dominatedBySubmateria: Record<string, number> = {};
  for (const record of dominatedRecords) {
    const sub = record.flashcard.submateria;
    dominatedBySubmateria[sub] = (dominatedBySubmateria[sub] ?? 0) + 1;
  }

  const totalBySubmateria: Record<string, number> = {};
  for (const group of flashcardsBySubmateria) {
    totalBySubmateria[group.submateria] = group._count.id;
  }

  const completionsBySubmateria: Record<string, number> = {};
  for (const cp of curriculumProgressRecords) {
    completionsBySubmateria[cp.submateria] = cp.completions;
  }

  const allSubmaterias = Array.from(
    new Set([
      ...Object.keys(totalBySubmateria),
      ...Object.keys(dominatedBySubmateria),
      ...Object.keys(completionsBySubmateria),
    ])
  );

  const progressData: ProgressData = {};
  for (const sub of allSubmaterias) {
    progressData[sub] = {
      total: totalBySubmateria[sub] ?? 0,
      dominated: dominatedBySubmateria[sub] ?? 0,
      completions: completionsBySubmateria[sub] ?? 0,
    };
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-2">
          <h1 className="text-xl font-bold text-navy">LéxAmen</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/liga"
              className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold hover:bg-gold/25 transition-colors"
            >
              {tierEmoji} {tierLabel}
            </Link>
            <span className="text-sm text-navy/70">{displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* ─── 3-column body ─────────────────────────────────── */}
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6">
        {/* LEFT: Causas sidebar — hidden below lg */}
        <aside className="hidden lg:block w-[280px] shrink-0">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <SidebarCausas
              pending={serializedPending}
              active={serializedActive}
              history={serializedHistory}
            />
          </div>
        </aside>

        {/* CENTER */}
        <div className="min-w-0 flex-1">
          {/* Saludo */}
          <h2 className="text-2xl font-bold text-navy">
            Hola, {user.firstName ?? "estudiante"}
          </h2>
          <p className="mt-1 text-navy/60">¿Qué quieres estudiar hoy?</p>

          {/* ─── Estadísticas ─────────────────────────────── */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              }
              value={masteredCount}
              label="Dominadas"
              accent="text-gold"
            />
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
                </svg>
              }
              value={streak > 0 ? `${streak} día${streak !== 1 ? "s" : ""}` : "0"}
              label="Racha"
              accent="text-orange-500"
            />
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              }
              value={pendingFlashcards}
              label="Pendientes"
              accent="text-navy"
            />
            <StatCard
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              }
              value={user.xp}
              label="XP Total"
              accent="text-gold"
            />
          </div>

          {/* ─── Notificación causas — solo mobile/tablet ── */}
          {pendingCausas > 0 && (
            <div className="lg:hidden">
              <Link
                href="/dashboard/causas"
                className="mt-6 flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-5 py-4 transition-shadow hover:shadow-md"
              >
                <span className="text-2xl">⚔️</span>
                <div className="flex-1">
                  <p className="font-semibold text-navy">
                    {pendingCausas} reto{pendingCausas !== 1 ? "s" : ""} pendiente{pendingCausas !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-navy/60">
                    Alguien te ha desafiado a una causa
                  </p>
                </div>
                <span className="text-sm font-semibold text-gold">Ver &rarr;</span>
              </Link>
            </div>
          )}

          {/* ─── Entrenamiento (colapsable) ───────────────── */}
          <div className="mt-10">
            <CollapsibleSection title="Entrenamiento" defaultOpen={true}>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <DashboardCard
                  title="Flashcards"
                  description="Repasa conceptos clave con tarjetas inteligentes"
                  emoji="📇"
                  href="/dashboard/flashcards"
                  badge={
                    pendingFlashcards > 0
                      ? `${pendingFlashcards} pendiente${pendingFlashcards !== 1 ? "s" : ""}`
                      : undefined
                  }
                />
                <DashboardCard
                  title="Preguntas MCQ"
                  description="Practica con preguntas de selección múltiple"
                  emoji="✅"
                  href="/dashboard/mcq"
                  badge={
                    mcqCount > 0
                      ? `${mcqCount} disponible${mcqCount !== 1 ? "s" : ""}`
                      : undefined
                  }
                />
                <DashboardCard
                  title="Verdadero/Falso"
                  description="Evalúa afirmaciones de derecho"
                  emoji="⚖️"
                  href="/dashboard/truefalse"
                  badge={
                    tfCount > 0
                      ? `${tfCount} disponible${tfCount !== 1 ? "s" : ""}`
                      : undefined
                  }
                />
              </div>
            </CollapsibleSection>
          </div>

          {/* ─── Mobile: Liga + Causas links ─────────────── */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:hidden">
            <Link
              href="/dashboard/liga"
              className="rounded-xl border border-border bg-white p-4 text-center transition-shadow hover:shadow-md"
            >
              <span className="text-2xl">🏆</span>
              <p className="mt-1 text-sm font-semibold text-navy">Liga</p>
              <p className="text-xs text-navy/50">{tierEmoji} {tierLabel}</p>
            </Link>
            <Link
              href="/dashboard/causas"
              className="rounded-xl border border-border bg-white p-4 text-center transition-shadow hover:shadow-md"
            >
              <span className="text-2xl">⚔️</span>
              <p className="mt-1 text-sm font-semibold text-navy">Causas</p>
              {activeCausas > 0 && (
                <p className="text-xs text-gold">{activeCausas} activa{activeCausas !== 1 ? "s" : ""}</p>
              )}
            </Link>
          </div>

          {/* ─── Progreso curricular ─────────────────────── */}
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-navy">
              Tu progreso curricular
            </h3>
            <div className="mt-4">
              <CurriculumProgress progressData={progressData} />
            </div>
          </div>
        </div>

        {/* RIGHT: Liga sidebar — hidden below lg */}
        <aside className="hidden lg:block w-[260px] shrink-0">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            <SidebarLiga
              tierLabel={tierLabel}
              tierEmoji={tierEmoji}
              daysRemaining={daysRemaining}
              userId={authUser.id}
              members={serializedLeagueMembers}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}

// ─── Componentes internos ────────────────────────────────

function StatCard({
  icon,
  value,
  label,
  accent = "text-gold",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className={`mb-3 ${accent}`}>{icon}</div>
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="mt-0.5 text-sm text-navy/50">{label}</p>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  emoji,
  href,
  badge,
}: {
  title: string;
  description: string;
  emoji: string;
  href?: string;
  badge?: string;
}) {
  const content = (
    <div className="cursor-pointer rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-3 text-3xl">{emoji}</div>
      <h3 className="text-lg font-semibold text-navy">{title}</h3>
      <p className="mt-1 text-sm text-navy/60">{description}</p>
      {badge && (
        <span className="mt-3 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
          {badge}
        </span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
