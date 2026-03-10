"use client";

import { useEffect, useState, useCallback } from "react";

type ReportTab = "content" | "ayudantia";

interface ContentReportRow {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  userName: string;
}

interface AyudantiaReportRow {
  id: string;
  ayudantiaId: string;
  reason: string;
  createdAt: string;
  reporterName: string;
  ayudantiaTitle: string;
  ayudantiaOwner: string;
  ayudantiaReportCount: number;
}

interface ReportesData {
  items: (ContentReportRow | AyudantiaReportRow)[];
  total: number;
  page: number;
  totalPages: number;
  pendingCount: number;
}

export function ReportesClient() {
  const [tab, setTab] = useState<ReportTab>("content");
  const [data, setData] = useState<ReportesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tab,
        page: page.toString(),
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/reportes?${params}`);
      if (res.ok) setData(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [tab, page, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (
    reportId: string,
    action: "resolve" | "dismiss" | "deactivate"
  ) => {
    if (!confirm(`¿Confirmar acción "${action}"?`)) return;
    try {
      const res = await fetch("/api/admin/reportes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action, tab }),
      });
      if (res.ok) fetchData();
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy font-display italic">
        Reportes
      </h1>

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            onClick={() => { setTab("content"); setPage(1); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "content" ? "bg-gold text-white" : "text-navy/60 hover:text-navy"
            }`}
          >
            🚩 Contenido
          </button>
          <button
            onClick={() => { setTab("ayudantia"); setPage(1); }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === "ayudantia" ? "bg-gold text-white" : "text-navy/60 hover:text-navy"
            }`}
          >
            🎓 Ayudantías
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy"
        >
          <option value="PENDING">Pendientes</option>
          <option value="RESOLVED">Resueltos</option>
          <option value="">Todos</option>
        </select>

        {data && (
          <span className="text-sm text-navy/50">
            {data.pendingCount} pendiente{data.pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Report List */}
      <div className="rounded-xl border border-border bg-white">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-navy/5" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <p className="py-12 text-center text-sm text-navy/40">
            Sin reportes
          </p>
        ) : tab === "content" ? (
          <ul className="divide-y divide-border">
            {(data?.items as ContentReportRow[])?.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.status === "PENDING"
                            ? "bg-orange-100 text-orange-700"
                            : r.status === "RESOLVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-navy/10 text-navy/60"
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] text-navy/60">
                        {r.contentType}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-navy">
                      {r.reason}
                    </p>
                    {r.description && (
                      <p className="mt-0.5 text-xs text-navy/50">
                        {r.description}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-navy/40">
                      Por {r.userName} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {r.status === "PENDING" && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleAction(r.id, "resolve")}
                        className="rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                      >
                        Resolver
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "dismiss")}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-navy/50 hover:bg-navy/5"
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-border">
            {(data?.items as AyudantiaReportRow[])?.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy">
                      {r.ayudantiaTitle}
                    </p>
                    <p className="text-xs text-navy/60">
                      Publicada por {r.ayudantiaOwner}
                    </p>
                    <p className="mt-1 text-xs text-navy/50">
                      Razón: {r.reason}
                    </p>
                    <p className="mt-1 text-[10px] text-navy/40">
                      Reportado por {r.reporterName} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {r.ayudantiaReportCount} reporte
                      {r.ayudantiaReportCount !== 1 ? "s" : ""} total
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleAction(r.id, "dismiss")}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-navy/50 hover:bg-navy/5"
                    >
                      Ignorar
                    </button>
                    <button
                      onClick={() => handleAction(r.ayudantiaId, "deactivate")}
                      className="rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                    >
                      Desactivar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
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
