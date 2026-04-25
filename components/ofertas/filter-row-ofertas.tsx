"use client";

import { AREAS_PRACTICA, CIUDADES_CHILE, TIPOS_CONTRATO, FORMATOS_TRABAJO } from "@/lib/sala-constants";

const GLYPHS = ["§", "†", "¶", "‡", "⸸", "℥", "℟", "※", "∴", "⸘", "⚖", "⁘", "☙", "∞"];

export type OfertaSort = "recientes" | "remuneracion";

interface FilterRowOfertasProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedArea: string | null;
  onAreaChange: (a: string | null) => void;
  selectedCiudad: string | null;
  onCiudadChange: (c: string | null) => void;
  contratoFiltro: string | null;
  onContratoChange: (c: string | null) => void;
  formatoFiltro: string | null;
  onFormatoChange: (f: string | null) => void;
  sort: OfertaSort;
  onSortChange: (s: OfertaSort) => void;
}

export function FilterRowOfertas({
  query,
  onQueryChange,
  selectedArea,
  onAreaChange,
  selectedCiudad,
  onCiudadChange,
  contratoFiltro,
  onContratoChange,
  formatoFiltro,
  onFormatoChange,
  sort,
  onSortChange,
}: FilterRowOfertasProps) {
  return (
    <div className="max-w-[1400px] mx-auto px-7 pt-6">
      {/* Search bar */}
      <div className="flex items-stretch bg-white border border-gz-rule rounded-[4px] overflow-hidden max-w-4xl mx-auto shadow-sm">
        <div className="flex-1 flex flex-col justify-center px-5 py-3 border-r border-gz-rule">
          <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
            Empresa, cargo o palabra clave
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="ej. Asociado civil, contraloría, fiscalía…"
            className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none placeholder:text-gz-ink-light/60 py-0.5"
          />
        </div>
        <div className="flex flex-col justify-center px-5 py-3 border-r border-gz-rule min-w-[160px]">
          <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
            Ciudad
          </span>
          <select
            value={selectedCiudad ?? ""}
            onChange={(e) => onCiudadChange(e.target.value || null)}
            className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none py-0.5"
          >
            <option value="">Todas</option>
            {CIUDADES_CHILE.map((c) => (
              <option key={c} value={c}>
                {c}
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

      {/* Area rail */}
      <div className="mt-6 overflow-x-auto">
        <div className="flex gap-0 border-y border-gz-rule min-w-max">
          <CategoryPill
            active={!selectedArea}
            onClick={() => onAreaChange(null)}
            glyph="∗"
            label="Todas las áreas"
          />
          {AREAS_PRACTICA.slice(0, 12).map((a, i) => (
            <CategoryPill
              key={a.value}
              active={selectedArea === a.value}
              onClick={() => onAreaChange(a.value)}
              glyph={GLYPHS[i % GLYPHS.length]}
              label={a.label.replace("Derecho ", "")}
            />
          ))}
        </div>
      </div>

      {/* Filter row */}
      <div className="flex justify-between items-center gap-3 py-4 border-b border-gz-rule flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {/* Contrato */}
          <FilterChip
            active={contratoFiltro === null}
            onClick={() => onContratoChange(null)}
            label="Todo contrato"
          />
          {TIPOS_CONTRATO.slice(0, 4).map((t) => (
            <FilterChip
              key={t.value}
              active={contratoFiltro === t.value}
              onClick={() => onContratoChange(t.value)}
              label={t.label}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Formato */}
          <select
            value={formatoFiltro ?? ""}
            onChange={(e) => onFormatoChange(e.target.value || null)}
            className="font-ibm-mono text-[11px] tracking-[1px] uppercase text-gz-ink border-b border-gz-rule bg-transparent py-0.5 px-1 outline-none focus:border-gz-gold"
            aria-label="Formato"
          >
            <option value="">Cualquier formato</option>
            {FORMATOS_TRABAJO.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Orden */}
          <div className="flex items-center gap-2 font-cormorant italic text-[14px] text-gz-ink-mid">
            <span>Ordenar</span>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as OfertaSort)}
              className="font-ibm-mono text-[11px] tracking-[1px] uppercase text-gz-ink border-b border-gz-rule bg-transparent py-0.5 px-1 outline-none focus:border-gz-gold"
            >
              <option value="recientes">Más recientes</option>
              <option value="remuneracion">Mejor remuneradas</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryPill({
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
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition
                 ${active
                   ? "bg-gz-ink text-gz-cream border-gz-ink"
                   : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"}`}
    >
      {label}
    </button>
  );
}
