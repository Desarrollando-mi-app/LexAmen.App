import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ProgresoPageClient } from "./progreso-page-client";

export const metadata = {
  title: "Mi Examen — Studio Iuris",
};

export default async function ProgresoPage() {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2. Get ExamenConfig with temas
  const config = await prisma.examenConfig.findUnique({
    where: { userId: authUser.id },
    include: {
      temas: {
        orderBy: { orden: "asc" },
      },
    },
  });

  // 3. Get user info for initial setup
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { universidad: true, sede: true, examDate: true },
  });

  // Serialize dates
  const serializedConfig = config
    ? {
        id: config.id,
        universidad: config.universidad,
        sede: config.sede,
        fechaExamen: config.fechaExamen?.toISOString() ?? null,
        parseStatus: config.parseStatus,
        parseError: config.parseError,
        parsedAt: config.parsedAt?.toISOString() ?? null,
        temas: config.temas.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          descripcion: t.descripcion,
          categoriaOriginal: t.categoriaOriginal,
          materiaMapping: t.materiaMapping,
          libroMapping: t.libroMapping,
          tituloMapping: t.tituloMapping,
          tieneContenido: t.tieneContenido,
          flashcardsDisponibles: t.flashcardsDisponibles,
          mcqDisponibles: t.mcqDisponibles,
          vfDisponibles: t.vfDisponibles,
          flashcardsDominadas: t.flashcardsDominadas,
          mcqCorrectas: t.mcqCorrectas,
          vfCorrectas: t.vfCorrectas,
          porcentajeAvance: t.porcentajeAvance,
          peso: t.peso,
          orden: t.orden,
        })),
      }
    : null;

  return (
    <main className="gz-page min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <ProgresoPageClient
        config={serializedConfig}
        initialUniversidad={dbUser?.universidad ?? null}
        initialSede={dbUser?.sede ?? null}
        initialFechaExamen={dbUser?.examDate?.toISOString() ?? null}
      />
    </main>
  );
}
