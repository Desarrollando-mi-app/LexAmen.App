"use client";

// ─── ReporteActions — botones admin para cerrar reportes ────────

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReporteActions({ reporteId }: { reporteId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState<null | "resolver" | "descartar">(
    null,
  );
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "resolver" | "descartar") {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/citaciones-reportes/${reporteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notas: notas.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al actualizar el reporte.");
        return;
      }
      setShowModal(null);
      setNotas("");
      router.refresh();
    } catch {
      setError("Error de red.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setNotas("");
            setError(null);
            setShowModal("resolver");
          }}
          disabled={submitting}
          className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
        >
          ✓ Marcar como resuelto
        </button>
        <button
          type="button"
          onClick={() => {
            setNotas("");
            setError(null);
            setShowModal("descartar");
          }}
          disabled={submitting}
          className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-50"
        >
          ✗ Descartar
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 max-w-md w-full">
            <h3 className="font-semibold mb-2 text-gray-900">
              {showModal === "resolver"
                ? "Marcar como resuelto"
                : "Descartar reporte"}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {showModal === "resolver"
                ? "Indica brevemente la acción tomada (opcional). Quedará en AdminLog."
                : "El reporte queda archivado como falso positivo (opcional)."}
            </p>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded mb-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Notas internas (opcional)"
            />
            {error && (
              <p className="mb-3 text-xs text-red-700">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowModal(null)}
                disabled={submitting}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAction(showModal)}
                disabled={submitting}
                className={`px-4 py-1.5 text-sm text-white rounded cursor-pointer disabled:opacity-50 ${
                  showModal === "resolver"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-gray-700 hover:bg-gray-800"
                }`}
              >
                {submitting
                  ? "Procesando…"
                  : showModal === "resolver"
                    ? "Confirmar resolución"
                    : "Confirmar descarte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
