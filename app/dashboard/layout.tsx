import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";
import { Toaster } from "sonner";
import { DashboardHeader } from "./components/dashboard-header";
import { MobileNav } from "./components/mobile-nav";
import { PomodoroPill } from "./components/pomodoro-pill";
import { DiarioFab } from "./components/diario-fab";
import { PomodoroProvider } from "./components/pomodoro-context";

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

  // Queries mínimas para el layout (header)
  const [dbUser, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true, isAdmin: true, avatarUrl: true, examDate: true },
    }),
    ensureLeagueMembership(authUser.id),
  ]);

  if (!dbUser) {
    redirect("/login");
  }

  const tierLabel =
    TIER_LABELS[membership.league.tier] ?? membership.league.tier;
  const tierEmoji = TIER_EMOJIS[membership.league.tier] ?? "";
  const examDateStr = dbUser.examDate?.toISOString() ?? null;

  return (
    <PomodoroProvider>
      <Toaster position="bottom-right" richColors />
      <div id="dashboard-standard-header">
        <DashboardHeader
          userName={dbUser.firstName}
          userId={authUser.id}
          avatarUrl={dbUser.avatarUrl ?? null}
          userTier={tierLabel}
          tierEmoji={tierEmoji}
          isAdmin={dbUser.isAdmin}
          examDate={examDateStr}
        />
      </div>
      <div className="pb-16 lg:pb-0" style={{ backgroundColor: "var(--gz-cream)" }}>{children}</div>
      <MobileNav />
      <PomodoroPill />
      <DiarioFab />
    </PomodoroProvider>
  );
}
