import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ExpedienteList } from "./expediente-list";

export const metadata = {
  title: "Expediente Abierto — Studio Iuris",
};

export default async function ExpedientePage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Fetch expedientes: abiertos first, then cerrados
  const expedientes = await prisma.expediente.findMany({
    where: { aprobado: true },
    orderBy: [
      { estado: "asc" }, // "abierto" < "cerrado" alphabetically
      { fechaCierre: "desc" },
    ],
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

  // Serialize for client
  const serialized = expedientes.map((exp) => {
    const demandanteCount = exp.argumentos.filter(
      (a) => a.bando === exp.bandoDemandante
    ).length;
    const demandadoCount = exp.argumentos.filter(
      (a) => a.bando === exp.bandoDemandado
    ).length;

    // Find best argument (most votes)
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

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Back link */}
        <a
          href="/dashboard/diario"
          className="mb-6 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light transition-colors hover:text-gz-ink"
        >
          &larr; Volver al Diario
        </a>

        {/* Header */}
        <header className="mb-8">
          <p className="mb-2 font-ibm-mono text-[9px] font-semibold uppercase tracking-[2.5px] text-gz-burgundy">
            Debate Juridico
          </p>
          <h1 className="font-cormorant text-[36px] font-bold leading-tight text-gz-ink">
            Expediente Abierto
          </h1>
          <p className="mt-2 font-cormorant text-[17px] italic text-gz-ink-mid">
            Casos reales para argumentar y debatir con la comunidad.
          </p>
        </header>

        <div className="mb-8 h-[2px] bg-gz-rule-dark" />

        <Suspense
          fallback={
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[160px] animate-pulse rounded-[4px] bg-gz-cream-dark"
                />
              ))}
            </div>
          }
        >
          <ExpedienteList expedientes={serialized} />
        </Suspense>
      </div>
    </div>
  );
}
