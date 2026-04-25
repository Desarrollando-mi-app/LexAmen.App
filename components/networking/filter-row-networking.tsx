"use client";

import { AREAS_PRACTICA } from "@/lib/sala-constants";
import { REGIONES_CHILE } from "@/lib/regiones-chile";

const GLYPHS = ["§", "†", "¶", "‡", "⸸", "℥", "℟", "※", "∴", "⸘", "⚖", "⁘"];

export type ColegaSort = "recientes" | "grado" | "alfabetico";
export type EtapaFilter = "TODAS" | "estudiante" | "egresado" | "abogado";

interface FilterRowNetworkingProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedRegion: string | null;
  onRegionChange: (r: string | null) => void;
  etapa: EtapaFilter;
  onEtapaChange: (e: EtapaFilter) => void;
  selectedArea: string | null;
  onAreaChange: (a: string | null) => void;
  sort: ColegaSort;
  onSortChange: (s: ColegaSort) => void;
}

export function FilterRowNetworking({
  query,
  onQueryChange,
  selectedRegion,
  onRegionChange,
  etapa,
  onEtapaChange,
  selectedArea,
  onAreaChange,
  sort,
  onSortChange,
}: FilterRowNetworkingProps) {
  return (
    <div className="max-w-[1400px] mx-auto px-7 pt-6">
      {/* Search bar */}
      <div className="flex items-stretch bg-white border border-gz-rule rounded-[4px] overflow-hidden max-w-4xl mx-auto shadow-sm">
        <div className="flex-1 flex flex-col justify-center px-5 py-3 border-r border-gz-rule">
          <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
            Nombre, universidad o estudio
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="ej. María González, Universidad de Chile…"
            className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none placeholder:text-gz-ink-light/60 py-0.5"
          />
        </div>
        <div className="flex flex-col justify-center px-5 py-3 border-r border-gz-rule min-w-[220px]">
          <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
            Región
          </span>
          <select
            value={selectedRegion ?? ""}
            onChange={(e) => onRegionChange(e.target.value || null)}
            className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none py-0.5"
          >
            <option value="">Todas</option>
            {REGIONES_CHILE.map((r) => (
              <option key={r} value={r}>
                {r.replace(/^Región (de |del |de la |Metropolitana de )/, "")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-6 bg-gz-gold text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-ink transition-colors"
        >
          Buscar →
        </button>
      </div>

      {/* Etapa rail */}
      <div className="mt-6 overflow-x-auto">
        <div className="flex gap-0 border-y border-gz-rule min-w-max">
          <EtapaPill
            active={etapa === "TODAS"}
            onClick={() => onEtapaChange("TODAS")}
            glyph="∗"
            label="Todos los colegas"
          />
          <EtapaPill
            active={etapa === "estudiante"}
            onClick={() => onEtapaChange("estudiante")}
            glyph="§"
            label="Estudiantes"
          />
          <EtapaPill
            active={etapa === "egresado"}
            onClick={() => onEtapaChange("egresado")}
            glyph="¶"
            label="Egresados"
          />
          <EtapaPill
            active={etapa === "abogado"}
            onClick={() => onEtapaChange("abogado")}
            glyph="⚖"
            label="Abogados"
          />
        </div>
      </div>

      {/* Area rail (especialidades) */}
      <div className="mt-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max py-1">
          <FilterChip
            active={selectedArea === null}
            onClick={() => onAreaChange(null)}
            label="Toda especialidad"
          />
          {AREAS_PRACTICA.slice(0, 12).map((a, i) => (
            <FilterChip
              key={a.value}
              active={selectedArea === a.value}
              onClick={() => onAreaChange(a.value)}
              label={a.label.replace("Derecho ", "")}
              glyph={GLYPHS[i % GLYPHS.length]}
            />
          ))}
        </div>
      </div>

      {/* Sort row */}
      <div className="flex justify-end items-center gap-3 py-4 border-b border-gz-rule">
        <div className="flex items-center gap-2 font-cormorant italic text-[14px] text-gz-ink-mid">
          <span>Ordenar</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ColegaSort)}
            className="font-ibm-mono text-[11px] tracking-[1px] uppercase text-gz-ink border-b border-gz-rule bg-transparent py-0.5 px-1 outline-none focus:border-gz-gold"
          >
            <option value="recientes">Más recientes</option>
            <option value="grado">Mayor grado</option>
            <option value="alfabetico">Apellido (A→Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function EtapaPill({
  active,
  onClick,
  glyph,
  label,
}: {
  active: boolean;
  onClick: () => void;
  glyph: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-r border-gz-rule last:border-r-0
                 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase transition whitespace-nowrap
                 ${active
                   ? "bg-gz-ink text-gz-cream"
                   : "text-gz-ink-mid hover:bg-gz-cream hover:text-gz-ink"}`}
    >
      <span className={`font-cormorant text-[16px] italic ${active ? "text-gz-gold-bright" : "text-gz-gold"}`}>
        {glyph}
      </span>
      {label}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  glyph,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  glyph?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition whitespace-nowrap
                 ${active
                   ? "bg-gz-ink text-gz-cream border-gz-ink"
                   : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"}`}
    >
      {glyph && (
        <span
          className={`font-cormorant text-[13px] italic ${active ? "text-gz-gold-bright" : "text-gz-gold"}`}
        >
          {glyph}
        </span>
      )}
      {label}
    </button>
  );
}
