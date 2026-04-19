import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FillBlankViewer } from "./fill-blank-viewer";
import Image from "next/image";
import { StudyPoolToggle, resolveStudyPool } from "@/app/dashboard/components/study-mode-toggle";

const DAILY_FREE_LIMIT = 5;

export const metadata = { title: "Completar Espacios — Studio Iuris" };

export default async function CompletarEspaciosPage({
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.fillBlankAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  const pool = resolveStudyPool(searchParams.pool);
  const integradoresCount = await prisma.fillBlank.count({
    where: { activo: true, esIntegrador: true },
  });

  const rawItems = await prisma.fillBlank.findMany({
    where: { activo: true, esIntegrador: pool === "integradores" },
    orderBy: { createdAt: "desc" },
  });

  const items = rawItems.map((item) => ({
    id: item.id,
    textoConBlancos: item.textoConBlancos,
    blancos: item.blancos, // JSON string, parsed on client
    explicacion: item.explicacion,
    rama: item.rama,
    libro: item.libro,
    titulo: item.titulo,
    materia: item.materia,
    dificultad: item.dificultad,
  }));

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
              {/* Gazette page header */}
        <div className="px-4 sm:px-6 pt-8 pb-4">

            <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Completar Espacios &middot; XP
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
              Completar Espacios
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

        <FillBlankViewer
          items={items}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE" || dbUser.isAdmin}
          initialFilters={{
            rama: searchParams.rama,
            libro: searchParams.libro,
            titulo: searchParams.titulo,
          }}
        />
    </main>
  );
}
