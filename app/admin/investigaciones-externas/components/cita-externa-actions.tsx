"use client";

// ─── CitaExternaActions — botones admin (cliente) ───────────────
//
// "Ver PDF": pide signed URL fresca cada click (la generada caduca a
// la hora; cada click es una URL nueva).
// "Verificar": confirm + PATCH; tras éxito recarga.
// "Rechazar": modal con textarea de motivo (>=10 chars); tras éxito
// recarga.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CitaExternaActions({
  citaId,
  hasPdf,
}: {
  citaId: string;
  hasPdf: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleViewPdf() {
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/citas-externas/${citaId}/pdf-url`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo generar el enlace al PDF.");
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Error de red al generar el enlace.");
    }
  }

  async function handleVerify() {
    if (!confirm("¿Verificar esta cita externa? Se sumará al contador del autor.")) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/citas-externas/${citaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al verificar.");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de red al verificar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (rejectNotes.trim().length < 10) {
      setError("El motivo debe tener al menos 10 caracteres.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/citas-externas/${citaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reviewNotes: rejectNotes.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al rechazar.");
        return;
      }
      setShowRejectModal(false);
      router.refresh();
    } catch {
      setError("Error de red al rechazar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {hasPdf && (
          <button
            type="button"
            onClick={handleViewPdf}
            disabled={submitting}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-50"
          >
            Ver PDF de evidencia
          </button>
        )}
        <button
          type="button"
          onClick={handleVerify}
          disabled={submitting}
          className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer disabled:opacity-50"
        >
          ✓ Verificar
        </button>
        <button
          type="button"
          onClick={() => {
            setRejectNotes("");
            setError(null);
            setShowRejectModal(true);
          }}
          disabled={submitting}
          className="px-4 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer disabled:opacity-50"
        >
          ✗ Rechazar
        </button>
      </div>

      {error && !showRejectModal && (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 max-w-md w-full">
            <h3 className="font-semibold mb-2 text-gray-900">
              Rechazar declaración
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Indica el motivo (mín. 10 caracteres). El declarante lo verá en
              su perfil.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => {
                setRejectNotes(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              maxLength={500}
              className="w-full p-2 border border-gray-300 rounded mb-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Ej: La obra citante no menciona la investigación de Studio IURIS, o la cita es de otra obra distinta…"
            />
            <p className="text-xs text-gray-500 mb-3">
              {rejectNotes.length} / 500
            </p>
            {error && (
              <p className="mb-3 text-xs text-red-700">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={submitting}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded cursor-pointer hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={submitting || rejectNotes.trim().length < 10}
                className="px-4 py-1.5 text-sm bg-red-600 text-white rounded cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Rechazando…" : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
