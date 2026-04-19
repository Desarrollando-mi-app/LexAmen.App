import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TimelineViewer } from "./timeline-viewer";
import Image from "next/image";
import { StudyPoolToggle, resolveStudyPool } from "@/app/dashboard/components/study-mode-toggle";

const DAILY_FREE_LIMIT = 5;

export const metadata = { title: "Lineas de Tiempo — Studio Iuris" };

export default async function LineaDeTiempoPage({
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

  const attemptsToday = await prisma.timelineAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  const pool = resolveStudyPool(searchParams.pool);
  const integradoresCount = await prisma.timeline.count({
    where: { activo: true, esIntegrador: true },
  });

  const rawItems = await prisma.timeline.findMany({
    where: { activo: true, esIntegrador: pool === "integradores" },
    orderBy: { createdAt: "desc" },
  });

  const items = rawItems.map((tl) => {
    const eventos: { id: number; texto: string; posicion: number; unidad: string; descripcion: string }[] =
      JSON.parse(tl.eventos);

    // Strip correct posicion for client
    const eventosSafe = eventos.map((e) => ({
      id: e.id,
      texto: e.texto,
      unidad: e.unidad || "",
      descripcion: e.descripcion || "",
    }));

    return {
      id: tl.id,
      titulo: tl.titulo,
      instruccion: tl.instruccion,
      escala: tl.escala,
      rangoMin: tl.rangoMin,
      rangoMax: tl.rangoMax,
      eventos: eventosSafe,
      rama: tl.rama,
      libro: tl.libro,
      tituloMateria: tl.tituloMateria,
      materia: tl.materia,
      dificultad: tl.dificultad,
    };
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
              {/* Gazette page header */}
        <div className="px-4 sm:px-6 pt-8 pb-4">

            <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Lineas de Tiempo &middot; XP
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
              Lineas de Tiempo
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

        <TimelineViewer
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
