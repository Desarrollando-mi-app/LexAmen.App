"use client";

// ─── InvFiltros — pills + select + búsqueda con debounce ─────
//
// Sprint 1: ya funcional. Los filtros se reflejan en URL (?tipo, ?area,
// ?search) para ser compartibles. Debounce 300ms en search.

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TIPOS_INVESTIGACION,
  TIPOS_INVESTIGACION_LABELS_CORTOS,
  AREAS_DERECHO,
  AREAS_DERECHO_LABELS,
  type TipoInvestigacion,
} from "@/lib/investigaciones-constants";

const TIPO_PILLS: { value: TipoInvestigacion | ""; label: string }[] = [
  { value: "", label: "Todas" },
  ...TIPOS_INVESTIGACION.map((t) => ({
    value: t,
    label: TIPOS_INVESTIGACION_LABELS_CORTOS[t],
  })),
];

export function InvFiltros() {
  const router = useRouter();
  const sp = useSearchParams();
  const tipo = sp.get("tipo") ?? "";
  const area = sp.get("area") ?? "";
  const search = sp.get("search") ?? "";

  const [searchDraft, setSearchDraft] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setSearchDraft(search), [search]);

  function setParam(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    url.searchParams.delete("page"); // reset paginación al filtrar
    router.replace(url.pathname + url.search, { scroll: false });
  }

  function handleSearch(v: string) {
    setSearchDraft(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("search", v.trim());
    }, 300);
  }

  return (
    <div className="flex gap-3 items-center flex-wrap p-4 px-5 bg-inv-paper-2 border border-inv-rule mb-9">
      <span className="font-cormorant italic text-[13px] text-inv-ink-3">
        Tipo
      </span>
      <div className="flex items-center">
        {TIPO_PILLS.map((p, i) => {
          const active = p.value === tipo;
          return (
            <button
              key={p.value || "all"}
              type="button"
              onClick={() => setParam("tipo", p.value)}
              className={`font-crimson-pro text-[12px] px-3 py-1 cursor-pointer transition-colors tracking-[0.5px] ${
                i < TIPO_PILLS.length - 1 ? "border-r border-inv-rule" : ""
              } ${
                active
                  ? "text-inv-ink font-semibold italic"
                  : "text-inv-ink-3 hover:text-inv-ocre"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <span className="font-cormorant italic text-[13px] text-inv-ink-3 border-l border-inv-rule pl-4">
        Área
      </span>
      <select
        value={area}
        onChange={(e) => setParam("area", e.target.value)}
        className="font-crimson-pro text-[13px] px-3 py-1.5 border border-inv-rule bg-inv-paper cursor-pointer text-inv-ink-2 outline-none focus:border-inv-ocre"
      >
        <option value="">Todas las áreas</option>
        {AREAS_DERECHO.map((a) => (
          <option key={a} value={a}>
            {AREAS_DERECHO_LABELS[a]}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={searchDraft}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Buscar por título o abstract…"
        className="flex-1 min-w-[200px] font-cormorant italic text-[14px] px-3 py-1.5 border border-inv-rule bg-inv-paper outline-none text-inv-ink placeholder:text-inv-ink-4 focus:border-inv-ocre"
      />
    </div>
  );
}
