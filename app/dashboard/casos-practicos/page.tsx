import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CasoPracticoViewer } from "./caso-practico-viewer";
import { PoolIndicator } from "@/app/dashboard/components/pool-indicator";
import { resolveStudyPool } from "@/app/dashboard/components/study-mode-toggle.utils";

const DAILY_FREE_LIMIT = 3;

export default async function CasosPracticosPage({
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
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2. Get user
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, plan: true, isAdmin: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // 3. Attempts today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.casoPracticoAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  const pool = resolveStudyPool(searchParams.pool);

  // 4. Fetch all active casos + completed IDs
  const [rawCasos, completedAttempts] = await Promise.all([
    prisma.casoPractico.findMany({
      where: { activo: true, esIntegrador: pool === "integradores" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.casoPracticoAttempt.findMany({
      where: { userId: authUser.id },
      select: { casoPracticoId: true },
      distinct: ["casoPracticoId"],
    }),
  ]);

  const completedIds = completedAttempts.map((a) => a.casoPracticoId);

  let casos = rawCasos.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    hechos: c.hechos,
    resumenFinal: c.resumenFinal,
    rama: c.rama,
    libro: c.libro,
    tituloMateria: c.tituloMateria,
    parrafo: c.parrafo,
    materia: c.materia,
    dificultad: c.dificultad,
    preguntasCount: (() => {
      try {
        return JSON.parse(c.preguntas).length;
      } catch {
        return 0;
      }
    })(),
  }));

  // Filter by searchParams if provided
  const { rama, libro, titulo, parrafo } = searchParams;
  if (rama) casos = casos.filter((c) => c.rama === rama);
  if (libro) casos = casos.filter((c) => (c.libro ?? c.tituloMateria) === libro || c.libro === libro);
  if (titulo) casos = casos.filter((c) => (c.tituloMateria) === titulo);
  if (parrafo) casos = casos.filter((c) => c.parrafo === parrafo);

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="px-4 py-8">
        {/* ─── Gazette Header ─── */}
        <header className="mb-8 border-b-2 border-gz-rule pb-6 text-center">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
            Studio Iuris
          </p>
          <h1 className="mt-2 font-cormorant text-[32px] font-bold leading-tight text-gz-ink sm:text-[40px]">
            Casos Practicos
          </h1>
          <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
            Analiza los hechos, identifica el problema y resuelve aplicando la norma.
          </p>
          <div className="mx-auto mt-3 h-[1px] w-16 bg-gz-gold" />
          <PoolIndicator pool={pool} className="mt-4 justify-center" />
        </header>

        <CasoPracticoViewer
          casos={casos}
          plan={dbUser.isAdmin ? "PREMIUM_ANNUAL" : dbUser.plan}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          completedIds={completedIds}
        />
      </div>
    </main>
  );
}
