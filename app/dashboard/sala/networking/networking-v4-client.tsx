"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MastheadNetworking } from "@/components/networking/masthead-networking";
import {
  FilterRowNetworking,
  type ColegaSort,
  type EtapaFilter,
} from "@/components/networking/filter-row-networking";
import { ColegaTile } from "@/components/networking/colega-tile";
import type { ColegaTileData } from "@/lib/networking-helpers";

/**
 * Cliente V4 editorial para Networking. Lista pública de colegas activos,
 * con filtros por región, etapa profesional y especialidad. Lectura pura;
 * el detalle vive en /dashboard/perfil/[userId].
 */
export function NetworkingV4Client({
  colegas,
}: {
  colegas: ColegaTileData[];
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<EtapaFilter>("TODAS");
  const [area, setArea] = useState<string | null>(null);
  const [sort, setSort] = useState<ColegaSort>("recientes");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = colegas.filter((c) => {
      if (region && c.region !== region) return false;
      if (etapa !== "TODAS" && c.etapaActual !== etapa) return false;
      if (area && !c.especialidades.includes(area)) return false;
      if (q) {
        const hay = `${c.firstName} ${c.lastName} ${c.universidad ?? ""} ${c.empleoActual ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === "grado") {
      list = [...list].sort((a, b) => b.grado - a.grado || b.xp - a.xp);
    } else if (sort === "alfabetico") {
      list = [...list].sort((a, b) =>
        a.lastName.localeCompare(b.lastName, "es", { sensitivity: "base" }),
      );
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [colegas, query, region, etapa, area, sort]);

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
            href="/dashboard/perfil/configuracion"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Mi perfil
          </Link>
        </nav>
      </div>

      <MastheadNetworking resultCount={filtered.length} />

      <FilterRowNetworking
        query={query}
        onQueryChange={setQuery}
        selectedRegion={region}
        onRegionChange={setRegion}
        etapa={etapa}
        onEtapaChange={setEtapa}
        selectedArea={area}
        onAreaChange={setArea}
        sort={sort}
        onSortChange={setSort}
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
            {filtered.map((c) => (
              <ColegaTile key={c.id} {...c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-24 text-center border border-gz-rule bg-white">
      <p className="font-cormorant italic text-[22px] text-gz-ink-mid">
        No hay colegas que coincidan con esa búsqueda.
      </p>
      <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
        Prueba quitando filtros o cambiando la región.
      </p>
    </div>
  );
}
