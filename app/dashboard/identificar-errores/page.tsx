import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ErrorIdViewer } from "./error-id-viewer";
import Image from "next/image";
import { PoolIndicator } from "@/app/dashboard/components/pool-indicator";
import { resolveStudyPool } from "@/app/dashboard/components/study-mode-toggle.utils";

const DAILY_FREE_LIMIT = 5;

export const metadata = { title: "Identificar Errores — Studio Iuris" };

export default async function IdentificarErroresPage({
  searchParams,
}: {
  searchParams: {
    rama?: string;
    libro?: string;
    titulo?: string;
    parrafo?: string;
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

  const attemptsToday = await prisma.errorIdentificationAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  const pool = resolveStudyPool(searchParams.pool);

  const rawItems = await prisma.errorIdentification.findMany({
    where: { activo: true, esIntegrador: pool === "integradores" },
    orderBy: { createdAt: "desc" },
  });

  // Send segments WITHOUT error info (safe for client)
  const items = rawItems.map((item) => {
    const segmentos = JSON.parse(item.segmentos);
    const segmentosSafe = segmentos.map(
      (s: { id: number; texto: string }) => ({
        id: s.id,
        texto: s.texto,
      })
    );
    return {
      id: item.id,
      segmentos: JSON.stringify(segmentosSafe),
      totalErrores: item.totalErrores,
      rama: item.rama,
      libro: item.libro,
      titulo: item.titulo,
      parrafo: item.parrafo,
      materia: item.materia,
      dificultad: item.dificultad,
    };
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
              {/* Gazette page header */}
        <div className="px-4 sm:px-6 pt-8 pb-4">

            <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Identificar Errores &middot; XP
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
              Identificar Errores
            </h1>
          </div>
          <div className="h-[2px] bg-gz-rule-dark" />
          <PoolIndicator pool={pool} className="mt-4" />
      </div>

        <ErrorIdViewer
          items={items}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE" || dbUser.isAdmin}
          initialFilters={{
            rama: searchParams.rama,
            libro: searchParams.libro,
            titulo: searchParams.titulo,
            parrafo: searchParams.parrafo,
          }}
        />
    </main>
  );
}
