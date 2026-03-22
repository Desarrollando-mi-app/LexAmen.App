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

  const mcqs = rawMCQs.map((m) => {
    // Shuffle options so the correct answer isn't always in the same position
    const options = [
      { key: "A", text: m.optionA },
      { key: "B", text: m.optionB },
      { key: "C", text: m.optionC },
      { key: "D", text: m.optionD },
    ];
    // Fisher-Yates shuffle
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    // Map correctOption to new position
    const newCorrectKey = ["A", "B", "C", "D"][
      options.findIndex((o) => o.key === m.correctOption)
    ];

    return {
      id: m.id,
      question: m.question,
      optionA: options[0].text,
      optionB: options[1].text,
      optionC: options[2].text,
      optionD: options[3].text,
      correctOption: newCorrectKey,
      explanation: m.explanation,
      rama: m.rama,
      codigo: m.codigo,
      libro: m.libro,
      titulo: m.titulo,
      parrafo: m.parrafo,
      dificultad: m.dificultad,
    };
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Gazette page header */}
        <div className="mb-6">
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
