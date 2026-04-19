import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DictadoViewer } from "./dictado-viewer";
import Image from "next/image";
import Link from "next/link";
import { StudyPoolToggle, resolveStudyPool } from "@/app/dashboard/components/study-mode-toggle";

const DAILY_LIMIT = 5;

export const metadata = { title: "Dictado Juridico — Studio Iuris" };

export default async function DictadoJuridicoPage({
  searchParams,
}: {
  searchParams: {
    rama?: string;
    libro?: string;
    titulo?: string;
    pool?: string;
  };
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, isAdmin: true },
  });

  if (!dbUser) redirect("/login");

  // PAID ONLY — show upgrade message for free users (admins bypass)
  if (dbUser.plan === "FREE" && !dbUser.isAdmin) {
    return (
      <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className="px-4 sm:px-6 py-8">
          <div className="gz-section-header mb-6">
            <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
              Dictado Jur&iacute;dico &middot; Premium
            </span>
            <div className="flex items-center gap-3 mb-1">
              <Image
                src="/brand/logo-sello.svg"
                alt="Studio Iuris"
                width={80}
                height={80}
                className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
              />
              <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
                Dictado Jur&iacute;dico
              </h1>
            </div>
            <div className="h-[2px] bg-gz-rule-dark" />
          </div>

          <div className="rounded-[4px] border border-gz-rule p-8 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gz-gold/10">
              <span className="text-3xl">&#x1F3A7;</span>
            </div>
            <h2 className="font-cormorant text-[24px] font-bold text-gz-ink mb-2">
              Contenido Premium
            </h2>
            <p className="font-archivo text-[14px] text-gz-ink-light max-w-md mx-auto mb-6">
              El Dictado Jur&iacute;dico es una herramienta exclusiva para estudiantes con plan de pago.
              Escucha textos legales y escr&iacute;belos para mejorar tu precisi&oacute;n y vocabulario jur&iacute;dico.
            </p>
            <Link
              href="/dashboard/indice-maestro"
              className="inline-block rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
            >
              Volver al Indice
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Fetch attempts today for daily limit
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.dictadoAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  const pool = resolveStudyPool(searchParams.pool);
  const integradoresCount = await prisma.dictadoJuridico.count({
    where: { activo: true, esIntegrador: true },
  });

  // Fetch all active dictados (without textoCompleto)
  const rawItems = await prisma.dictadoJuridico.findMany({
    where: { activo: true, esIntegrador: pool === "integradores" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      titulo: true,
      rama: true,
      libro: true,
      tituloMateria: true,
      materia: true,
      dificultad: true,
    },
  });

  // Filter by searchParams if provided
  const { rama, libro, titulo } = searchParams;
  let filteredItems = [...rawItems];
  if (rama) filteredItems = filteredItems.filter((i) => i.rama === rama);
  if (libro) filteredItems = filteredItems.filter((i) => (i.libro ?? i.tituloMateria) === libro || i.libro === libro);
  if (titulo) filteredItems = filteredItems.filter((i) => (i.tituloMateria) === titulo);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="px-4 sm:px-6 py-8">
        {/* Gazette page header */}
        <div className="gz-section-header mb-6">
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Dictado Jur&iacute;dico &middot; Precisi&oacute;n Legal
          </span>
          <div className="flex items-center gap-3 mb-1">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={80}
              height={80}
              className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
            />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
              Dictado Jur&iacute;dico
            </h1>
          </div>
          <div className="h-[2px] bg-gz-rule-dark" />
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <StudyPoolToggle currentPool={pool} integradoresCount={integradoresCount} />
            {pool === "integradores" && (
              <span className="font-cormorant italic text-sm text-gz-ink-mid">
                Mostrando ejercicios marcados como integradores.
              </span>
            )}
          </div>
        </div>

        <DictadoViewer
          items={filteredItems}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_LIMIT}
          initialFilters={{ rama, libro, titulo }}
        />
      </div>
    </main>
  );
}
