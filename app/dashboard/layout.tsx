import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { getGradoInfo } from "@/lib/league";
// ensureLeagueMembership is needed to auto-assign league on first visit
import { Toaster } from "sonner";
import { BETA_MODE } from "@/lib/config";
import { BetaBanner } from "./components/beta-banner";
import { GzMasthead } from "./components/gz-masthead";
import { GzUserBar } from "./components/gz-user-bar";
import { GzFooter } from "./components/gz-footer";
import { MobileNav } from "./components/mobile-nav";
import { PomodoroPill } from "./components/pomodoro-pill";
import { ThemePill } from "./components/theme-pill";
import { DiarioFab } from "./components/diario-fab";
import { PomodoroProvider } from "./components/pomodoro-context";
import { XpFloatProvider } from "./components/xp-float-provider";
import { BadgeModalProvider } from "./components/badge-modal-provider";
import { GradoChangeDetector } from "./components/grado-change-detector";

// ─── Streak calculation (lightweight) ────────────────────────
function calculateStreak(dates: (Date | null)[]): number {
  const daySet = new Set<string>();
  for (const d of dates) {
    if (d) daySet.add(d.toISOString().slice(0, 10));
  }
  if (daySet.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today);
  const todayKey = today.toISOString().slice(0, 10);
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Queries for layout (masthead + user bar)
  const [dbUser, , reviewDates, mcqTotal, mcqCorrect] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          firstName: true,
          isAdmin: true,
          avatarUrl: true,
          examDate: true,
          grado: true,
          causasGanadas: true,
          email: true,
        },
      }),
      ensureLeagueMembership(authUser.id),
      // Streak: last 60 days of activity
      prisma.userFlashcardProgress.findMany({
        where: { userId: authUser.id, lastReviewedAt: { not: null } },
        select: { lastReviewedAt: true },
      }),
      // MCQ accuracy
      prisma.userMCQAttempt.count({ where: { userId: authUser.id } }),
      prisma.userMCQAttempt.count({
        where: { userId: authUser.id, isCorrect: true },
      }),
    ]);

  if (!dbUser) {
    redirect("/login");
  }

  const streak = calculateStreak(reviewDates.map((r) => r.lastReviewedAt));
  const mcqPercent =
    mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;
  const gradoInfo = getGradoInfo(dbUser.grado);

  return (
    <PomodoroProvider>
      <XpFloatProvider>
        <BadgeModalProvider>
          <Toaster position="bottom-right" richColors />
          <div
            className="gz-page min-h-screen"
            style={{ backgroundColor: "var(--gz-cream)" }}
          >
            {/* Beta banner — visible mientras BETA_MODE sea true */}
            {BETA_MODE && <BetaBanner />}

            {/* Gazette masthead — visible on all dashboard pages */}
            <GzMasthead userId={authUser.id} />
            <GzUserBar
              userName={dbUser.firstName}
              email={dbUser.email ?? authUser.email ?? ""}
              avatarUrl={dbUser.avatarUrl}
              streak={streak}
              causasGanadas={dbUser.causasGanadas}
              tasaAcierto={mcqPercent}
              grado={dbUser.grado}
              gradoNombre={gradoInfo.nombre}
              isAdmin={dbUser.isAdmin}
              userId={authUser.id}
            />

            {/* Page content with ad sidebars */}
            <div className="flex pb-16 lg:pb-0">
              {/* Left ad sidebar — desktop XL only */}
              <aside className="hidden xl:block w-[160px] shrink-0 px-2 py-6">
                <div className="sticky top-[120px]">
                  <div className="h-[600px] rounded-[3px] border border-dashed border-gz-rule/40 flex items-center justify-center">
                    <span className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light/30 -rotate-90 whitespace-nowrap">
                      Espacio publicitario
                    </span>
                  </div>
                </div>
              </aside>

              {/* Main content */}
              <div className="flex-1 min-w-0">{children}</div>

              {/* Right ad sidebar — desktop XL only */}
              <aside className="hidden xl:block w-[160px] shrink-0 px-2 py-6">
                <div className="sticky top-[120px]">
                  <div className="h-[600px] rounded-[3px] border border-dashed border-gz-rule/40 flex items-center justify-center">
                    <span className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light/30 -rotate-90 whitespace-nowrap">
                      Espacio publicitario
                    </span>
                  </div>
                </div>
              </aside>
            </div>

            {/* Footer */}
            <GzFooter />
          </div>
          <MobileNav userId={authUser.id} />
          <PomodoroPill />
          <ThemePill />
          <DiarioFab />
          <GradoChangeDetector userGrado={dbUser.grado} />
        </BadgeModalProvider>
      </XpFloatProvider>
    </PomodoroProvider>
  );
}
