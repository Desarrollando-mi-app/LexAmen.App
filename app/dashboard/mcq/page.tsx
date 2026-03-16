import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MCQViewer } from "./mcq-viewer";
import Image from "next/image";

const DAILY_FREE_LIMIT = 10;

export default async function MCQPage({
  searchParams,
}: {
  searchParams: {
    rama?: string;
    libro?: string;
    titulo?: string;
    dificultad?: string;
  };
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, plan: true },
  });

  if (!dbUser) redirect("/login");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.userMCQAttempt.count({
    where: { userId: authUser.id, attemptedAt: { gte: startOfToday } },
  });

  const rawMCQs = await prisma.mCQ.findMany({ orderBy: { id: "asc" } });

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
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Gazette page header */}
        <div className="mb-6">
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Selecci&oacute;n M&uacute;ltiple &middot; XP
          </span>
          <div className="flex items-center gap-3 mb-1">
            <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={56} height={56} className="h-[48px] w-[48px] lg:h-[56px] lg:w-[56px]" />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
              Preguntas MCQ
            </h1>
          </div>
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>
        <MCQViewer
          mcqs={mcqs}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE"}
          initialFilters={{
            rama: searchParams.rama,
            libro: searchParams.libro,
            titulo: searchParams.titulo,
            dificultad: searchParams.dificultad,
          }}
        />
      </div>
    </main>
  );
}
