"use client";

import { useState } from "react";
import { toast } from "sonner";

interface ReportItem {
  id: string;
  motivo: string;
  descripcion: string | null;
  reporterName: string;
  createdAt: string;
}

interface ReportGroup {
  tipo: "ayudantia" | "pasantia" | "evento" | "oferta";
  publicacionId: string;
  titulo: string;
  autorNombre: string;
  isHidden: boolean;
  publicadoEl: string;
  reportes: ReportItem[];
}

const TIPO_LABELS: Record<string, string> = {
  ayudantia: "Ayudantía",
  pasantia: "Pasantía",
  evento: "Evento",
  oferta: "Oferta de Trabajo",
};

const MOTIVO_LABELS: Record<string, string> = {
  spam: "Spam",
  informacion_falsa: "Información falsa",
  contenido_inapropiado: "Contenido inapropiado",
  oferta_sospechosa: "Oferta sospechosa",
  otro: "Otro",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

export function ReportesClient({ groups: initialGroups }: { groups: ReportGroup[] }) {
  const [groups, setGroups] = useState(initialGroups);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(group: ReportGroup, action: "restaurar" | "eliminar" | "descartar_reportes") {
    const key = `${group.tipo}-${group.publicacionId}`;
    setLoading(key);

    try {
      const res = await fetch("/api/admin/sala/reportes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportIds: group.reportes.map((r) => r.id),
          action,
          tipo: group.tipo,
          publicacionId: group.publicacionId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }

      setGroups((prev) => prev.filter((g) => `${g.tipo}-${g.publicacionId}` !== key));

      const labels: Record<string, string> = {
        restaurar: "Publicación restaurada",
        eliminar: "Publicación eliminada",
        descartar_reportes: "Reportes descartados",
      };
      toast.success(labels[action]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar");
    } finally {
      setLoading(null);
    }
  }

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">La Sala</p>
          <h1 className="text-2xl font-bold text-navy">Reportes</h1>
        </div>
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-navy/40">No hay reportes pendientes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">La Sala</p>
        <h1 className="text-2xl font-bold text-navy">Reportes ({groups.length} publicaciones)</h1>
      </div>

      {groups.map((group) => {
        const key = `${group.tipo}-${group.publicacionId}`;
        const isLoading = loading === key;

        return (
          <div key={key} className="rounded-lg border border-border bg-white p-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">⚠️</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-navy/50">
                {TIPO_LABELS[group.tipo]}
              </span>
              {group.isHidden && (
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  Auto-ocultada
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                {group.reportes.length} {group.reportes.length === 1 ? "reporte" : "reportes"}
              </span>
            </div>

            <p className="text-lg font-semibold text-navy">
              &ldquo;{group.titulo}&rdquo; — <span className="text-navy/60 font-normal">por {group.autorNombre}</span>
            </p>
            <p className="text-xs text-navy/40 mt-1">
              Publicada el {new Date(group.publicadoEl).toLocaleDateString("es-CL")}
            </p>

            {/* Reports list */}
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-sm font-semibold text-navy/70 mb-2">Reportes:</p>
              <div className="space-y-2">
                {group.reportes.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-sm">
                    <span className="text-navy/30">•</span>
                    <div>
                      <span className="font-medium text-navy">{r.reporterName}</span>
                      <span className="text-navy/50">: {MOTIVO_LABELS[r.motivo] || r.motivo}</span>
                      {r.descripcion && (
                        <span className="text-navy/40 italic"> — &ldquo;{r.descripcion}&rdquo;</span>
                      )}
                      <span className="text-navy/30 text-xs ml-1">({timeAgo(r.createdAt)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {group.isHidden && (
                <button
                  onClick={() => handleAction(group, "restaurar")}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  Restaurar (quitar ocultación)
                </button>
              )}
              <button
                onClick={() => handleAction(group, "eliminar")}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Eliminar permanentemente
              </button>
              <button
                onClick={() => handleAction(group, "descartar_reportes")}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-border text-navy/60 hover:bg-navy/5 transition-colors disabled:opacity-50"
              >
                Descartar reportes
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
