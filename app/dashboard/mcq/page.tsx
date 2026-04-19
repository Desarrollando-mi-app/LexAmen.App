import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MCQViewer } from "./mcq-viewer";
import Image from "next/image";
import { StudyPoolToggle, resolveStudyPool } from "@/app/dashboard/components/study-mode-toggle";

const DAILY_FREE_LIMIT = 10;

export default async function MCQPage({
  searchParams,
}: {
  searchParams: {
    rama?: string;
    libro?: string;
    titulo?: string;
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

  const attemptsToday = await prisma.userMCQAttempt.count({
    where: { userId: authUser.id, attemptedAt: { gte: startOfToday } },
  });

  const pool = resolveStudyPool(searchParams.pool);
  const integradoresCount = await prisma.mCQ.count({ where: { esIntegrador: true } });

  const rawMCQs = await prisma.mCQ.findMany({
    where: { esIntegrador: pool === "integradores" },
    orderBy: { id: "asc" },
  });

  // correctOption in DB is already distributed across A/B/C/D (shuffled at import)
  // Pass data as-is — the API attempt route uses the same DB correctOption for grading
  const mcqs = rawMCQs.map((m) => ({
    id: m.id,
    question: m.question,
    optionA: m.optionA,
    optionB: m.optionB,
    optionC: m.optionC,
    optionD: m.optionD,
    correctOption: m.correctOption,
    explanation: m.explanation,
    rama: m.rama,
    codigo: m.codigo,
    libro: m.libro,
    titulo: m.titulo,
    parrafo: m.parrafo,
    dificultad: m.dificultad,
  }));

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
              {/* Gazette page header */}
        <div className="px-4 sm:px-6 pt-8 pb-4">

            <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Selecci&oacute;n M&uacute;ltiple &middot; XP
          </span>
          <div className="flex items-center gap-3 mb-1">
            <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
              Preguntas MCQ
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
      
        <MCQViewer
          mcqs={mcqs}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE" || dbUser.isAdmin}
          initialFilters={{
            rama: searchParams.rama,
            libro: searchParams.libro,
            titulo: searchParams.titulo,
            dificultad: searchParams.dificultad,
          }}
        />
    </main>
  );
}
