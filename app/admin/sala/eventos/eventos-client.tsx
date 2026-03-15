"use client";

import { useState } from "react";
import { toast } from "sonner";

interface EventoPendiente {
  id: string;
  titulo: string;
  descripcion: string;
  organizador: string;
  fecha: string;
  fechaFin: string | null;
  hora: string | null;
  formato: string;
  lugar: string | null;
  linkOnline: string | null;
  costo: string;
  montoCosto: string | null;
  linkInscripcion: string | null;
  materias: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

const FORMATO_LABELS: Record<string, string> = {
  presencial: "Presencial",
  online: "Online",
  hibrido: "Híbrido",
};

export function EventosAdminClient({ eventos: initialEventos }: { eventos: EventoPendiente[] }) {
  const [eventos, setEventos] = useState(initialEventos);
  const [loading, setLoading] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  async function handleApprove(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/sala/eventos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "aprobar" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }
      setEventos((prev) => prev.filter((e) => e.id !== id));
      toast.success("Evento aprobado y publicado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectionReason.trim()) {
      toast.error("Indica un motivo de rechazo");
      return;
    }
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/sala/eventos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rechazar", rejectionReason: rejectionReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }
      setEventos((prev) => prev.filter((e) => e.id !== id));
      setRejecting(null);
      setRejectionReason("");
      toast.success("Evento rechazado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(null);
    }
  }

  if (eventos.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">La Sala</p>
          <h1 className="text-2xl font-bold text-navy">Eventos Pendientes</h1>
        </div>
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-navy/40">No hay eventos pendientes de aprobación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">La Sala</p>
        <h1 className="text-2xl font-bold text-navy">Eventos Pendientes ({eventos.length})</h1>
      </div>

      {eventos.map((e) => (
        <div key={e.id} className="rounded-lg border border-border bg-white p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📅</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-gold/10 text-gold px-2 py-0.5 rounded">
              Pendiente
            </span>
          </div>

          <h2 className="text-xl font-bold text-navy">&ldquo;{e.titulo}&rdquo;</h2>
          <p className="text-sm text-navy/60 mt-1">
            Organizador: <strong>{e.organizador}</strong>
          </p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy/50">
            <span>📅 {new Date(e.fecha).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
            {e.hora && <span>🕐 {e.hora}</span>}
            <span>📋 {FORMATO_LABELS[e.formato] || e.formato}</span>
            {e.lugar && <span>📍 {e.lugar}</span>}
            {e.linkOnline && <span>🔗 Online</span>}
            <span>💰 {e.costo === "gratis" ? "Gratis" : `Pagado${e.montoCosto ? ` — ${e.montoCosto}` : ""}`}</span>
          </div>

          <div className="mt-3 text-sm text-navy/70 bg-navy/5 rounded-lg p-4">
            {e.descripcion}
          </div>

          <p className="mt-3 text-xs text-navy/30">
            Propuesto por {e.user.firstName} {e.user.lastName} el {new Date(e.createdAt).toLocaleDateString("es-CL")}
            {e.materias && ` · Materias: ${e.materias}`}
          </p>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <button
              onClick={() => handleApprove(e.id)}
              disabled={loading === e.id}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              ✓ Aprobar
            </button>
            {rejecting === e.id ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(ev) => setRejectionReason(ev.target.value)}
                  placeholder="Motivo de rechazo..."
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg"
                  autoFocus
                />
                <button
                  onClick={() => handleReject(e.id)}
                  disabled={loading === e.id}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 shrink-0"
                >
                  Confirmar rechazo
                </button>
                <button
                  onClick={() => { setRejecting(null); setRejectionReason(""); }}
                  className="text-sm text-navy/40 hover:text-navy transition-colors shrink-0"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setRejecting(e.id)}
                disabled={loading === e.id}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                ✗ Rechazar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
