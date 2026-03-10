"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface HashtagItem {
  id: string;
  tag: string;
  count: number;
  isContingencia: boolean;
  pinned: boolean;
  hidden: boolean;
  createdAt: string;
}

export function ContingenciasClient() {
  const [items, setItems] = useState<HashtagItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/contingencias?page=${p}`);
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      toast.error("Error al cargar hashtags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  async function handleToggle(
    id: string,
    field: "isContingencia" | "pinned" | "hidden",
    value: boolean
  ) {
    try {
      const res = await fetch("/api/admin/contingencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!res.ok) throw new Error();

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
      toast.success("Actualizado");
    } catch {
      toast.error("Error al actualizar");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy font-display">
            📰 Contingencias
          </h1>
          <p className="text-sm text-navy/50">
            Gestiona los hashtags del Diario ({total} total)
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-navy/5">
              <th className="px-4 py-3 text-left font-semibold text-navy/70">
                Hashtag
              </th>
              <th className="px-4 py-3 text-left font-semibold text-navy/70">
                Posts
              </th>
              <th className="px-4 py-3 text-center font-semibold text-navy/70">
                Contingencia
              </th>
              <th className="px-4 py-3 text-center font-semibold text-navy/70">
                Pinned
              </th>
              <th className="px-4 py-3 text-center font-semibold text-navy/70">
                Oculto
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-navy/40">
                  Cargando...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-navy/40">
                  No hay hashtags aún
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border/50 last:border-0 hover:bg-navy/[0.02]"
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gold">
                      #{item.tag}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-navy/60">{item.count}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        handleToggle(
                          item.id,
                          "isContingencia",
                          !item.isContingencia
                        )
                      }
                      className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        item.isContingencia ? "bg-gold" : "bg-navy/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                          item.isContingencia
                            ? "translate-x-5"
                            : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        handleToggle(item.id, "pinned", !item.pinned)
                      }
                      className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        item.pinned ? "bg-blue-500" : "bg-navy/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                          item.pinned ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        handleToggle(item.id, "hidden", !item.hidden)
                      }
                      className={`inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        item.hidden ? "bg-red-500" : "bg-navy/20"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                          item.hidden ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => fetchData(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy/60 hover:bg-navy/5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-navy/50">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchData(page + 1)}
            disabled={page >= totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-navy/60 hover:bg-navy/5 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
