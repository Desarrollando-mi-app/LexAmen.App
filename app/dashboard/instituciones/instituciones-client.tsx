"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

interface InstitucionData {
  id: number;
  nombre: string;
  area: string;
  grupo: string;
  descripcion: string;
  tag: string;
  articulosCC: string | null;
  articulosCPC: string | null;
  articulosCOT: string | null;
  totalExercicios: number;
  done: number;
  percent: number;
}

const AREA_FILTERS = [
  { value: "ALL", label: "Todas" },
  { value: "CIVIL", label: "Civil" },
  { value: "PROCESAL", label: "Procesal" },
  { value: "ORGANICO", label: "Orgánico" },
  { value: "TRANSVERSAL", label: "Transversal" },
];

const TAG_COLORS: Record<string, string> = {
  fundamental: "bg-gz-gold/15 text-gz-gold",
  complejo: "bg-gz-burgundy/15 text-gz-burgundy",
  transversal: "bg-gz-navy/15 text-gz-navy",
  técnico: "bg-gz-sage/15 text-gz-sage",
  importante: "bg-gz-gold/10 text-gz-gold",
  específico: "bg-gz-ink-light/10 text-gz-ink-mid",
  básico: "bg-gz-sage/10 text-gz-sage",
  frecuente: "bg-gz-burgundy/10 text-gz-burgundy",
};

export function InstitucionesClient({
  instituciones,
}: {
  instituciones: InstitucionData[];
}) {
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("ALL");

  const filtered = useMemo(() => {
    let items = instituciones;
    if (areaFilter !== "ALL") {
      items = items.filter((i) => i.area === areaFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.nombre.toLowerCase().includes(q) ||
          i.descripcion.toLowerCase().includes(q) ||
          i.grupo.toLowerCase().includes(q)
      );
    }
    return items;
  }, [instituciones, areaFilter, search]);

  // Group by grupo
  const grouped = useMemo(() => {
    const map = new Map<string, InstitucionData[]>();
    for (const inst of filtered) {
      const existing = map.get(inst.grupo) || [];
      existing.push(inst);
      map.set(inst.grupo, existing);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8">
      {/* Header */}
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium mb-1">
        Índice Temático
      </p>
      <div className="flex items-center gap-3 mb-1">
        <Image
          src="/brand/logo-sello.svg"
          alt="Studio Iuris"
          width={80}
          height={80}
          className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
        />
        <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
          Instituciones Jurídicas
        </h1>
      </div>
      <p className="font-archivo text-[14px] text-gz-ink-mid mt-1 mb-4">
        {instituciones.length} instituciones · Estudia por tema, no por artículo
      </p>
      <div className="h-[2px] mb-6" style={{ backgroundColor: "var(--gz-rule-dark)" }} />

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar institución..."
          className="flex-1 rounded-[3px] border border-gz-rule bg-white px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors"
        />
        <div className="flex gap-1">
          {AREA_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setAreaFilter(f.value)}
              className={`px-3 py-2 rounded-[3px] font-archivo text-[12px] font-semibold transition-colors ${
                areaFilter === f.value
                  ? "bg-gz-gold text-white"
                  : "bg-white border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Groups */}
      {grouped.map(([grupo, items]) => (
        <div key={grupo} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-cormorant text-[20px] font-bold text-gz-ink">
              {grupo}
            </h2>
            <span className="font-ibm-mono text-[10px] text-gz-ink-light">
              {items.length}
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--gz-rule)" }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((inst) => (
              <Link
                key={inst.id}
                href={`/dashboard/instituciones/${inst.id}`}
                className="group block border border-gz-rule rounded-[4px] p-5 transition-all hover:border-gz-gold hover:shadow-sm bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-cormorant text-[18px] font-bold text-gz-ink group-hover:text-gz-gold transition-colors">
                    {inst.nombre}
                  </h3>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded-sm font-ibm-mono text-[9px] uppercase tracking-[1px] ${
                      TAG_COLORS[inst.tag] || "bg-gz-cream-dark text-gz-ink-light"
                    }`}
                  >
                    {inst.tag}
                  </span>
                </div>

                <p className="font-archivo text-[12px] text-gz-ink-mid mt-2 line-clamp-2">
                  {inst.descripcion}
                </p>

                {/* Articles reference */}
                {(inst.articulosCC || inst.articulosCPC || inst.articulosCOT) && (
                  <p className="font-ibm-mono text-[9px] text-gz-ink-light mt-2">
                    {[inst.articulosCC, inst.articulosCPC, inst.articulosCOT]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                {/* Progress bar + count */}
                <div className="mt-3 flex items-center gap-2">
                  <div
                    className="flex-1 h-1.5 rounded-sm overflow-hidden"
                    style={{ backgroundColor: "var(--gz-cream-dark)" }}
                  >
                    <div
                      className="h-full rounded-sm bg-gz-gold transition-all"
                      style={{ width: `${inst.percent}%` }}
                    />
                  </div>
                  <span className="font-ibm-mono text-[10px] text-gz-ink-light w-8 text-right">
                    {inst.percent}%
                  </span>
                </div>
                <p className="font-ibm-mono text-[9px] text-gz-ink-light mt-1">
                  {inst.totalExercicios} ejercicios
                </p>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-center font-cormorant italic text-[17px] text-gz-ink-light py-12">
          No se encontraron instituciones para esta búsqueda.
        </p>
      )}
    </div>
  );
}
