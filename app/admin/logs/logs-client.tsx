"use client";

import { useState, useEffect, useCallback } from "react";

interface LogEntry {
  id: string;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  adminName: string;
}

const ACTION_OPTIONS = [
  { value: "", label: "Todas las acciones" },
  { value: "SUSPEND_USER", label: "Suspender usuario" },
  { value: "UNSUSPEND_USER", label: "Reactivar usuario" },
  { value: "UPDATE_USER_FIELDS", label: "Actualizar campos de usuario" },
  { value: "RESOLVE_USER_REPORT", label: "Resolver reporte de usuario" },
  { value: "UPDATE_CONFIG", label: "Actualizar configuracion" },
  { value: "SEED_CONFIG", label: "Seed configuracion" },
  { value: "RESET_CONFIG", label: "Reset configuracion" },
  { value: "APPROVE_NEWS", label: "Aprobar noticia" },
  { value: "REJECT_NEWS", label: "Rechazar noticia" },
  { value: "CREATE_EXPEDIENTE", label: "Crear expediente" },
  { value: "CLOSE_EXPEDIENTE", label: "Cerrar expediente" },
  { value: "CREATE_FALLO_SEMANA", label: "Crear fallo de la semana" },
  { value: "PUBLISH_HERO_SLIDE", label: "Publicar hero slide" },
  { value: "SEND_NOTIFICATION", label: "Enviar notificacion" },
  { value: "RESOLVE_REPORT", label: "Resolver reporte" },
];

export function LogsClient() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "30");
      if (accion) params.set("accion", accion);
      if (desde) params.set("desde", desde);
      if (hasta) params.set("hasta", hasta);

      const res = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, accion, desde, hasta]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  function clearFilters() {
    setAccion("");
    setDesde("");
    setHasta("");
    setPage(1);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatMetadata(metadata: Record<string, unknown> | null): string {
    if (!metadata) return "";
    try {
      const entries = Object.entries(metadata);
      if (entries.length === 0) return "";
      return entries
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
        .join(" | ");
    } catch {
      return "";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Logs de Actividad</h1>
        <p className="text-sm text-navy/60 mt-1">
          Registro de acciones administrativas ({total} entradas)
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Action filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-navy/60">Accion</label>
            <select
              value={accion}
              onChange={(e) => {
                setAccion(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-navy/60">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-navy/60">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
          </div>

          {/* Clear */}
          <button
            onClick={clearFilters}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy/60 hover:bg-navy/5 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Logs list */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-navy/40">
            No se encontraron logs con estos filtros
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="px-5 py-3 hover:bg-gold/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex rounded-md bg-navy/10 px-2 py-0.5 text-xs font-mono font-medium text-navy">
                        {log.action}
                      </span>
                      <span className="text-xs text-navy/50">
                        por {log.adminName}
                      </span>
                    </div>
                    {log.target && (
                      <p className="text-sm text-navy/70 mt-1">
                        Target: <span className="font-medium">{log.target}</span>
                      </p>
                    )}
                    {log.metadata && (
                      <p className="text-xs text-navy/40 mt-0.5 truncate max-w-xl font-mono">
                        {formatMetadata(log.metadata)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-navy/40 whitespace-nowrap shrink-0">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-navy/50">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-navy hover:bg-navy/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-navy hover:bg-navy/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
