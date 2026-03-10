"use client";

import { useEffect, useState, useCallback } from "react";

interface NotifHistoryItem {
  id: string;
  type: string;
  title: string;
  body: string;
  targetSegment: string | null;
  createdAt: string;
  recipientCount: number;
  readCount: number;
}

interface NotifData {
  history: NotifHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

const SEGMENT_OPTIONS = [
  { value: "all", label: "Todos los usuarios" },
  { value: "premium", label: "Solo Premium" },
  { value: "free", label: "Solo Free" },
];

export function NotificacionesClient() {
  const [data, setData] = useState<NotifData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?page=${page}`);
      if (res.ok) setData(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (!confirm(`¿Enviar notificación a "${SEGMENT_OPTIONS.find((s) => s.value === segment)?.label}"?`)) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, segment }),
      });
      if (res.ok) {
        setTitle("");
        setBody("");
        setSegment("all");
        setShowForm(false);
        fetchData();
      }
    } catch {
      alert("Error al enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy font-display italic">
          Notificaciones
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nueva notificación"}
        </button>
      </div>

      {/* ── Send Form ────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSend}
          className="rounded-xl border border-border bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-navy font-display italic">
            Enviar notificación
          </h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-gold/30"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mensaje"
            required
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-gold/30"
          />
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-navy"
          >
            {SEGMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Preview */}
          {title && (
            <div className="rounded-lg border border-dashed border-navy/20 bg-navy/[0.02] p-4">
              <p className="text-xs font-medium text-navy/40 mb-2">
                Vista previa
              </p>
              <p className="text-sm font-semibold text-navy">{title}</p>
              <p className="text-sm text-navy/70 mt-1">{body}</p>
              <p className="text-[10px] text-navy/40 mt-2">
                Segmento:{" "}
                {SEGMENT_OPTIONS.find((s) => s.value === segment)?.label}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-white hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {sending ? "Enviando..." : "Enviar notificación"}
          </button>
        </form>
      )}

      {/* ── History ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-navy font-display italic">
            Historial de notificaciones
          </h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-navy/5"
              />
            ))}
          </div>
        ) : data?.history.length === 0 ? (
          <p className="py-12 text-center text-sm text-navy/40">
            Sin notificaciones enviadas
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data?.history.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">
                      {n.title}
                    </p>
                    <p className="text-xs text-navy/60 mt-0.5">{n.body}</p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-navy/40">
                      <span>{n.type}</span>
                      {n.targetSegment && (
                        <span>Segmento: {n.targetSegment}</span>
                      )}
                      <span>
                        {new Date(n.createdAt).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-navy/50">
                      {n.recipientCount} destinatarios
                    </p>
                    <p className="text-[10px] text-navy/40">
                      {n.readCount} leídas (
                      {n.recipientCount > 0
                        ? Math.round((n.readCount / n.recipientCount) * 100)
                        : 0}
                      %)
                    </p>
                  </div>
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
            Página {data.page} de {data.totalPages}
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
    </div>
  );
}
