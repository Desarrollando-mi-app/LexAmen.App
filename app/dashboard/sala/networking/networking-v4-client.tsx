"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MastheadNetworking } from "@/components/networking/masthead-networking";
import {
  FilterRowNetworking,
  type ColegaSort,
  type ConexionFilter,
  type EtapaFilter,
} from "@/components/networking/filter-row-networking";
import { ColegaTile } from "@/components/networking/colega-tile";
import type { ColegaTileData } from "@/lib/networking-helpers";

/**
 * Cliente V4 editorial para Networking. Directorio público con todos los
 * miembros activos de la comunidad — los que ya son colegas del usuario
 * y los que no — con filtros por región, ciudad, etapa profesional,
 * especialidad y conexión (Todos / Mis colegas / Otros). Lectura pura;
 * el detalle y la solicitud de colega viven en /dashboard/perfil/[userId].
 */
export function NetworkingV4Client({
  colegas,
}: {
  colegas: ColegaTileData[];
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<EtapaFilter>("TODAS");
  const [conexion, setConexion] = useState<ConexionFilter>("TODOS");
  const [area, setArea] = useState<string | null>(null);
  const [sort, setSort] = useState<ColegaSort>("recientes");

  /** Conteo total por bucket para el segmented control de conexión.
   * Se calcula sobre el universo completo (sin aplicar filtro de conexión)
   * para que los números no oscilen al alternar tabs. */
  const conexionCounts = useMemo(() => {
    const colegasCount = colegas.filter((c) => c.conexion === "accepted").length;
    return {
      todos: colegas.length,
      colegas: colegasCount,
      otros: colegas.length - colegasCount,
    };
  }, [colegas]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = colegas.filter((c) => {
      if (region && c.region !== region) return false;
      if (ciudad && c.ciudad !== ciudad) return false;
      if (etapa !== "TODAS" && c.etapaActual !== etapa) return false;
      if (area && !c.especialidades.includes(area)) return false;
      if (conexion === "COLEGAS" && c.conexion !== "accepted") return false;
      if (conexion === "OTROS" && c.conexion === "accepted") return false;
      if (q) {
        const hay = `${c.firstName} ${c.lastName} ${c.universidad ?? ""} ${c.empleoActual ?? ""} ${c.ciudad ?? ""}`.toLowerCase();
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
  }, [colegas, query, region, ciudad, etapa, conexion, area, sort]);

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
        selectedCiudad={ciudad}
        onCiudadChange={setCiudad}
        etapa={etapa}
        onEtapaChange={setEtapa}
        conexion={conexion}
        onConexionChange={setConexion}
        conexionCounts={conexionCounts}
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
        No hay personas que coincidan con esa búsqueda.
      </p>
      <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
        Prueba quitando filtros, cambiando de región / ciudad, o ampliando a
        &ldquo;Todos&rdquo; para ver también a quienes aún no son tus colegas.
      </p>
    </div>
  );
}
