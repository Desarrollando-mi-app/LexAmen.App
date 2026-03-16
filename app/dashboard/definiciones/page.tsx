import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DefinicionesViewer } from "./definiciones-viewer";
import Image from "next/image";

const DAILY_FREE_LIMIT = 15;

export default async function DefinicionesPage({
  searchParams,
}: {
  searchParams: {
    rama?: string;
    libro?: string;
    titulo?: string;
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

  // Daily attempts count
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const attemptsToday = await prisma.definicionIntento.count({
    where: { userId: authUser.id, createdAt: { gte: startOfToday } },
  });

  // Fetch all active definitions
  const rawDefs = await prisma.definicion.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

  // Shuffle options for each definition
  const definiciones = rawDefs.map((d) => {
    const options = [
      { key: "A" as const, text: d.concepto },
      { key: "B" as const, text: d.distractor1 },
      { key: "C" as const, text: d.distractor2 },
      { key: "D" as const, text: d.distractor3 },
    ];
    // Fisher-Yates shuffle
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      id: d.id,
      definicion: d.definicion,
      concepto: d.concepto,
      options: options.map((o) => o.text),
      explicacion: d.explicacion,
      articuloRef: d.articuloRef,
      rama: d.rama,
      libro: d.libro,
      titulo: d.titulo,
    };
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Gazette page header */}
        <div className="mb-6">
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Definiciones &middot; Conceptos Jur&iacute;dicos
          </span>
          <div className="flex items-center gap-3 mb-1">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={100}
              height={100}
              className="h-[80px] w-[80px] lg:h-[100px] lg:w-[100px]"
            />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
              Definiciones
            </h1>
          </div>
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>

        <DefinicionesViewer
          definiciones={definiciones}
          attemptsToday={attemptsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE"}
          initialFilters={{
            rama: searchParams.rama,
            libro: searchParams.libro,
            titulo: searchParams.titulo,
          }}
        />
      </div>
    </main>
  );
}
