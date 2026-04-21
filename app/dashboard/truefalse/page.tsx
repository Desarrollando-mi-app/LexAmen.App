import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TrueFalseViewer } from "./truefalse-viewer";
import Image from "next/image";
import { PoolIndicator } from "@/app/dashboard/components/pool-indicator";
import { resolveStudyPool } from "@/app/dashboard/components/study-mode-toggle.utils";

const DAILY_FREE_LIMIT = 20;

export default async function TrueFalsePage({
  searchParams,
}: {
  searchParams: {
    rama?: string;
    libro?: string;
    titulo?: string;
    parrafo?: string;
    dificultad?: string;
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
    select: { firstName: true, plan: true, isAdmin: true },
  });

  if (!dbUser) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.userTrueFalseAttempt.count({
    where: { userId: authUser.id, attemptedAt: { gte: startOfToday } },
  });

  const pool = resolveStudyPool(searchParams.pool);

  const rawItems = await prisma.trueFalse.findMany({
    where: { esIntegrador: pool === "integradores" },
    orderBy: { id: "asc" },
  });

  const items = rawItems.map((tf) => ({
    id: tf.id,
    statement: tf.statement,
    isTrue: tf.isTrue,
    explanation: tf.explanation,
    rama: tf.rama,
    codigo: tf.codigo,
    libro: tf.libro,
    titulo: tf.titulo,
    parrafo: tf.parrafo,
    dificultad: tf.dificultad,
  }));

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
              {/* Gazette page header */}
        <div className="px-4 sm:px-6 pt-8 pb-4">

            <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Verdadero o Falso &middot; XP
          </span>
          <div className="flex items-center gap-3 mb-1">
            <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
              Verdadero / Falso
            </h1>
          </div>
          <div className="h-[2px] bg-gz-rule-dark" />
          <PoolIndicator pool={pool} className="mt-4" />
      </div>

        <TrueFalseViewer
          items={items}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE" || dbUser.isAdmin}
          initialFilters={{
            rama: searchParams.rama,
            libro: searchParams.libro,
            titulo: searchParams.titulo,
            parrafo: searchParams.parrafo,
            dificultad: searchParams.dificultad,
          }}
        />
    </main>
  );
}
