import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MatchColumnsViewer } from "./match-columns-viewer";
import Image from "next/image";

const DAILY_FREE_LIMIT = 5;

export const metadata = { title: "Relacionar Columnas — Studio Iuris" };

export default async function RelacionarColumnasPage({
  searchParams,
}: {
  searchParams: {
    rama?: string;
  };
}) {
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
    select: { plan: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // 3. Contar intentos de hoy
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.matchColumnsAttempt.count({
    where: {
      userId: authUser.id,
      createdAt: { gte: startOfToday },
    },
  });

  // 4. Obtener todos los ejercicios activos
  const rawItems = await prisma.matchColumns.findMany({
    where: { activo: true },
    orderBy: { createdAt: "desc" },
  });

  const items = rawItems.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    instruccion: item.instruccion,
    pares: item.pares,
    columnaIzqLabel: item.columnaIzqLabel,
    columnaDerLabel: item.columnaDerLabel,
    explicacion: item.explicacion,
    rama: item.rama,
    libro: item.libro,
    tituloMateria: item.tituloMateria,
    materia: item.materia,
    dificultad: item.dificultad,
  }));

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Gazette page header */}
        <div className="mb-6">
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Relacionar Columnas &middot; XP
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
              Relacionar Columnas
            </h1>
          </div>
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>
        <MatchColumnsViewer
          items={items}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE"}
          initialFilters={{
            rama: searchParams.rama,
          }}
        />
      </div>
    </main>
  );
}
