import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TrueFalseViewer } from "./truefalse-viewer";

const DAILY_FREE_LIMIT = 20;

export default async function TrueFalsePage({
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

  const attemptsToday = await prisma.userTrueFalseAttempt.count({
    where: { userId: authUser.id, attemptedAt: { gte: startOfToday } },
  });

  const rawItems = await prisma.trueFalse.findMany({ orderBy: { id: "asc" } });

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
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <TrueFalseViewer
          items={items}
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
