import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ExpedientesV4Client } from "./expedientes-v4-client";

export const metadata = {
  title: "Expediente Abierto — Studio Iuris",
  description:
    "Casos reales abiertos para argumentar y debatir con la comunidad jurídica.",
};

export default async function ExpedientePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Trae expedientes aprobados. Orden por defecto: abiertos primero (asc
  // alfabético sirve: "abierto" < "cerrado"), luego por fecha de cierre
  // descendente. El cliente vuelve a ordenar según el sort seleccionado.
  const expedientes = await prisma.expediente.findMany({
    where: { aprobado: true },
    orderBy: [{ estado: "asc" }, { fechaCierre: "desc" }],
    include: {
      argumentos: {
        where: { parentId: null },
        select: {
          id: true,
          bando: true,
          votos: true,
          userId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  // Aplana a forma serializable y precalcula contadores por bando + mejor
  // alegato. Mantenemos toda la lógica de cómputo en el server thin.
  const serialized = expedientes.map((exp) => {
    const demandanteCount = exp.argumentos.filter(
      (a) => a.bando === exp.bandoDemandante
    ).length;
    const demandadoCount = exp.argumentos.filter(
      (a) => a.bando === exp.bandoDemandado
    ).length;

    const best = exp.argumentos.reduce<
      (typeof exp.argumentos)[number] | null
    >((top, a) => (!top || a.votos > top.votos ? a : top), null);

    return {
      id: exp.id,
      numero: exp.numero,
      titulo: exp.titulo,
      rama: exp.rama,
      materias: exp.materias,
      estado: exp.estado,
      bandoDemandante: exp.bandoDemandante,
      bandoDemandado: exp.bandoDemandado,
      fechaApertura: exp.fechaApertura.toISOString(),
      fechaCierre: exp.fechaCierre.toISOString(),
      totalArgumentos: exp.argumentos.length,
      demandanteCount,
      demandadoCount,
      mejorAlegato: best
        ? {
            authorName: `${best.user.firstName} ${best.user.lastName}`,
            authorAvatar: best.user.avatarUrl,
            votos: best.votos,
          }
        : null,
    };
  });

  return <ExpedientesV4Client expedientes={serialized} />;
}
