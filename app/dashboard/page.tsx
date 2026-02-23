import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Buscar usuario por id. Si no existe, intentar crearlo.
  // Si el email ya existe (registro previo a medias), actualizar ese registro con el id correcto.
  let user = await prisma.user.findUnique({ where: { id: authUser.id } });

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.full_name ?? null,
        },
      });
    } catch {
      // Si falla por email duplicado, actualizar el registro existente con el id de auth
      user = await prisma.user.update({
        where: { email: authUser.email! },
        data: { id: authUser.id },
      });
    }
  }

  const displayName = user.name ?? user.email;

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold text-navy">LéxAmen</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-navy/70">{displayName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="text-2xl font-bold text-navy">
          Hola, {user.name ?? "estudiante"}
        </h2>
        <p className="mt-1 text-navy/60">¿Qué quieres estudiar hoy?</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <DashboardCard
            title="Flashcards"
            description="Repasa conceptos clave con tarjetas inteligentes"
            emoji="📇"
          />
          <DashboardCard
            title="Preguntas MCQ"
            description="Practica con preguntas de selección múltiple"
            emoji="✅"
          />
          <DashboardCard
            title="Simulacro"
            description="Simula un examen real con tiempo"
            emoji="⏱️"
          />
          <DashboardCard
            title="Mi Progreso"
            description="Revisa tu avance y estadísticas"
            emoji="📊"
          />
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  emoji,
}: {
  title: string;
  description: string;
  emoji: string;
}) {
  return (
    <div className="cursor-pointer rounded-xl border border-border bg-white p-6 transition-shadow hover:shadow-md">
      <div className="mb-3 text-3xl">{emoji}</div>
      <h3 className="text-lg font-semibold text-navy">{title}</h3>
      <p className="mt-1 text-sm text-navy/60">{description}</p>
    </div>
  );
}
