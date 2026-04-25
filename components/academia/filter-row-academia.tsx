"use client";

import type { ReactNode } from "react";

/**
 * Shell editorial reutilizable para la barra de filtros de Academia.
 * Provee la estructura base — search bar con label IBM Mono + área de
 * chips/pills + área de sort — y deja que cada sección (Debates,
 * Expediente, Eventos, Ranking) llene los slots con sus filtros propios.
 *
 * Patrón heredado del FilterRow de Networking, pero con slots para que
 * cada sección configure sus propios chips sin duplicar la cáscara.
 */
export function FilterShellAcademia({
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  rightSlot,
  segmentedSlot,
  chipsSlot,
  sortSlot,
}: {
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (q: string) => void;
  /** Selectores que viven dentro de la barra de búsqueda principal — ej:
   *  rama / formato. Se renderizan a la derecha del input antes del CTA. */
  rightSlot?: ReactNode;
  /** Segmented control (período, estado activo/cerrado, etc.). Se
   *  renderiza centrado debajo de la barra de búsqueda. */
  segmentedSlot?: ReactNode;
  /** Rail horizontal de chips/pills (rama, formato secundario, etc.). */
  chipsSlot?: ReactNode;
  /** Selector de orden — siempre alineado a la derecha. */
  sortSlot?: ReactNode;
}) {
  return (
    <div className="max-w-[1400px] mx-auto px-7 pt-6">
      {/* Search bar */}
      <div className="flex flex-col md:flex-row items-stretch bg-white border border-gz-rule rounded-[4px] overflow-hidden max-w-4xl mx-auto shadow-sm">
        <div className="flex-1 flex flex-col justify-center px-5 py-3 md:border-r border-b md:border-b-0 border-gz-rule">
          <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
            {searchLabel}
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none placeholder:text-gz-ink-light/60 py-0.5"
          />
        </div>
        {rightSlot}
        <button
          type="submit"
          className="px-6 py-3 md:py-0 bg-gz-gold text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-ink transition-colors cursor-pointer"
        >
          Buscar →
        </button>
      </div>

      {/* Segmented control (centrado) */}
      {segmentedSlot && (
        <div className="mt-5 flex justify-center">{segmentedSlot}</div>
      )}

      {/* Chips rail (scrollable horizontal) */}
      {chipsSlot && (
        <div className="mt-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max py-1">{chipsSlot}</div>
        </div>
      )}

      {/* Sort row */}
      {sortSlot && (
        <div className="flex justify-end items-center gap-3 py-4 border-b border-gz-rule">
          <div className="flex items-center gap-2 font-cormorant italic text-[14px] text-gz-ink-mid">
            <span>Ordenar</span>
            {sortSlot}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Selector de Rama (área de práctica) embebido en la barra de búsqueda.
 * Se usa como rightSlot en FilterShellAcademia.
 */
export function RamaSelectAcademia({
  selectedRama,
  onRamaChange,
  options,
  label = "Rama",
}: {
  selectedRama: string | null;
  onRamaChange: (r: string | null) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  label?: string;
}) {
  return (
    <div className="flex flex-col justify-center px-5 py-3 md:border-r border-gz-rule md:min-w-[200px]">
      <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
        {label}
      </span>
      <select
        value={selectedRama ?? ""}
        onChange={(e) => onRamaChange(e.target.value || null)}
        className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none py-0.5 cursor-pointer"
      >
        <option value="">Todas</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Segmented control reutilizable — patrón usado en Ranking (período),
 * Debates (estado), Eventos (próximos / pasados / míos).
 */
export function SegmentedControlAcademia<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="inline-flex border border-gz-rule rounded-[3px] overflow-hidden bg-white">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-4 py-2 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase
                       border-r border-gz-rule last:border-r-0 transition cursor-pointer
                       ${
                         active
                           ? "bg-gz-ink text-gz-cream"
                           : "text-gz-ink-mid hover:bg-gz-cream hover:text-gz-ink"
                       }`}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={`ml-2 font-archivo text-[10px] ${active ? "text-gz-cream/70" : "text-gz-ink-light"}`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Chip de filtro reutilizable — pequeño botón pill con glifo Cormorant
 * y label IBM Mono. Usado en rails de rama, formato secundario, etc.
 */
export function FilterChipAcademia({
  active,
  onClick,
  label,
  glyph,
  disabled,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  glyph?: string;
  /** Si se pasa true, el chip queda en estado "lock" (Próximamente, etc.) */
  disabled?: boolean;
  /** Texto auxiliar a la derecha del label (ej: "Próximamente"). */
  badge?: string;
}) {
  const baseClass =
    "inline-flex items-center gap-1.5 px-3 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition whitespace-nowrap";

  if (disabled) {
    return (
      <span
        title={badge ?? "No disponible aún"}
        aria-disabled="true"
        className={`${baseClass} border-dashed border-gz-rule text-gz-ink-light/70 cursor-not-allowed`}
      >
        {glyph && (
          <span className="font-cormorant text-[13px] italic text-gz-ink-light/60">
            {glyph}
          </span>
        )}
        {label}
        {badge && (
          <span className="font-archivo text-[9px] tracking-[1px] normal-case text-gz-ink-light/70">
            · {badge}
          </span>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClass} cursor-pointer ${
        active
          ? "bg-gz-ink text-gz-cream border-gz-ink"
          : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"
      }`}
    >
      {glyph && (
        <span
          className={`font-cormorant text-[13px] italic ${active ? "text-gz-gold-bright" : "text-gz-gold"}`}
        >
          {glyph}
        </span>
      )}
      {label}
      {badge && (
        <span
          className={`font-archivo text-[9px] tracking-[1px] normal-case ${active ? "text-gz-cream/70" : "text-gz-ink-light"}`}
        >
          · {badge}
        </span>
      )}
    </button>
  );
}

/**
 * Sort select editorial — re-utiliza el styling del FilterRow de
 * Networking. Se pasa como sortSlot.
 */
export function SortSelectAcademia<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="font-ibm-mono text-[11px] tracking-[1px] uppercase text-gz-ink border-b border-gz-rule bg-transparent py-0.5 px-1 outline-none focus:border-gz-gold cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
