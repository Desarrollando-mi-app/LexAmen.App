"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────

interface RegistroInteres {
  id: string;
  nombreInstitucion: string;
  tipoInstitucion: string;
  nombreContacto: string;
  emailContacto: string;
  telefono: string | null;
  mensaje: string | null;
  createdAt: string;
}

const TIPO_LABELS: Record<string, string> = {
  FACULTAD_DERECHO: "Facultad de Derecho",
  ESTUDIO_JURIDICO: "Estudio Jurídico",
  CENTRO_INVESTIGACION: "Centro de Investigación",
  OTRO: "Otro",
};

const TIPO_COLORS: Record<string, string> = {
  FACULTAD_DERECHO: "bg-blue-50 text-blue-700",
  ESTUDIO_JURIDICO: "bg-purple-50 text-purple-700",
  CENTRO_INVESTIGACION: "bg-green-50 text-green-700",
  OTRO: "bg-gray-50 text-gray-600",
};

// ─── Component ────────────────────────────────────────────

export function InstitucionalClient() {
  const [items, setItems] = useState<RegistroInteres[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/institucional?page=${p}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // KPI calculations
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const thisWeekCount = items.filter(
    (i) => new Date(i.createdAt) >= thisWeekStart
  ).length;

  // Type counts (from current page — for overview)
  const typeCounts: Record<string, number> = {};
  for (const item of items) {
    typeCounts[item.tipoInstitucion] = (typeCounts[item.tipoInstitucion] || 0) + 1;
  }

  // CSV export
  function handleExportCSV() {
    const headers = [
      "Fecha",
      "Institución",
      "Tipo",
      "Contacto",
      "Email",
      "Teléfono",
      "Mensaje",
    ];
    const rows = items.map((i) => [
      new Date(i.createdAt).toLocaleDateString("es-CL"),
      i.nombreInstitucion,
      TIPO_LABELS[i.tipoInstitucion] ?? i.tipoInstitucion,
      i.nombreContacto,
      i.emailContacto,
      i.telefono ?? "",
      (i.mensaje ?? "").replace(/"/g, '""'),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registros-institucional-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-navy font-display">
            Registros de Interés Institucional
          </h1>
          <p className="mt-1 text-sm text-navy/50">
            Instituciones interesadas en el Plan Institucional
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={items.length === 0}
          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-navy/70 transition-colors hover:bg-paper disabled:opacity-30"
        >
          📥 Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Total registros</p>
          <p className="text-2xl font-bold text-navy font-display">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Esta semana</p>
          <p className="text-2xl font-bold text-navy font-display">{thisWeekCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Por tipo</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Object.entries(typeCounts).map(([tipo, count]) => (
              <span
                key={tipo}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  TIPO_COLORS[tipo] ?? "bg-gray-50 text-gray-600"
                }`}
              >
                {TIPO_LABELS[tipo] ?? tipo}: {count}
              </span>
            ))}
            {Object.keys(typeCounts).length === 0 && (
              <span className="text-xs text-navy/30">Sin datos</span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center text-navy/40">
          No hay registros de interés aún
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-paper/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50">
                    Institución
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50">
                    Contacto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-navy/50">
                    Mensaje
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border last:border-0 hover:bg-paper/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-navy/70 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">
                      {item.nombreInstitucion}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap ${
                          TIPO_COLORS[item.tipoInstitucion] ??
                          "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {TIPO_LABELS[item.tipoInstitucion] ??
                          item.tipoInstitucion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-navy/70">
                      {item.nombreContacto}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${item.emailContacto}`}
                        className="text-gold hover:underline"
                      >
                        {item.emailContacto}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-navy/70">
                      {item.telefono ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-navy/60 max-w-[200px]">
                      {item.mensaje ? (
                        <span title={item.mensaje} className="block truncate">
                          {item.mensaje.length > 60
                            ? item.mensaje.slice(0, 60) + "..."
                            : item.mensaje}
                        </span>
                      ) : (
                        <span className="text-navy/30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-navy/50">
                Página {page} de {totalPages} · {total} registros
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchData(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy/60 transition-colors hover:bg-paper disabled:opacity-30"
                >
                  Anterior
                </button>
                <button
                  onClick={() => fetchData(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy/60 transition-colors hover:bg-paper disabled:opacity-30"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
