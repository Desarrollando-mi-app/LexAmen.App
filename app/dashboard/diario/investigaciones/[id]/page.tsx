// ─── /dashboard/diario/investigaciones/[id] — Detalle ─────
//
// Server component. Sprint 1: muestra el artículo completo con cuerpo,
// resumen, byline, meta strip y aside con métricas + autor + acciones.
// Aún sin sparkline ni "Citado por" (Sprint 2).

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getInvestigacionDetalle } from "@/lib/investigaciones";
import { getTipoLabel } from "@/lib/investigaciones-constants";
import { InvTopBar } from "../components/inv-top-bar";
import { InvImprentaSubNav } from "../components/inv-imprenta-subnav";
import { InvArticulo, InvBibliografia } from "../components/inv-articulo";
import { InvAside } from "../components/inv-aside";
import { InvContraportada } from "../components/inv-contraportada";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const inv = await prisma.investigacion.findUnique({
    where: { id },
    select: { titulo: true, abstract: true },
  });
  if (!inv) return { title: "Investigación no encontrada — Studio IURIS" };
  return {
    title: `${inv.titulo} — Investigaciones · Studio IURIS`,
    description: inv.abstract.slice(0, 160),
  };
}

export default async function DetalleInvestigacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const investigacion = await getInvestigacionDetalle(id);
  if (!investigacion) notFound();

  // Cuántos trabajos publicados tiene el autor (para el aside)
  const trabajosDelAutor = await prisma.investigacion.count({
    where: { userId: investigacion.user.id, status: "published" },
  });

  return (
    <main className="inv-paper-grain min-h-screen bg-inv-paper font-crimson-pro text-inv-ink">
      <InvTopBar />
      <InvImprentaSubNav active="investigaciones" />

      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 lg:px-10 pt-9 pb-8 inv-anim-cover">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-7 pb-3.5 border-b border-inv-rule-2 font-crimson-pro italic text-[13px] text-inv-ink-3">
          <Link
            href="/dashboard/diario/investigaciones"
            className="text-inv-ocre cursor-pointer hover:text-inv-ink"
          >
            Imprenta
          </Link>
          <span className="text-inv-ink-4">›</span>
          <Link
            href="/dashboard/diario/investigaciones"
            className="text-inv-ocre cursor-pointer hover:text-inv-ink"
          >
            Investigaciones
          </Link>
          <span className="text-inv-ink-4">›</span>
          <span>
            <em>{getTipoLabel(investigacion.tipo)}</em>
          </span>
        </div>

        {/* Grid artículo + aside */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 lg:gap-14">
          <div>
            <InvArticulo investigacion={investigacion} />

            {/* Bibliografía externa (si existe) */}
            <InvBibliografia data={investigacion.bibliografiaExterna} />

            {/* "Citado por" se renderiza en Sprint 2 cuando exista el sistema de citas internas */}
            {/* "Externas verificadas" se renderiza también en Sprint 2 + 3 */}
          </div>

          <InvAside
            investigacion={investigacion}
            trabajosDelAutor={trabajosDelAutor}
          />
        </div>
      </div>

      <InvContraportada />
    </main>
  );
}
