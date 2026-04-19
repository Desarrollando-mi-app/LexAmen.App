import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OrderSequenceViewer } from "./order-sequence-viewer";
import Image from "next/image";
import { StudyPoolToggle, resolveStudyPool } from "@/app/dashboard/components/study-mode-toggle";

const DAILY_FREE_LIMIT = 5;

export const metadata = { title: "Ordenar Secuencias — Studio Iuris" };

export default async function OrdenarSecuenciasPage({
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

  const attemptsToday = await prisma.orderSequenceAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  const pool = resolveStudyPool(searchParams.pool);
  const integradoresCount = await prisma.orderSequence.count({
    where: { activo: true, esIntegrador: true },
  });

  const rawItems = await prisma.orderSequence.findMany({
    where: { activo: true, esIntegrador: pool === "integradores" },
    orderBy: { createdAt: "desc" },
  });

  const items = rawItems.map((item) => {
    const parsedItems: { id: number; texto: string; orden: number }[] = JSON.parse(item.items);
    // Shuffle items — strip correct orden for client
    const shuffled = parsedItems
      .map((i) => ({ id: i.id, texto: i.texto }))
      .sort(() => Math.random() - 0.5);

    return {
      id: item.id,
      titulo: item.titulo,
      instruccion: item.instruccion,
      items: shuffled,
      rama: item.rama,
      libro: item.libro,
      tituloMateria: item.tituloMateria,
      materia: item.materia,
      dificultad: item.dificultad,
    };
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
              {/* Gazette page header */}
        <div className="px-4 sm:px-6 pt-8 pb-4">

            <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Ordenar Secuencias &middot; XP
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
              Ordenar Secuencias
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

        <OrderSequenceViewer
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
