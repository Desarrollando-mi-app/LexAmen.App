import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { HeroCarrusel } from "../components/hero-carrusel";
import { DiarioPageClient } from "./diario-page-client";

export const metadata = {
  title: "Publicaciones — Studio Iuris",
};

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { prefill } = await searchParams;

  // Fetch user info for the Obiter editor
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, avatarUrl: true },
  });

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-8">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1">
          Publicaciones
        </p>
      </div>

      {/* ── Hero carrusel ────────────────────────────────────── */}
      <div className="mb-6 mt-4">
        <HeroCarrusel ubicacion="diario" />
      </div>

      {/* ── Tabbed content ───────────────────────────────────── */}
      <div className="px-4 sm:px-6">
        <Suspense fallback={null}>
          <DiarioPageClient
            userId={authUser.id}
            userFirstName={user?.firstName ?? ""}
            userAvatarUrl={user?.avatarUrl ?? null}
            diarioFeedElement={null}
            prefillText={prefill ?? undefined}
          />
        </Suspense>
      </div>
    </div>
  );
}
