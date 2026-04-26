import { redirect } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
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

  // Fecha en formato editorial (estilo periódico)
  const fechaHoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="px-4 sm:px-6 lg:px-10 pt-7 pb-2 max-w-[1480px] mx-auto">
        {/* ═══ MASTHEAD EDITORIAL — estilo periódico ═══════════════ */}
        <div className="gz-section-header relative mb-5">
          {/* Línea editorial superior fina */}
          <div className="h-px bg-gz-ink/35 mb-3" />

          {/* Fila superior: fecha + edición + número */}
          <div className="hidden sm:flex items-center justify-between font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-mid mb-3">
            <span className="capitalize">{fechaHoy}</span>
            <span className="text-gz-gold">— Diario de Studio Iuris —</span>
            <span>Edición digital · Vol. I</span>
          </div>

          {/* Bloque principal: sello + título grande */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center gap-4">
              <Image
                src="/brand/logo-sello.svg"
                alt="Studio Iuris"
                width={80}
                height={80}
                className="h-[58px] w-[58px] sm:h-[78px] sm:w-[78px] shrink-0"
              />
              <h1 className="font-cormorant text-[44px] sm:text-[64px] lg:text-[78px] font-bold text-gz-ink leading-[0.92] tracking-tight">
                Publi<span className="text-gz-burgundy italic">caciones</span>
              </h1>
            </div>
            <p className="font-cormorant italic text-[15px] sm:text-[17px] text-gz-ink-mid max-w-[640px]">
              Obiter dictum, análisis de sentencias, ensayos y debates — la
              tribuna abierta del estudio jurídico.
            </p>
          </div>

          {/* Triple regla editorial */}
          <div className="mt-5 h-[3px] bg-gz-ink/85" />
          <div className="h-px bg-gz-ink/85 mt-[2px]" />
          <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
        </div>

        {/* ═══ Hero carrusel ═══════════════════════════════════════ */}
        <div className="mb-7">
          <HeroCarrusel ubicacion="diario" />
        </div>

        {/* ═══ Tabbed content ═════════════════════════════════════ */}
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
