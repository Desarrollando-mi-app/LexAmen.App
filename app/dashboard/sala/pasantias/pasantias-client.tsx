"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MastheadPasantias } from "@/components/pasantias/masthead-pasantias";
import { FilterRowPasantias } from "@/components/pasantias/filter-row-pasantias";
import { PasantiaTile, type PasantiaTileProps } from "@/components/pasantias/pasantia-tile";

type Pasantia = Omit<PasantiaTileProps, "onFav" | "initialFav">;

export function PasantiasV4Client({
  pasantias,
}: {
  pasantias: Pasantia[];
}) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [tipo, setTipo] = useState<"TODAS" | "ofrezco" | "busco">("TODAS");
  const [sort, setSort] = useState<"recientes" | "deadline" | "remuneracion">(
    "recientes",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = pasantias.filter((p) => {
      if (area && p.areaPractica !== area) return false;
      if (ciudad && p.ciudad !== ciudad) return false;
      if (tipo !== "TODAS" && p.type !== tipo) return false;
      if (q) {
        const hay = `${p.titulo} ${p.empresa} ${p.estudio?.nombre ?? ""} ${p.user.firstName} ${p.user.lastName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === "deadline") {
      list = [...list].sort((a, b) => {
        const da = a.fechaLimite ? new Date(a.fechaLimite).getTime() : Infinity;
        const db = b.fechaLimite ? new Date(b.fechaLimite).getTime() : Infinity;
        return da - db;
      });
    } else if (sort === "remuneracion") {
      // Remuneradas primero, luego a convenir, luego no_pagada.
      const rank = (r: string) =>
        r === "pagada" ? 0 : r === "a_convenir" ? 1 : 2;
      list = [...list].sort(
        (a, b) => rank(a.remuneracion) - rank(b.remuneracion),
      );
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [pasantias, query, area, ciudad, tipo, sort]);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light flex justify-between items-center gap-4">
        <Link href="/dashboard/sala" className="hover:text-gz-gold transition-colors">
          ← La Sala
        </Link>
        <nav className="flex items-center gap-5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase">
          <Link
            href="/dashboard/sala/pasantias/gestion"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Mis publicaciones
          </Link>
          <Link
            href="/dashboard/sala/pasantias/gestion?tab=postulaciones"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Mis postulaciones
          </Link>
          <Link
            href="/dashboard/sala/pasantias/gestion?action=new"
            className="px-3 py-1.5 bg-gz-ink text-gz-cream rounded-[3px] hover:bg-gz-gold hover:text-gz-ink transition-colors"
          >
            Publicar →
          </Link>
        </nav>
      </div>

      <MastheadPasantias resultCount={filtered.length} />

      <FilterRowPasantias
        query={query}
        onQueryChange={setQuery}
        selectedArea={area}
        onAreaChange={setArea}
        selectedCiudad={ciudad}
        onCiudadChange={setCiudad}
        tipoFiltro={tipo}
        onTipoChange={setTipo}
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
            {filtered.map((p) => (
              <PasantiaTile key={p.id} {...p} />
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
        No hay pasantías que coincidan con tu búsqueda.
      </p>
      <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
        Prueba cambiando el área, la ciudad o el tipo de filtro.
      </p>
    </div>
  );
}
