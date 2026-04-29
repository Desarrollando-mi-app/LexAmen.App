"use client";

// ─── InstitucionAutocomplete ──────────────────────────────────
//
// Input con búsqueda fuzzy en `instituciones[]` (filtrado por substring
// case-insensitive en nombre o grupo). Selección como pills tags
// removibles. Respeta `max` (deshabilita más selección al alcanzarlo).

import { useState, useMemo, useRef } from "react";

type Institucion = {
  id: number;
  nombre: string;
  area: string;
  grupo: string;
};

export function InstitucionAutocomplete({
  instituciones,
  selected,
  onChange,
  max,
}: {
  instituciones: Institucion[];
  selected: number[];
  onChange: (ids: number[]) => void;
  max: number;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedItems = useMemo(
    () => instituciones.filter((i) => selectedSet.has(i.id)),
    [instituciones, selectedSet],
  );

  const limitReached = selected.length >= max;

  const filtered = useMemo(() => {
    if (!q.trim()) return [];
    const ql = q.toLowerCase().trim();
    return instituciones
      .filter(
        (i) =>
          !selectedSet.has(i.id) &&
          (i.nombre.toLowerCase().includes(ql) ||
            i.grupo.toLowerCase().includes(ql)),
      )
      .slice(0, 8);
  }, [q, instituciones, selectedSet]);

  function add(id: number) {
    if (limitReached) return;
    onChange([...selected, id]);
    setQ("");
    inputRef.current?.focus();
  }

  function remove(id: number) {
    onChange(selected.filter((x) => x !== id));
  }

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-[3px] border border-inv-rule bg-inv-paper px-2 py-1.5 transition-colors focus-within:border-inv-ocre"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedItems.map((it) => (
          <span
            key={it.id}
            className="inline-flex items-center gap-1 bg-inv-ocre/[0.10] border border-inv-ocre/30 px-2 py-0.5 font-crimson-pro text-[11px] text-inv-ocre"
          >
            {it.nombre}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(it.id);
              }}
              className="ml-1 inline-flex h-4 w-4 items-center justify-center hover:bg-inv-ink/10 transition-colors cursor-pointer"
              aria-label={`Remover ${it.nombre}`}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={
            limitReached
              ? `Máximo ${max} alcanzado`
              : selectedItems.length === 0
                ? "Buscar institución…"
                : ""
          }
          disabled={limitReached}
          className="flex-1 min-w-[140px] bg-transparent border-none outline-none font-crimson-pro text-[13px] text-inv-ink placeholder:text-inv-ink-4 disabled:cursor-not-allowed focus:ring-0"
        />
      </div>

      <p className="mt-1.5 font-cormorant italic text-[11px] text-inv-ink-3">
        {selected.length} / {max} ·{" "}
        {limitReached ? "máximo alcanzado" : "elige al menos 3"}
      </p>

      {/* Dropdown */}
      {open && filtered.length > 0 && !limitReached && (
        <div className="relative">
          <div className="absolute top-1 left-0 right-0 z-20 border border-inv-rule bg-inv-paper shadow-lg max-h-[280px] overflow-y-auto">
            {filtered.map((it) => (
              <button
                key={it.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(it.id);
                }}
                className="block w-full text-left px-3 py-2 hover:bg-inv-paper-2 transition-colors cursor-pointer border-b border-inv-rule-2 last:border-b-0"
              >
                <p className="font-cormorant text-[14px] font-medium text-inv-ink">
                  {it.nombre}
                </p>
                <p className="font-crimson-pro italic text-[11px] text-inv-ink-3">
                  {it.grupo}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
