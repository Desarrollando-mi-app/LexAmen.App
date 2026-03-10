"use client";

import { useEffect, useState, useCallback } from "react";

interface HealthCheck {
  service: string;
  status: "ok" | "error";
  latencyMs: number;
  message?: string;
}

interface LogEntry {
  id: string;
  action: string;
  target: string | null;
  createdAt: string;
  adminName: string;
}

interface SystemInfo {
  nodeVersion: string;
  nextVersion: string;
  prismaVersion: string;
  environment: string;
  uptime: string;
}

interface SistemaData {
  health: HealthCheck[];
  logs: LogEntry[];
  logsTotal: number;
  logsPage: number;
  logsTotalPages: number;
  system: SystemInfo;
  dbStats: {
    totalTables: number;
    totalRows: number;
  };
}

export function SistemaClient() {
  const [data, setData] = useState<SistemaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logsPage, setLogsPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sistema?logsPage=${logsPage}`);
      if (res.ok) setData(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [logsPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy font-display italic">
          Sistema
        </h1>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-navy/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy font-display italic">
          Sistema
        </h1>
        <button
          onClick={fetchData}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-navy hover:bg-navy/5 transition-colors"
        >
          🔄 Refrescar
        </button>
      </div>

      {/* ── Health Checks ────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          Estado de servicios
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.health.map((h) => (
            <div
              key={h.service}
              className={`flex items-center justify-between rounded-lg border p-4 ${
                h.status === "ok"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    h.status === "ok" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-medium text-navy">
                  {h.service}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-sm font-mono ${
                    h.status === "ok" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {h.latencyMs}ms
                </span>
                {h.message && (
                  <p className="text-[10px] text-red-600">{h.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── System Info ──────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-3 text-base font-semibold text-navy font-display italic">
            Información del servidor
          </h2>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-navy/50">Node.js</dt>
              <dd className="font-mono text-navy">{data.system.nodeVersion}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-navy/50">Next.js</dt>
              <dd className="font-mono text-navy">{data.system.nextVersion}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-navy/50">Prisma</dt>
              <dd className="font-mono text-navy">
                {data.system.prismaVersion}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-navy/50">Entorno</dt>
              <dd className="font-mono text-navy">
                {data.system.environment}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-navy/50">Uptime</dt>
              <dd className="font-mono text-navy">{data.system.uptime}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-3 text-base font-semibold text-navy font-display italic">
            Base de datos
          </h2>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-navy/50">Tablas</dt>
              <dd className="font-mono text-navy font-bold">
                {data.dbStats.totalTables}
              </dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-navy/50">Filas totales (aprox.)</dt>
              <dd className="font-mono text-navy font-bold">
                {data.dbStats.totalRows.toLocaleString("es-CL")}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ── Admin Logs ───────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-navy font-display italic">
            Registro de actividad admin
          </h2>
        </div>
        {data.logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-navy/40">
            Sin registros
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-navy/[0.03]">
                    <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                      Acción
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                      Objetivo
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                      Admin
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-navy/[0.02]">
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-navy/5 px-2 py-0.5 text-xs font-medium text-navy">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-navy/50 max-w-[200px] truncate">
                        {log.target ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-navy/70">
                        {log.adminName}
                      </td>
                      <td className="px-4 py-2.5 text-navy/60">
                        {new Date(log.createdAt).toLocaleString("es-CL", {
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

            {data.logsTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-xs text-navy/50">
                  Página {data.logsPage} de {data.logsTotalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={logsPage <= 1}
                    onClick={() => setLogsPage(logsPage - 1)}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-navy hover:bg-navy/5 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={logsPage >= data.logsTotalPages}
                    onClick={() => setLogsPage(logsPage + 1)}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-navy hover:bg-navy/5 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── SQL para activar admin manualmente ───────────── */}
      <div className="rounded-xl border border-dashed border-navy/20 bg-navy/[0.02] p-4">
        <p className="text-sm font-medium text-navy/60 mb-2">
          💡 Activar admin manualmente (SQL)
        </p>
        <code className="block rounded-lg bg-navy/5 px-4 py-3 text-xs font-mono text-navy/80 whitespace-pre-wrap">
          {`UPDATE "User" SET "isAdmin" = true WHERE email = 'tu@email.com';`}
        </code>
      </div>
    </div>
  );
}
