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
    <SimulacroHub
      userId={user.id}
      userName={user.firstName}
      avatarUrl={user.avatarUrl}
      sesionesRecientes={JSON.parse(JSON.stringify(sesionesRecientes))}
    />
  );
}
