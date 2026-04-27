// ─── /dashboard/diario/investigaciones — Pliego (landing) ───
//
// Server component. Carga datos en paralelo y los renderiza siguiendo
// el prototipo v2 view-listado: portada + cifras + destacado + filtros
// + dual (recientes + más citadas) + § + áreas + instituciones + autores
// + contraportada.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  listInvestigaciones,
  getDestacada,
  getMasCitadas,
  getAreasConContador,
  getInstitucionesTop,
  getAutoresTopHIndex,
  getCifras,
} from "@/lib/investigaciones";
import { InvTopBar } from "./components/inv-top-bar";
import { InvImprentaSubNav } from "./components/inv-imprenta-subnav";
import { InvCover } from "./components/inv-cover";
import { InvCifras } from "./components/inv-cifras";
import { InvDestacado } from "./components/inv-destacado";
import { InvFiltros } from "./components/inv-filtros";
import { InvPliegoItem } from "./components/inv-pliego-item";
import { InvAparte } from "./components/inv-aparte";
import { InvSectionRotulo } from "./components/inv-section-rotulo";
import { InvAreasGrid } from "./components/inv-areas-grid";
import { InvInstitucionesStrip } from "./components/inv-instituciones-strip";
import { InvAutoresRow } from "./components/inv-autores-row";
import { InvContraportada } from "./components/inv-contraportada";

export const metadata: Metadata = {
  title: "Investigaciones — Imprenta · Studio IURIS",
  description:
    "Memorias, artículos doctrinales y comentarios de los juristas de Studio IURIS. Sistema de citación y métricas reputacionales.",
};

type SearchParams = {
  tipo?: string;
  area?: string;
  institucionId?: string;
  search?: string;
  sort?: string;
  page?: string;
};

export default async function PliegoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const sp = await searchParams;

  const [recientes, destacada, masCitadas, areas, instituciones, autores, cifras] =
    await Promise.all([
      listInvestigaciones({
        tipo: sp.tipo,
        area: sp.area,
        institucionId: sp.institucionId ? Number(sp.institucionId) : null,
        search: sp.search,
        sort: (sp.sort as "recent" | "mostCited") || "recent",
        page: sp.page ? Number(sp.page) : 1,
        limit: 15,
      }),
      getDestacada(),
      getMasCitadas(5),
      getAreasConContador(),
      getInstitucionesTop(8),
      getAutoresTopHIndex(5),
      getCifras(),
    ]);

  // Si la destacada está dentro de los recientes, la sacamos del listado
  const recientesItems = destacada
    ? recientes.items.filter((i) => i.id !== destacada.id)
    : recientes.items;

  return (
    <main className="inv-paper-grain min-h-screen bg-inv-paper font-crimson-pro text-inv-ink">
      <InvTopBar />
      <InvImprentaSubNav active="investigaciones" />

      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 lg:px-10 pt-12 pb-12">
        <InvCover />
        <InvCifras data={cifras} />

        {destacada && <InvDestacado investigacion={destacada} />}

        <InvFiltros />

        {/* Layout dual: pliego + aparte */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-12 mb-12 inv-anim-dual">
          <div>
            <InvSectionRotulo
              roman="I"
              titulo="Recientes"
              nota={
                recientes.total > 0
                  ? `${recientes.total} ${recientes.total === 1 ? "trabajo" : "trabajos"}`
                  : undefined
              }
            />

            {recientesItems.length === 0 ? (
              <p className="font-cormorant italic text-[18px] text-inv-ink-3 text-center py-16">
                Aún no hay investigaciones publicadas con estos filtros.
                <br />
                Sé el primero en{" "}
                <a
                  href="/dashboard/diario/investigaciones/nueva"
                  className="text-inv-ocre border-b border-inv-ocre cursor-pointer"
                >
                  enviar una a la imprenta
                </a>
                .
              </p>
            ) : (
              <div className="flex flex-col">
                {recientesItems.map((item, idx) => (
                  <InvPliegoItem
                    key={item.id}
                    item={item}
                    index={idx + 1}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <InvAparte items={masCitadas} />
          </div>
        </section>

        {/* Separador § § § */}
        <div className="text-center font-cormorant italic text-[24px] text-inv-ocre tracking-[16px] my-9">
          § &nbsp; § &nbsp; §
        </div>

        {/* Áreas */}
        {areas.length > 0 && (
          <>
            <InvSectionRotulo
              roman="II"
              titulo="Explorar por área"
              nota={`${areas.length} áreas activas`}
            />
            <InvAreasGrid areas={areas} />
          </>
        )}

        {/* Instituciones */}
        {instituciones.length > 0 && (
          <>
            <InvSectionRotulo
              roman="III"
              titulo="Instituciones jurídicas más estudiadas"
              nota="de las 72 institucionalizadas"
            />
            <InvInstitucionesStrip instituciones={instituciones} />
          </>
        )}

        {/* Autores */}
        {autores.length > 0 && (
          <>
            <InvSectionRotulo
              roman="IV"
              titulo="Plumas con mayor índice h"
              nota="cuadro del trimestre"
            />
            <InvAutoresRow autores={autores} />
          </>
        )}
      </div>

      <InvContraportada />
    </main>
  );
}
