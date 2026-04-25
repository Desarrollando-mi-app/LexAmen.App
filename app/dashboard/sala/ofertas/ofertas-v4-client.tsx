"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MastheadOfertas } from "@/components/ofertas/masthead-ofertas";
import {
  FilterRowOfertas,
  type OfertaSort,
} from "@/components/ofertas/filter-row-ofertas";
import { OfertaTile } from "@/components/ofertas/oferta-tile";
import type { OfertaTileData } from "@/lib/ofertas-helpers";
import { PublishSheet } from "@/components/sala/publish-sheet";
import { OfertaForm } from "@/components/ofertas/oferta-form";

/**
 * Cliente V4 editorial para Ofertas laborales.
 * Hospeda estado de filtros + grilla compartida con bordes (mismo lenguaje
 * que PasantiasV4Client). Sólo lectura: la creación/CRUD de mis ofertas
 * vive en /ofertas/gestion.
 */
export function OfertasV4Client({
  ofertas,
}: {
  ofertas: OfertaTileData[];
}) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [contrato, setContrato] = useState<string | null>(null);
  const [formato, setFormato] = useState<string | null>(null);
  const [sort, setSort] = useState<OfertaSort>("recientes");
  const [publishOpen, setPublishOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = ofertas.filter((o) => {
      if (area && o.areaPractica !== area) return false;
      if (ciudad && o.ciudad !== ciudad) return false;
      if (contrato && o.tipoContrato !== contrato) return false;
      if (formato && o.formato !== formato) return false;
      if (q) {
        const hay = `${o.cargo} ${o.empresa} ${o.areaPractica}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === "remuneracion") {
      // Las que tienen monto/string con cifras primero; "a convenir" al final.
      const score = (r: string | null) => {
        if (!r) return 2;
        if (/[\d$]/.test(r)) return 0;
        return 1;
      };
      list = [...list].sort(
        (a, b) => score(a.remuneracion) - score(b.remuneracion),
      );
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [ofertas, query, area, ciudad, contrato, formato, sort]);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light flex justify-between items-center gap-4">
        <Link
          href="/dashboard/sala"
          className="hover:text-gz-gold transition-colors"
        >
          ← La Sala
        </Link>
        <nav className="flex items-center gap-5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase">
          <Link
            href="/dashboard/sala/ofertas/gestion"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Mis ofertas
          </Link>
        </nav>
      </div>

      <MastheadOfertas resultCount={filtered.length} />

      <FilterRowOfertas
        query={query}
        onQueryChange={setQuery}
        selectedArea={area}
        onAreaChange={setArea}
        selectedCiudad={ciudad}
        onCiudadChange={setCiudad}
        contratoFiltro={contrato}
        onContratoChange={setContrato}
        formatoFiltro={formato}
        onFormatoChange={setFormato}
        sort={sort}
        onSortChange={setSort}
        onPublish={() => setPublishOpen(true)}
      />

      <main className="max-w-[1400px] mx-auto px-7 py-8">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            className="grid gap-0 border-t border-l border-gz-rule bg-white"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {filtered.map((o) => (
              <OfertaTile key={o.id} {...o} />
            ))}
          </div>
        )}
      </main>

      <PublishSheet
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        eyebrow="La Sala · Ofertas laborales"
        title="Publicar oferta"
        subtitle="Cuéntale a la comunidad qué cargo estás buscando llenar."
      >
        <OfertaForm
          onCancel={() => setPublishOpen(false)}
          onSuccess={() => setPublishOpen(false)}
        />
      </PublishSheet>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-24 text-center border border-gz-rule bg-white">
      <p className="font-cormorant italic text-[22px] text-gz-ink-mid">
        No hay ofertas que coincidan con tu búsqueda.
      </p>
      <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
        Prueba quitando filtros o cambiando la ciudad.
      </p>
    </div>
  );
}
