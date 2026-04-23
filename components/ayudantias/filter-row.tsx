"use client";

import { MATERIAS_SALA } from "@/lib/ayudantia-constants";

// glifos tipográficos → acompañan cada categoría, como en el mockup
const GLYPHS = ["§", "†", "¶", "‡", "⸸", "℥", "℟", "※", "∴", "⸘", "⚖", "⁘", "☙", "∞"];

interface FilterRowProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedMateria: string | null;
  onMateriaChange: (m: string | null) => void;
  tipoFiltro: "TODAS" | "OFREZCO" | "BUSCO";
  onTipoChange: (t: "TODAS" | "OFREZCO" | "BUSCO") => void;
  sort: "recientes" | "rating" | "precio";
  onSortChange: (s: "recientes" | "rating" | "precio") => void;
}

/**
 * Search bar + category rail + filter row. Combina 3 regiones del mockup V4
 * en un solo client component para compartir estado.
 */
export function FilterRow({
  query,
  onQueryChange,
  selectedMateria,
  onMateriaChange,
  tipoFiltro,
  onTipoChange,
  sort,
  onSortChange,
}: FilterRowProps) {
  return (
    <div className="max-w-[1400px] mx-auto px-7 pt-6">
      {/* Search bar */}
      <div className="flex items-stretch bg-white border border-gz-rule rounded-[4px] overflow-hidden max-w-3xl mx-auto shadow-sm">
        <div className="flex-1 flex flex-col justify-center px-5 py-3 border-r border-gz-rule">
          <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
            Materia o título
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="ej. obligaciones, certamen penal…"
            className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none placeholder:text-gz-ink-light/60 py-0.5"
          />
        </div>
        <div className="flex flex-col justify-center px-5 py-3 border-r border-gz-rule min-w-[160px]">
          <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
            Materia
          </span>
          <select
            value={selectedMateria ?? ""}
            onChange={(e) => onMateriaChange(e.target.value || null)}
            className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none py-0.5"
          >
            <option value="">Todas</option>
            {MATERIAS_SALA.map((m) => (
              <option key={m} value={m}>
                {m}
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

      {/* Category rail */}
      <div className="mt-6 overflow-x-auto">
        <div className="flex gap-0 border-y border-gz-rule min-w-max">
          <CategoryPill
            active={!selectedMateria}
            onClick={() => onMateriaChange(null)}
            glyph="∗"
            label="Todas"
          />
          {MATERIAS_SALA.slice(0, 10).map((m, i) => (
            <CategoryPill
              key={m}
              active={selectedMateria === m}
              onClick={() => onMateriaChange(m)}
              glyph={GLYPHS[i % GLYPHS.length]}
              label={m.replace("Derecho ", "")}
            />
          ))}
        </div>
      </div>

      {/* Filter row */}
      <div className="flex justify-between items-center gap-3 py-4 border-b border-gz-rule flex-wrap">
        <div className="flex gap-2">
          {(["TODAS", "OFREZCO", "BUSCO"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTipoChange(t)}
              className={`px-3.5 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition
                         ${tipoFiltro === t
                           ? "bg-gz-ink text-gz-cream border-gz-ink"
                           : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"}`}
            >
              {t === "TODAS" ? "Todas" : t === "OFREZCO" ? "Ofrecen" : "Buscan"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 font-cormorant italic text-[14px] text-gz-ink-mid">
          <span>Ordenar por</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as typeof sort)}
            className="font-ibm-mono text-[11px] tracking-[1px] uppercase text-gz-ink border-b border-gz-rule bg-transparent py-0.5 px-1 outline-none focus:border-gz-gold"
          >
            <option value="recientes">Más recientes</option>
            <option value="rating">Mejor valoradas</option>
            <option value="precio">Menor precio</option>
          </select>
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
