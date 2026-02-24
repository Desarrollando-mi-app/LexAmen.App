import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./logout-button";

// ─── Mapeo de submaterias a español ──────────────────────

const SUBMATERIA_LABELS: Record<string, string> = {
  ACTO_JURIDICO: "Acto Jurídico",
  OBLIGACIONES: "Obligaciones",
  CONTRATOS: "Contratos",
  BIENES: "Bienes",
  JURISDICCION: "Jurisdicción",
  COMPETENCIA: "Competencia",
  JUICIO_ORDINARIO: "Juicio Ordinario",
  RECURSOS: "Recursos",
  JUICIO_EJECUTIVO: "Juicio Ejecutivo",
};

const PLAN_LABELS: Record<string, string> = {
  FREE: "Gratuito",
  PREMIUM_MONTHLY: "Premium",
  PREMIUM_ANNUAL: "Premium",
};

// ─── Cálculo de racha ────────────────────────────────────

function calculateStreak(dates: (Date | null)[]): number {
  // Extraer días únicos como "YYYY-MM-DD"
  const daySet = new Set<string>();
  for (const d of dates) {
    if (d) {
      const key = d.toISOString().slice(0, 10);
      daySet.add(key);
    }
  }

  if (daySet.size === 0) return 0;

  // Partir desde hoy e ir restando días
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayKey = today.toISOString().slice(0, 10);

  // Si hoy no estudió, empezar desde ayer
  const cursor = new Date(today);
  if (!daySet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(cursor.toISOString().slice(0, 10))) {
      return 0; // Ni hoy ni ayer
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

  // ─── Consultas de estadísticas (en paralelo) ──────────

  const [
    masteredCount,
    reviewDatesRaw,
    pendingFlashcards,
    flashcardsBySubmateria,
    userProgressRecords,
  ] = await Promise.all([
    // 1. Flashcards dominadas (repetitions >= 3)
    prisma.userFlashcardProgress.count({
      where: { userId: authUser.id, repetitions: { gte: 3 } },
    }),

    // 2. Fechas de revisión para calcular racha
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

    // 5. Progreso del usuario con submateria de la flashcard
    prisma.userFlashcardProgress.findMany({
      where: { userId: authUser.id },
      select: { flashcard: { select: { submateria: true } } },
    }),
  ]);

  // Calcular racha
  const streak = calculateStreak(
    reviewDatesRaw.map((r) => r.lastReviewedAt)
  );

  // Calcular progreso por submateria
  const reviewedBySubmateria: Record<string, number> = {};
  for (const record of userProgressRecords) {
    const sub = record.flashcard.submateria;
    reviewedBySubmateria[sub] = (reviewedBySubmateria[sub] ?? 0) + 1;
  }

  const submateriaProgress = flashcardsBySubmateria.map((group) => ({
    submateria: group.submateria,
    label: SUBMATERIA_LABELS[group.submateria] ?? group.submateria,
    total: group._count.id,
    reviewed: reviewedBySubmateria[group.submateria] ?? 0,
  }));

  // Plan label
  const planLabel = PLAN_LABELS[user.plan] ?? user.plan;
  const isPremium = user.plan !== "FREE";

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold text-navy">LéxAmen</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-navy/70">{displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="mx-auto max-w-5xl px-6 py-10">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            }
            value={planLabel}
            label="Plan"
            accent={isPremium ? "text-green-500" : "text-gold"}
          />
        </div>

        {/* ─── Progreso por materia ─────────────────────── */}
        {submateriaProgress.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-navy">
              Tu progreso por materia
            </h3>
            <div className="mt-4 space-y-4">
              {submateriaProgress.map((sp) => (
                <ProgressBar
                  key={sp.submateria}
                  label={sp.label}
                  reviewed={sp.reviewed}
                  total={sp.total}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── Módulos de estudio ──────────────────────── */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-navy">
            Módulos de estudio
          </h3>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
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
            />
            <DashboardCard
              title="Simulacro"
              description="Simula un examen real con tiempo"
              emoji="⏱️"
            />
            <DashboardCard
              title="Mi Progreso"
              description="Revisa tu avance y estadísticas"
              emoji="📊"
            />
          </div>
        </div>
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

function ProgressBar({
  label,
  reviewed,
  total,
}: {
  label: string;
  reviewed: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((reviewed / total) * 100) : 0;
  const isComplete = percent === 100;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-navy">{label}</span>
        <span className="text-xs text-navy/50">
          {reviewed}/{total} · {percent}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-border/30">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete ? "bg-green-500" : "bg-gold"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
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
