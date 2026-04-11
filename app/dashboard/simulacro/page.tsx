import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { SimulacroHub } from "./simulacro-hub";

export default async function SimulacroPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      firstName: true,
      avatarUrl: true,
    },
  });

  if (!user) redirect("/login");

  // Últimas 5 sesiones
  const sesionesRecientes = await prisma.simulacroSesion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      interrogadorId: true,
      fuente: true,
      rama: true,
      totalPreguntas: true,
      correctas: true,
      incorrectas: true,
      nivelActual: true,
      completada: true,
      createdAt: true,
    },
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="px-4 sm:px-6 pt-8 pb-4">
        <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
          Simulacro Oral &middot; IA &middot; TTS
        </span>
        <h1 className="font-cormorant text-[28px] lg:text-[32px] !font-bold text-gz-ink mb-3">
          Simulacro Oral
        </h1>
      </div>
      <div className="h-[2px] bg-gz-rule-dark" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <SimulacroHub
          userId={user.id}
          userName={user.firstName}
          avatarUrl={user.avatarUrl}
          sesionesRecientes={JSON.parse(JSON.stringify(sesionesRecientes))}
        />
      </div>
    </div>
  );
}
