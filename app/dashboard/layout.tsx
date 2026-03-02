import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureLeagueMembership } from "@/lib/league-assign";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";
import { Toaster } from "sonner";
import { DashboardHeader } from "./components/dashboard-header";
import { MobileNav } from "./components/mobile-nav";

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
      select: { firstName: true, isAdmin: true },
    }),
    ensureLeagueMembership(authUser.id),
  ]);

  if (!dbUser) {
    redirect("/login");
  }

  const tierLabel =
    TIER_LABELS[membership.league.tier] ?? membership.league.tier;
  const tierEmoji = TIER_EMOJIS[membership.league.tier] ?? "";

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <DashboardHeader
        userName={dbUser.firstName}
        userTier={tierLabel}
        tierEmoji={tierEmoji}
        isAdmin={dbUser.isAdmin}
      />
      <div className="pb-16 lg:pb-0">{children}</div>
      <MobileNav />
    </>
  );
}
