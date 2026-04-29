"use client";

// ─── InvCitaModal — modal de citas internas ────────────────────
//
// Dos pasos:
//   1) Búsqueda con debounce 300ms a /api/investigaciones/search?q=…
//      Resultados con sello del autor, título, "Por X · tipo · año ·
//      Citado N veces". Si <48h, badge rojo + tooltip "Disponible para
//      citas desde {fecha}". No se puede seleccionar lo no-citable.
//   2) Confirmación: textarea opcional contextSnippet → onInsert(...)

import { useState, useEffect, useRef } from "react";

type SearchItem = {
  id: string;
  titulo: string;
  authorId: string;
  authorName: string;
  authorLastName: string;
  authorAvatarUrl: string | null;
  tipo: string;
  area: string;
  publishedAt: string;
  year: number;
  citationsInternal: number;
  isCitable: boolean;
  citableSince: string | null;
};

export type CitaPayload = {
  citedInvId: string;
  citedAuthor: string;
  citedYear: number;
  citedTitle: string;
  contextSnippet?: string;
};

export function InvCitaModal({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (cita: CitaPayload) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [snippet, setSnippet] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce búsqueda 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/investigaciones/search?q=${encodeURIComponent(q.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Escape cierra
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function fmtCitableSince(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString("es-CL", {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleInsert() {
    if (!selected) return;
    onInsert({
      citedInvId: selected.id,
      citedAuthor: selected.authorLastName,
      citedYear: selected.year,
      citedTitle: selected.titulo,
      contextSnippet: snippet.trim() || undefined,
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-inv-ink/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Insertar cita"
        className="fixed left-1/2 top-[8vh] z-50 w-[92vw] max-w-[640px] -translate-x-1/2 rounded-[3px] border border-inv-ink bg-inv-paper shadow-2xl overflow-hidden"
      >
        {/* Rail tricolor superior */}
        <div className="h-[3px] bg-gradient-to-r from-inv-ocre via-inv-tinta-roja to-inv-ocre" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-inv-rule flex items-center justify-between">
          <div>
            <p className="font-cormorant italic text-[11px] uppercase tracking-[2.5px] text-inv-ocre">
              {selected ? "— Paso II —" : "— Paso I —"}
            </p>
            <h2 className="font-cormorant text-[22px] font-medium leading-tight text-inv-ink">
              <em>
                {selected ? "Cómo citas este trabajo" : "Buscar investigación"}
              </em>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-cormorant italic text-[12px] tracking-[1px] uppercase text-inv-ink-3 hover:text-inv-ink cursor-pointer border border-inv-rule px-2 py-1"
          >
            ESC
          </button>
        </div>

        {!selected && (
          <div>
            {/* Input */}
            <div className="px-6 py-4 border-b border-inv-rule">
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por título, autor o palabra clave…"
                className="w-full bg-transparent border-none outline-none font-cormorant italic text-[18px] text-inv-ink placeholder:text-inv-ink-4 focus:ring-0"
              />
            </div>

            {/* Resultados */}
            <div className="max-h-[50vh] overflow-y-auto">
              {q.trim().length < 2 ? (
                <p className="px-6 py-12 text-center font-cormorant italic text-[15px] text-inv-ink-3">
                  Escribe al menos 2 caracteres para empezar.
                </p>
              ) : loading ? (
                <p className="px-6 py-10 text-center font-cormorant italic text-[14px] text-inv-ink-3">
                  Buscando…
                </p>
              ) : items.length === 0 ? (
                <p className="px-6 py-10 text-center font-cormorant italic text-[15px] text-inv-ink-3">
                  Sin resultados para &ldquo;{q}&rdquo;.
                </p>
              ) : (
                <ul>
                  {items.map((it) => {
                    const initials = it.authorName
                      .split(" ")
                      .map((p) => p[0] ?? "")
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <li
                        key={it.id}
                        className={`flex items-start gap-3 px-6 py-3 border-b border-inv-rule-2 transition-colors ${
                          it.isCitable
                            ? "cursor-pointer hover:bg-inv-paper-2"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => {
                          if (it.isCitable) setSelected(it);
                        }}
                        title={
                          it.isCitable
                            ? undefined
                            : `Disponible para citas desde ${
                                it.citableSince
                                  ? fmtCitableSince(it.citableSince)
                                  : "—"
                              }`
                        }
                      >
                        <span
                          className="inv-sello shrink-0"
                          style={{ width: 36, height: 36, fontSize: 12 }}
                        >
                          {it.authorAvatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={it.authorAvatarUrl}
                              alt=""
                              className="rounded-full object-cover absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)]"
                            />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="font-cormorant text-[16px] font-medium leading-snug text-inv-ink line-clamp-2">
                            {it.titulo}
                          </p>
                          <p className="font-crimson-pro italic text-[12px] text-inv-ink-3 mt-0.5">
                            Por {it.authorName} · {it.tipo} · {it.year}
                            {it.citationsInternal > 0 && (
                              <>
                                {" · "}
                                <span className="text-inv-ocre">
                                  Citado {it.citationsInternal}{" "}
                                  {it.citationsInternal === 1 ? "vez" : "veces"}
                                </span>
                              </>
                            )}
                          </p>
                          {!it.isCitable && (
                            <p className="mt-1 inline-block font-crimson-pro text-[10px] uppercase tracking-[1.5px] text-inv-tinta-roja border border-inv-tinta-roja/40 px-2 py-0.5">
                              Disponible desde{" "}
                              {it.citableSince
                                ? fmtCitableSince(it.citableSince)
                                : "—"}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {selected && (
          <div className="px-6 py-5">
            {/* Card resumen del seleccionado */}
            <div className="rounded-[3px] border border-inv-rule bg-inv-paper-2 p-4 mb-4">
              <p className="font-cormorant text-[16px] font-medium leading-snug text-inv-ink">
                {selected.titulo}
              </p>
              <p className="font-crimson-pro italic text-[12px] text-inv-ink-3 mt-1">
                Por {selected.authorName} · {selected.tipo} · {selected.year}
              </p>
            </div>

            <label className="block font-cormorant italic text-[12px] uppercase tracking-[2px] text-inv-ink-3 mb-2">
              ¿Cómo citas este trabajo? (opcional)
            </label>
            <textarea
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              placeholder="Snippet del párrafo donde citas, para mostrar a los lectores que vean tu trabajo desde 'Citado por'…"
              rows={3}
              className="w-full font-crimson-pro text-[14px] leading-[1.5] bg-inv-paper border border-inv-rule p-3 outline-none text-inv-ink resize-y focus:border-inv-ocre"
              maxLength={400}
            />
            <p className="mt-1 text-right font-crimson-pro italic text-[10px] text-inv-ink-4">
              {snippet.length} / 400
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setSnippet("");
                }}
                className="font-crimson-pro text-[12px] tracking-[1px] uppercase text-inv-ink-3 hover:text-inv-ink cursor-pointer"
              >
                ← Volver al buscador
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="bg-inv-ink text-inv-paper font-crimson-pro text-[13px] tracking-[1px] uppercase px-6 py-2.5 cursor-pointer hover:bg-inv-ocre transition-colors"
              >
                Insertar cita
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
