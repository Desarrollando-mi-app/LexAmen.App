import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ProgresoPageClient } from "./progreso-page-client";

export const metadata = {
  title: "Plan de Estudios — Studio Iuris",
};

export default async function ProgresoPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Fetch plan + old config + user info in parallel
  const [plan, config, dbUser] = await Promise.all([
    prisma.planEstudio.findUnique({
      where: { userId: authUser.id },
      include: {
        temas: { orderBy: { prioridad: "asc" } },
        sesiones: { orderBy: { fecha: "asc" } },
      },
    }),
    prisma.examenConfig.findUnique({
      where: { userId: authUser.id },
      include: { temas: { orderBy: { orden: "asc" } } },
    }),
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { universidad: true, sede: true, examDate: true },
    }),
  ]);

  // Serialize plan
  const serializedPlan = plan
    ? {
        id: plan.id,
        fechaExamen: plan.fechaExamen.toISOString(),
        horasEstudioDia: plan.horasEstudioDia,
        diasDescanso: JSON.parse(plan.diasDescanso) as string[],
        modoGeneracion: plan.modoGeneracion,
        estado: plan.estado,
        pdf1Nombre: plan.pdf1Nombre,
        pdf2Nombre: plan.pdf2Nombre,
        pdf3Nombre: plan.pdf3Nombre,
        hasPdf1: !!plan.pdf1Texto,
        hasPdf2: !!plan.pdf2Texto,
        hasPdf3: !!plan.pdf3Texto,
        temas: plan.temas.map((t) => ({
          id: t.id,
          rama: t.rama,
          libro: t.libro,
          titulo: t.titulo,
          parrafo: t.parrafo,
          nombre: t.nombre,
          prioridad: t.prioridad,
          estimacionHoras: t.estimacionHoras,
          completado: t.completado,
          porcentaje: t.porcentaje,
        })),
        sesiones: plan.sesiones.map((s) => ({
          id: s.id,
          fecha: s.fecha.toISOString(),
          actividades: JSON.parse(s.actividades),
          completada: s.completada,
          xpGanado: s.xpGanado,
        })),
      }
    : null;

  // Serialize old config for migration offer
  const serializedConfig = config
    ? {
        id: config.id,
        universidad: config.universidad,
        sede: config.sede,
        fechaExamen: config.fechaExamen?.toISOString() ?? null,
        parseStatus: config.parseStatus,
        temas: config.temas.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          materiaMapping: t.materiaMapping,
          libroMapping: t.libroMapping,
          tituloMapping: t.tituloMapping,
          tieneContenido: t.tieneContenido,
          porcentajeAvance: t.porcentajeAvance,
        })),
      }
    : null;

  return (
    <main className="gz-page min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <ProgresoPageClient
        plan={serializedPlan}
        oldConfig={serializedConfig}
        initialUniversidad={dbUser?.universidad ?? null}
        initialSede={dbUser?.sede ?? null}
        initialFechaExamen={dbUser?.examDate?.toISOString() ?? null}
      />
    </main>
  );
}
