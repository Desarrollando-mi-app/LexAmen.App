import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "../logout-button";
import { TrueFalseViewer } from "./truefalse-viewer";

const DAILY_FREE_LIMIT = 20;

export default async function TrueFalsePage() {
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

  const attemptsToday = await prisma.userTrueFalseAttempt.count({
    where: {
      userId: authUser.id,
      attemptedAt: { gte: startOfToday },
    },
  });

  // 4. Obtener todas las afirmaciones
  const rawItems = await prisma.trueFalse.findMany({
    orderBy: { id: "asc" },
  });

  // 5. Serializar para el client component
  const items = rawItems.map((tf) => ({
    id: tf.id,
    statement: tf.statement,
    isTrue: tf.isTrue,
    explanation: tf.explanation,
    unidad: tf.unidad,
    materia: tf.materia,
    submateria: tf.submateria,
    tipo: tf.tipo,
    nivel: tf.nivel,
  }));

  // 6. Extraer materias, submaterias y niveles únicos
  const materias = Array.from(new Set(rawItems.map((tf) => tf.materia)));
  const submaterias = Array.from(new Set(rawItems.map((tf) => tf.submateria)));
  const niveles = Array.from(new Set(rawItems.map((tf) => tf.nivel)));

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
        <TrueFalseViewer
          items={items}
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
