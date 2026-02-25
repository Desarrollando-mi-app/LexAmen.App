"use client";

import { useState, useEffect } from "react";

type ReportButtonProps = {
  contentType: "FLASHCARD" | "MCQ" | "TRUEFALSE";
  contentId: string;
};

const REASONS = [
  "Respuesta incorrecta",
  "Artículo del CC equivocado",
  "Redacción confusa o ambigua",
  "Contenido desactualizado",
  "Otro",
];

export function ReportButton({ contentType, contentId }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  // Auto-cerrar modal tras enviar
  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => {
      setIsOpen(false);
      setSent(false);
      setReason("");
      setDescription("");
    }, 2000);
    return () => clearTimeout(timer);
  }, [sent]);

  async function handleSubmit() {
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId, reason, description }),
      });
      setSent(true);
    } catch {
      // Error de red silencioso
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (isSubmitting) return;
    setIsOpen(false);
    setSent(false);
    setReason("");
    setDescription("");
  }

  return (
    <>
      {/* Botón discreto */}
      <button
        onClick={() => setIsOpen(true)}
        className="mt-3 text-xs text-navy/40 transition-colors hover:text-navy/60"
      >
        ⚑ Reportar error
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6">
            {sent ? (
              /* Estado: Enviado */
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <span className="text-xl text-green-500">✓</span>
                </div>
                <p className="mt-4 font-semibold text-navy">
                  Reporte enviado. ¡Gracias!
                </p>
                <p className="mt-1 text-sm text-navy/50">
                  Lo revisaremos pronto.
                </p>
              </div>
            ) : (
              /* Estado: Formulario */
              <>
                <h3 className="text-lg font-semibold text-navy">
                  Reportar un error
                </h3>
                <p className="mt-1 text-sm text-navy/50">
                  Ayúdanos a mejorar el contenido.
                </p>

                {/* Selector de razón */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-navy">
                    ¿Cuál es el problema?
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="">Selecciona una razón...</option>
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descripción opcional */}
                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-medium text-navy">
                    Describe el problema{" "}
                    <span className="text-navy/40">(opcional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: El artículo correcto es el 1545, no el 1546..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy placeholder:text-navy/30 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                </div>

                {/* Botones */}
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={handleClose}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-navy/60 transition-colors hover:text-navy"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || isSubmitting}
                    className="rounded-lg bg-navy px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-navy/90 disabled:opacity-50"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar reporte"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
