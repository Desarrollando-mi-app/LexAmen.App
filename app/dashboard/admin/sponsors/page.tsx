import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SponsorsAdmin } from "./sponsors-admin";

export default async function SponsorsPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) redirect("/dashboard");

  const sponsors = await prisma.sponsorBanner.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* ─── Admin nav ─── */}
        <div className="flex items-center gap-4 mb-6 border-b border-gz-rule pb-4">
          <span className="font-cormorant text-2xl font-bold text-gz-ink">Admin</span>
          <Link
            href="/dashboard/admin"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Notificaciones
          </Link>
          <Link
            href="/dashboard/admin/sponsors"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Sponsors
          </Link>
        </div>

        <SponsorsAdmin
          initialSponsors={sponsors.map((s) => ({
            ...s,
            fechaInicio: s.fechaInicio.toISOString(),
            fechaFin: s.fechaFin?.toISOString() ?? null,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
