import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getGradoInfo, getSiguienteGrado, getProgresoGrado, NIVELES } from "@/lib/league";

// ─── Streak calculation (same logic as dashboard) ────────────

function calculateStreak(dates: (Date | null)[]): number {
  const daySet = new Set<string>();
  for (const d of dates) {
    if (d) daySet.add(d.toISOString().slice(0, 10));
  }

  if (daySet.size === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().slice(0, 10);

  const cursor = new Date(today);
  if (!daySet.has(todayKey)) {
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

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export const metadata = {
  title: "Mis Estad\u00edsticas \u2014 Studio Iuris",
};

export default async function EstadisticasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const userId = authUser.id;

  // ─── Parallel queries ────────────────────────────────────────
  const [
    user,
    // Content totals
    totalFlashcards,
    totalMCQ,
    totalTrueFalse,
    totalDefiniciones,
    totalFillBlank,
    totalErrorId,
    totalOrderSeq,
    totalMatchCol,
    totalCasoPractico,
    totalDictado,
    totalTimeline,
    // User attempts
    fcReviewed,
    mcqAttempts,
    mcqCorrect,
    tfAttempts,
    tfCorrect,
    defAttempts,
    defCorrect,
    fbAttempts,
    fbCorrect,
    eidAttempts,
    osAttempts,
    osCorrect,
    mcAttempts,
    mcCorrect,
    cpAttempts,
    dictAttempts,
    tlAttempts,
    // Streak data
    reviewDatesRaw,
  ] = await Promise.all([
    // User
    prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, grado: true, firstName: true },
    }),

    // Content totals
    prisma.flashcard.count(),
    prisma.mCQ.count(),
    prisma.trueFalse.count(),
    prisma.definicion.count(),
    prisma.fillBlank.count({ where: { activo: true } }),
    prisma.errorIdentification.count({ where: { activo: true } }),
    prisma.orderSequence.count({ where: { activo: true } }),
    prisma.matchColumns.count({ where: { activo: true } }),
    prisma.casoPractico.count({ where: { activo: true } }),
    prisma.dictadoJuridico.count({ where: { activo: true } }),
    prisma.timeline.count({ where: { activo: true } }),

    // User attempts
    prisma.userFlashcardProgress.count({
      where: { userId, repetitions: { gte: 1 } },
    }),
    prisma.userMCQAttempt.count({ where: { userId } }),
    prisma.userMCQAttempt.count({ where: { userId, isCorrect: true } }),
    prisma.userTrueFalseAttempt.count({ where: { userId } }),
    prisma.userTrueFalseAttempt.count({ where: { userId, isCorrect: true } }),
    prisma.definicionIntento.count({ where: { userId } }),
    prisma.definicionIntento.count({ where: { userId, correcta: true } }),
    prisma.fillBlankAttempt.count({ where: { userId } }),
    prisma.fillBlankAttempt.count({ where: { userId, todosCorrectos: true } }),
    prisma.errorIdentificationAttempt.count({ where: { userId } }),
    prisma.orderSequenceAttempt.count({ where: { userId } }),
    prisma.orderSequenceAttempt.count({ where: { userId, perfecto: true } }),
    prisma.matchColumnsAttempt.count({ where: { userId } }),
    prisma.matchColumnsAttempt.count({ where: { userId, perfecto: true } }),
    prisma.casoPracticoAttempt.count({ where: { userId } }),
    prisma.dictadoAttempt.count({ where: { userId } }),
    prisma.timelineAttempt.count({ where: { userId } }),

    // Streak
    prisma.userFlashcardProgress.findMany({
      where: { userId, lastReviewedAt: { not: null } },
      select: { lastReviewedAt: true },
    }),
  ]);

  if (!user) redirect("/login");

  // ─── Derived stats ──────────────────────────────────────────

  const streak = calculateStreak(reviewDatesRaw.map((r) => r.lastReviewedAt));

  const totalContent =
    totalFlashcards +
    totalMCQ +
    totalTrueFalse +
    totalDefiniciones +
    totalFillBlank +
    totalErrorId +
    totalOrderSeq +
    totalMatchCol +
    totalCasoPractico +
    totalDictado +
    totalTimeline;

  const totalCompleted =
    fcReviewed +
    mcqAttempts +
    tfAttempts +
    defAttempts +
    fbAttempts +
    eidAttempts +
    osAttempts +
    mcAttempts +
    cpAttempts +
    dictAttempts +
    tlAttempts;

  const totalCorrect =
    mcqCorrect + tfCorrect + defCorrect + fbCorrect + osCorrect + mcCorrect;
  const totalGradeable =
    mcqAttempts + tfAttempts + defAttempts + fbAttempts + osAttempts + mcAttempts;
  const accuracyPercent =
    totalGradeable > 0 ? Math.round((totalCorrect / totalGradeable) * 100) : 0;

  // Per-module stats
  const moduleStats: {
    label: string;
    total: number;
    completed: number;
    accuracy: number | null;
  }[] = [
    {
      label: "Flashcards",
      total: totalFlashcards,
      completed: fcReviewed,
      accuracy: null,
    },
    {
      label: "Opci\u00f3n M\u00faltiple",
      total: totalMCQ,
      completed: mcqAttempts,
      accuracy: mcqAttempts > 0 ? Math.round((mcqCorrect / mcqAttempts) * 100) : null,
    },
    {
      label: "Verdadero / Falso",
      total: totalTrueFalse,
      completed: tfAttempts,
      accuracy: tfAttempts > 0 ? Math.round((tfCorrect / tfAttempts) * 100) : null,
    },
    {
      label: "Definiciones",
      total: totalDefiniciones,
      completed: defAttempts,
      accuracy: defAttempts > 0 ? Math.round((defCorrect / defAttempts) * 100) : null,
    },
    {
      label: "Completar Espacios",
      total: totalFillBlank,
      completed: fbAttempts,
      accuracy: fbAttempts > 0 ? Math.round((fbCorrect / fbAttempts) * 100) : null,
    },
    {
      label: "Identificar Errores",
      total: totalErrorId,
      completed: eidAttempts,
      accuracy: null,
    },
    {
      label: "Ordenar Secuencias",
      total: totalOrderSeq,
      completed: osAttempts,
      accuracy: osAttempts > 0 ? Math.round((osCorrect / osAttempts) * 100) : null,
    },
    {
      label: "Relacionar Columnas",
      total: totalMatchCol,
      completed: mcAttempts,
      accuracy: mcAttempts > 0 ? Math.round((mcCorrect / mcAttempts) * 100) : null,
    },
    {
      label: "Casos Pr\u00e1cticos",
      total: totalCasoPractico,
      completed: cpAttempts,
      accuracy: null,
    },
    {
      label: "Dictado Jur\u00eddico",
      total: totalDictado,
      completed: dictAttempts,
      accuracy: null,
    },
    {
      label: "L\u00ednea de Tiempo",
      total: totalTimeline,
      completed: tlAttempts,
      accuracy: null,
    },
  ];

  // ─── Rama totals (from content counts) ──────────────────────

  const [ramaCivil, ramaProcesal, ramaOrganico] = await Promise.all([
    prisma.flashcard.count({ where: { rama: "DERECHO_CIVIL" } }),
    prisma.flashcard.count({ where: { rama: "DERECHO_PROCESAL_CIVIL" } }),
    prisma.flashcard.count({ where: { rama: "DERECHO_ORGANICO" } }),
  ]);

  const ramaBars = [
    { label: "Civil", total: ramaCivil },
    { label: "Procesal", total: ramaProcesal },
    { label: "Org\u00e1nico", total: ramaOrganico },
  ];

  const ramaMax = Math.max(...ramaBars.map((r) => r.total), 1);

  // ─── Grado / XP ─────────────────────────────────────────────

  const gradoInfo = getGradoInfo(user.grado);
  const siguienteGrado = getSiguienteGrado(user.grado);
  const progresoGrado = getProgresoGrado(user.xp, user.grado);
  const nivelInfo = NIVELES[gradoInfo.nivel];

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <main
      className="min-h-screen pb-20"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="px-4 lg:px-10 py-8">
        {/* ─── Header — full bleed ──────────────────────────── */}
        <div className="gz-section-header mb-8">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1">
            Panel de rendimiento
          </p>
          <h1 className="font-cormorant text-[36px] md:text-[44px] font-bold text-gz-ink leading-tight">
            Estad&iacute;sticas
          </h1>
          <div className="mt-2 h-px bg-gz-rule" />
        </div>

        {/* ─── 4 stat cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Contenido total"
            value={totalContent.toLocaleString("es-CL")}
          />
          <StatCard
            label="Ejercicios realizados"
            value={totalCompleted.toLocaleString("es-CL")}
          />
          <StatCard label="% Acierto global" value={`${accuracyPercent}%`} />
          <StatCard
            label="Racha actual"
            value={`${streak} d\u00eda${streak !== 1 ? "s" : ""}`}
          />
        </div>

        {/* ─── Por Modulo table ───────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-cormorant text-[22px] font-bold text-gz-ink whitespace-nowrap">
              Por M&oacute;dulo
            </h2>
            <div className="flex-1 h-px bg-gz-rule" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gz-ink">
                  <th className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light py-2 pr-4">
                    M&oacute;dulo
                  </th>
                  <th className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light py-2 pr-4 text-right">
                    Total
                  </th>
                  <th className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light py-2 pr-4 text-right">
                    Completados
                  </th>
                  <th className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light py-2 text-right">
                    % Acierto
                  </th>
                </tr>
              </thead>
              <tbody>
                {moduleStats.map((mod) => (
                  <tr
                    key={mod.label}
                    className="border-b border-gz-rule last:border-b-0"
                  >
                    <td className="font-archivo text-[13px] text-gz-ink py-2.5 pr-4">
                      {mod.label}
                    </td>
                    <td className="font-ibm-mono text-[13px] text-gz-ink py-2.5 pr-4 text-right">
                      {mod.total.toLocaleString("es-CL")}
                    </td>
                    <td className="font-ibm-mono text-[13px] text-gz-ink py-2.5 pr-4 text-right">
                      {mod.completed.toLocaleString("es-CL")}
                    </td>
                    <td className="font-ibm-mono text-[13px] text-gz-ink py-2.5 text-right">
                      {mod.accuracy !== null ? `${mod.accuracy}%` : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── Por Rama ──────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-cormorant text-[22px] font-bold text-gz-ink whitespace-nowrap">
              Por Rama
            </h2>
            <div className="flex-1 h-px bg-gz-rule" />
          </div>

          <div className="space-y-4">
            {ramaBars.map((rama) => {
              const pct =
                ramaMax > 0 ? Math.round((rama.total / ramaMax) * 100) : 0;
              return (
                <div key={rama.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-archivo text-[13px] font-semibold text-gz-ink">
                      {rama.label}
                    </span>
                    <span className="font-ibm-mono text-[12px] text-gz-ink-light">
                      {rama.total.toLocaleString("es-CL")} ejercicios
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-gz-rule/30 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: "var(--gz-gold, #9a7230)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── XP y Grado ────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-cormorant text-[22px] font-bold text-gz-ink whitespace-nowrap">
              XP y Grado
            </h2>
            <div className="flex-1 h-px bg-gz-rule" />
          </div>

          <div className="rounded-lg border border-gz-rule bg-white/60 p-5">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-[32px]">{gradoInfo.emoji}</span>
              <div>
                <p className="font-cormorant text-[20px] font-bold text-gz-ink leading-tight">
                  {gradoInfo.nombre}
                </p>
                <p className="font-ibm-mono text-[11px] text-gz-ink-light">
                  Grado {gradoInfo.grado} &middot; {nivelInfo.label}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-ibm-mono text-[22px] font-bold text-gz-ink">
                  {user.xp.toLocaleString("es-CL")}
                </p>
                <p className="font-ibm-mono text-[10px] text-gz-ink-light uppercase tracking-[1px]">
                  XP Total
                </p>
              </div>
            </div>

            {siguienteGrado && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-archivo text-[12px] text-gz-ink-light">
                    Siguiente: {siguienteGrado.emoji} {siguienteGrado.nombre}
                  </span>
                  <span className="font-ibm-mono text-[11px] text-gz-ink-light">
                    {progresoGrado}%
                  </span>
                </div>
                <div className="h-3 rounded-full bg-gz-rule/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progresoGrado}%`,
                      backgroundColor: gradoInfo.color,
                    }}
                  />
                </div>
                <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-1 text-right">
                  {siguienteGrado.xpMinimo.toLocaleString("es-CL")} XP requeridos
                </p>
              </div>
            )}

            {!siguienteGrado && (
              <p className="font-archivo text-[13px] text-gz-ink-light italic">
                Has alcanzado el grado m&aacute;ximo.
              </p>
            )}
          </div>
        </section>

        {/* ─── Back link ─────────────────────────────────── */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="font-archivo text-[13px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
          >
            &larr; Volver al dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─── Stat card component (inline, no client needed) ──────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gz-rule bg-white/60 p-4">
      <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
        {label}
      </p>
      <p className="font-ibm-mono text-[24px] font-bold text-gz-ink leading-none">
        {value}
      </p>
    </div>
  );
}
