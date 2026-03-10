"use client";

import { useEffect, useState } from "react";

interface SubRow {
  id: string;
  userId: string;
  userName: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface PagosData {
  mrr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  subscriptions: SubRow[];
  total: number;
  page: number;
  totalPages: number;
}

export function PagosClient() {
  const [data, setData] = useState<PagosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/pagos?page=${page}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy font-display italic">Pagos</h1>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-navy/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy font-display italic">
        Pagos
      </h1>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">MRR (Ingresos Recurrentes)</p>
          <p className="mt-1 text-2xl font-bold text-navy font-display">
            ${data.mrr.toLocaleString("es-CL")} CLP
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Ingresos totales</p>
          <p className="mt-1 text-2xl font-bold text-navy font-display">
            ${data.totalRevenue.toLocaleString("es-CL")} CLP
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Suscripciones activas</p>
          <p className="mt-1 text-2xl font-bold text-navy font-display">
            {data.activeSubscriptions}
          </p>
        </div>
      </div>

      {/* ── Transactions Table ───────────────────────────── */}
      <div className="rounded-xl border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-navy font-display italic">
            Transacciones
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-navy/[0.03]">
                <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                  Usuario
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                  Plan
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                  Monto
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                  Estado
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-navy/60">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.subscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-navy/40"
                  >
                    Sin transacciones aún
                  </td>
                </tr>
              ) : (
                data.subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-navy/[0.02]">
                    <td className="px-4 py-2.5 text-navy">
                      {s.userName}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-gold">
                        {s.plan}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-navy/70">
                      ${s.amount.toLocaleString("es-CL")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          s.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : s.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-navy/60">
                      {new Date(s.createdAt).toLocaleDateString("es-CL")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {data.totalPages > 1 && (
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

      {/* ── Transbank Note ───────────────────────────────── */}
      <div className="rounded-xl border border-dashed border-gold/30 bg-gold/5 p-4">
        <p className="text-sm text-gold font-medium">
          💡 Integración Transbank preparada
        </p>
        <p className="mt-1 text-xs text-navy/50">
          El modelo de Subscription está listo para integrar con Transbank
          WebPay Plus. Una vez configurada la API de Transbank, las
          transacciones se registrarán automáticamente aquí.
        </p>
      </div>
    </div>
  );
}
