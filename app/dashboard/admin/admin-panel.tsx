"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

type NotificationType = "SYSTEM_BROADCAST" | "SYSTEM_SEGMENTED" | "SYSTEM_INDIVIDUAL";

interface HistoryItem {
  id: string;
  type: string;
  title: string;
  body: string;
  targetUserId: string | null;
  targetSegment: string | null;
  sentViaEmail: boolean;
  recipientCount: number;
  createdAt: string;
}

const SEGMENT_OPTIONS = [
  { value: "", label: "Todos (broadcast)" },
  { value: "free", label: "Usuarios free" },
  { value: "premium", label: "Usuarios premium" },
  { value: "tier:BRONCE", label: "Liga: Bronce" },
  { value: "tier:PLATA", label: "Liga: Plata" },
  { value: "tier:ORO", label: "Liga: Oro" },
];

export function AdminPanel() {
  // ─── Formulario ──────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // ─── Historial ───────────────────────────────────────────
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.items ?? []);
    } catch {
      // silently fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);

    let type: NotificationType = "SYSTEM_BROADCAST";
    if (targetUserId.trim()) {
      type = "SYSTEM_INDIVIDUAL";
    } else if (segment) {
      type = "SYSTEM_SEGMENTED";
    }

    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          body: body.trim(),
          targetUserId: targetUserId.trim() || undefined,
          targetSegment: segment || undefined,
          sendEmail,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(`Error: ${err.error}`);
        setResult(`Error: ${err.error}`);
        return;
      }

      const data = await res.json();
      toast.success(`Notificación enviada a ${data.recipientCount} usuario(s)`);
      setResult(`✅ Enviada a ${data.recipientCount} usuario(s)`);
      setTitle("");
      setBody("");
      setSegment("");
      setTargetUserId("");
      setSendEmail(false);
      fetchHistory();
    } catch {
      toast.error("Error al enviar");
      setResult("Error de red");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ─── Formulario de envío ──────────────────────────── */}
      <section className="rounded-[4px] border border-gz-rule bg-white p-6">
        <h2 className="text-lg font-bold text-navy mb-4 font-cormorant">
          Enviar notificación
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy/70 mb-1">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: ¡Nuevo contenido disponible!"
              className="w-full rounded-[3px] border border-gz-rule bg-gz-cream-dark px-3 py-2 text-sm text-navy placeholder:text-navy/30 focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy/70 mb-1">
              Mensaje
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribe el cuerpo de la notificación..."
              rows={3}
              className="w-full rounded-[3px] border border-gz-rule bg-gz-cream-dark px-3 py-2 text-sm text-navy placeholder:text-navy/30 focus:border-gold focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy/70 mb-1">
                Segmento
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                disabled={!!targetUserId.trim()}
                className="w-full rounded-[3px] border border-gz-rule bg-gz-cream-dark px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none disabled:opacity-50"
              >
                {SEGMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy/70 mb-1">
                ID usuario específico (opcional)
              </label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="cuid del usuario"
                className="w-full rounded-[3px] border border-gz-rule bg-gz-cream-dark px-3 py-2 text-sm text-navy placeholder:text-navy/30 focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 rounded border-gz-rule text-gold focus:ring-gold accent-gold"
            />
            <span className="text-sm text-navy/70">
              Enviar también por email (vía Resend)
            </span>
          </label>

          {result && (
            <p
              className={`text-sm font-medium ${
                result.startsWith("✅") ? "text-gz-sage" : "text-gz-burgundy"
              }`}
            >
              {result}
            </p>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="rounded-[3px] bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50 transition-colors"
          >
            {sending ? "Enviando..." : "Enviar notificación"}
          </button>
        </div>
      </section>

      {/* ─── Historial ───────────────────────────────────── */}
      <section className="rounded-[4px] border border-gz-rule bg-white p-6">
        <h2 className="text-lg font-bold text-navy mb-4 font-cormorant">
          Historial de envíos
        </h2>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-navy/40 py-6 text-center">
            No se han enviado notificaciones aún
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gz-rule text-left text-navy/50">
                  <th className="pb-2 pr-4 font-medium">Tipo</th>
                  <th className="pb-2 pr-4 font-medium">Título</th>
                  <th className="pb-2 pr-4 font-medium">Dest.</th>
                  <th className="pb-2 pr-4 font-medium text-right"># Rec.</th>
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((n) => (
                  <tr key={n.id} className="text-navy/80">
                    <td className="py-2.5 pr-4">
                      <span className="rounded bg-navy/5 px-2 py-0.5 text-xs font-mono">
                        {n.type.replace("SYSTEM_", "").toLowerCase()}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-navy">
                      {n.title}
                    </td>
                    <td className="py-2.5 pr-4 text-xs">
                      {n.targetUserId
                        ? `ID: ${n.targetUserId.slice(0, 8)}...`
                        : n.targetSegment ?? "todos"}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium">
                      {n.recipientCount}
                    </td>
                    <td className="py-2.5 pr-4">
                      {n.sentViaEmail ? "✉️" : "—"}
                    </td>
                    <td className="py-2.5 text-xs text-navy/50">
                      {new Date(n.createdAt).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
