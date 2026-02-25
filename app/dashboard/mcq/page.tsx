import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "../logout-button";
import { MCQViewer } from "./mcq-viewer";

const DAILY_FREE_LIMIT = 10;

export default async function MCQPage() {
  // 1. Autenticar
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2. Obtener usuario con plan
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, plan: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // 3. Contar intentos de hoy
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.userMCQAttempt.count({
    where: {
      userId: authUser.id,
      attemptedAt: { gte: startOfToday },
    },
  });

  // 4. Obtener todas las MCQs
  const rawMCQs = await prisma.mCQ.findMany({
    orderBy: { id: "asc" },
  });

  // 5. Serializar para el client component
  const mcqs = rawMCQs.map((m) => ({
    id: m.id,
    question: m.question,
    optionA: m.optionA,
    optionB: m.optionB,
    optionC: m.optionC,
    optionD: m.optionD,
    correctOption: m.correctOption,
    explanation: m.explanation,
    unidad: m.unidad,
    materia: m.materia,
    submateria: m.submateria,
    tipo: m.tipo,
    nivel: m.nivel,
  }));

  // 6. Extraer materias, submaterias y niveles únicos
  const materias = Array.from(new Set(rawMCQs.map((m) => m.materia)));
  const submaterias = Array.from(new Set(rawMCQs.map((m) => m.submateria)));
  const niveles = Array.from(new Set(rawMCQs.map((m) => m.nivel)));

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-navy hover:text-navy/80"
          >
            LéxAmen
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-navy/70">{dbUser.firstName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        <MCQViewer
          mcqs={mcqs}
          materias={materias}
          submaterias={submaterias}
          niveles={niveles}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE"}
        />
      </div>
    </main>
  );
}
