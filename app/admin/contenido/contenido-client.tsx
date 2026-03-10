"use client";

import { useEffect, useState, useCallback } from "react";

type Tab = "flashcards" | "mcq" | "reports";

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  rama: string;
  codigo: string;
  libro: string;
  titulo: string;
  parrafo: string | null;
  dificultad: string;
}

interface MCQItem {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
  rama: string;
  codigo: string;
  libro: string;
  titulo: string;
  dificultad: string;
}

interface ReportItem {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  userName: string;
}

interface ContentData {
  items: (FlashcardItem | MCQItem | ReportItem)[];
  total: number;
  page: number;
  totalPages: number;
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "flashcards", label: "Flashcards", icon: "🃏" },
  { key: "mcq", label: "MCQs", icon: "✅" },
  { key: "reports", label: "Reportes", icon: "🚩" },
];

export function ContenidoClient() {
  const [tab, setTab] = useState<Tab>("flashcards");
  const [data, setData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab,
        page: page.toString(),
        search,
      });
      const res = await fetch(`/api/admin/content?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [tab, page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchContent, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchContent]);

  const handleDelete = async (type: string, id: string) => {
    if (!confirm("¿Eliminar este contenido?")) return;
    try {
      const res = await fetch("/api/admin/content", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      if (res.ok) fetchContent();
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy font-display italic">
          Contenido
        </h1>
        {tab !== "reports" && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 transition-colors"
          >
            + Agregar {tab === "flashcards" ? "Flashcard" : "MCQ"}
          </button>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-lg border border-border p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
              setSearch("");
            }}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-gold text-white"
                : "text-navy/60 hover:text-navy"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Search ───────────────────────────────────────── */}
      {tab !== "reports" && (
        <input
          type="text"
          placeholder="Buscar contenido..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-gold/30 w-64"
        />
      )}

      {/* ── Content List ─────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-navy/5"
              />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-navy/40">
            Sin contenido
          </p>
        ) : tab === "flashcards" ? (
          <ul className="divide-y divide-border">
            {(data?.items as FlashcardItem[])?.map((fc) => (
              <li
                key={fc.id}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy truncate">
                    {fc.front}
                  </p>
                  <p className="text-xs text-navy/50 truncate mt-0.5">
                    {fc.back}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] text-navy/60">
                      {fc.rama}
                    </span>
                    <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] text-navy/60">
                      {fc.libro}
                    </span>
                    <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] text-navy/60">
                      {fc.dificultad}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete("flashcard", fc.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        ) : tab === "mcq" ? (
          <ul className="divide-y divide-border">
            {(data?.items as MCQItem[])?.map((q) => (
              <li
                key={q.id}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy">{q.question}</p>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-navy/60">
                    <span
                      className={
                        q.correctOption === "A"
                          ? "font-bold text-green-600"
                          : ""
                      }
                    >
                      A: {q.optionA}
                    </span>
                    <span
                      className={
                        q.correctOption === "B"
                          ? "font-bold text-green-600"
                          : ""
                      }
                    >
                      B: {q.optionB}
                    </span>
                    <span
                      className={
                        q.correctOption === "C"
                          ? "font-bold text-green-600"
                          : ""
                      }
                    >
                      C: {q.optionC}
                    </span>
                    <span
                      className={
                        q.correctOption === "D"
                          ? "font-bold text-green-600"
                          : ""
                      }
                    >
                      D: {q.optionD}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] text-navy/60">
                      {q.rama}
                    </span>
                    <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] text-navy/60">
                      {q.libro}
                    </span>
                    <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] text-navy/60">
                      {q.dificultad}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete("mcq", q.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-border">
            {(data?.items as ReportItem[])?.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.status === "PENDING"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="text-xs text-navy/50">
                        {r.contentType} · {r.userName}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-navy">{r.reason}</p>
                    {r.description && (
                      <p className="mt-0.5 text-xs text-navy/50">
                        {r.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-navy/40">
                      {new Date(r.createdAt).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                  {r.status === "PENDING" && (
                    <button
                      onClick={() => handleDelete("report", r.id)}
                      className="shrink-0 rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                    >
                      Resolver
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-navy/50">
            Página {data.page} de {data.totalPages} ({data.total} items)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-navy hover:bg-navy/5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-navy hover:bg-navy/5 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* ── Add Modal ────────────────────────────────────── */}
      {showAdd && (
        <AddContentModal
          type={tab as "flashcards" | "mcq"}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            fetchContent();
          }}
        />
      )}
    </div>
  );
}

/* ── Add Content Modal ────────────────────────────────────── */

function AddContentModal({
  type,
  onClose,
  onCreated,
}: {
  type: "flashcards" | "mcq";
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const entries = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type === "flashcards" ? "flashcard" : "mcq",
          data: entries,
        }),
      });
      if (res.ok) onCreated();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-navy font-display italic">
            Agregar {type === "flashcards" ? "Flashcard" : "MCQ"}
          </h3>
          <button
            onClick={onClose}
            className="text-navy/40 hover:text-navy text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {type === "flashcards" ? (
            <>
              <textarea
                name="front"
                required
                placeholder="Frente de la tarjeta"
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              />
              <textarea
                name="back"
                required
                placeholder="Reverso de la tarjeta"
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              />
            </>
          ) : (
            <>
              <textarea
                name="question"
                required
                placeholder="Pregunta"
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              />
              <input
                name="optionA"
                required
                placeholder="Opción A"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              />
              <input
                name="optionB"
                required
                placeholder="Opción B"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              />
              <input
                name="optionC"
                required
                placeholder="Opción C"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              />
              <input
                name="optionD"
                required
                placeholder="Opción D"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              />
              <select
                name="correctOption"
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              >
                <option value="A">Correcta: A</option>
                <option value="B">Correcta: B</option>
                <option value="C">Correcta: C</option>
                <option value="D">Correcta: D</option>
              </select>
              <textarea
                name="explanation"
                placeholder="Explicación (opcional)"
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy"
              />
            </>
          )}

          {/* Common fields */}
          <div className="grid grid-cols-2 gap-3">
            <select
              name="rama"
              required
              className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
            >
              <option value="">Rama…</option>
              <option value="DERECHO_CIVIL">Derecho Civil</option>
              <option value="DERECHO_PROCESAL_CIVIL">Derecho Procesal Civil</option>
            </select>
            <select
              name="codigo"
              required
              className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
            >
              <option value="">Código…</option>
              <option value="CODIGO_CIVIL">Código Civil</option>
              <option value="CODIGO_PROCEDIMIENTO_CIVIL">Código de Procedimiento Civil</option>
              <option value="LEY_ANEXA">Ley Anexa</option>
            </select>
            <select
              name="libro"
              required
              className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
            >
              <option value="">Libro…</option>
              <option value="MENSAJE">Mensaje</option>
              <option value="TITULO_PRELIMINAR">Título Preliminar</option>
              <option value="LIBRO_I">Libro I</option>
              <option value="LIBRO_II">Libro II</option>
              <option value="LIBRO_III">Libro III</option>
              <option value="LIBRO_IV">Libro IV</option>
              <option value="TITULO_FINAL">Título Final</option>
              <option value="LIBRO_I_CPC">Libro I CPC</option>
              <option value="LIBRO_II_CPC">Libro II CPC</option>
              <option value="LIBRO_III_CPC">Libro III CPC</option>
              <option value="LIBRO_IV_CPC">Libro IV CPC</option>
            </select>
            <select
              name="dificultad"
              className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
            >
              <option value="BASICO">Básico</option>
              <option value="INTERMEDIO">Intermedio</option>
              <option value="AVANZADO">Avanzado</option>
            </select>
            <input
              name="titulo"
              required
              placeholder="Título (e.g. DEL_MATRIMONIO)"
              className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
            />
            <input
              name="parrafo"
              placeholder="Párrafo (opcional)"
              className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
            />
            {type === "flashcards" && (
              <>
                <input
                  name="leyAnexa"
                  placeholder="Ley Anexa (opcional)"
                  className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
                />
                <input
                  name="articuloRef"
                  placeholder="Artículo ref. (opcional)"
                  className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
                />
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-white hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
