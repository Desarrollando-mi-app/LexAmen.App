"use client";

import { useState, useEffect } from "react";

type ReportButtonProps = {
  contentType: "FLASHCARD" | "MCQ" | "TRUEFALSE" | "FillBlank" | "ERROR_IDENTIFICATION" | "OrderSequence" | "MatchColumns" | "DictadoJuridico" | "Timeline" | "CasoPractico";
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
        className="mt-3 font-archivo text-[11px] text-gz-ink-light transition-colors hover:text-gz-ink"
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
          <div
            className="w-full max-w-md rounded-[4px] border border-gz-rule p-6 shadow-sm"
            style={{ backgroundColor: "var(--gz-cream)" }}
          >
            {sent ? (
              /* Estado: Enviado */
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gz-sage/10">
                  <span className="text-xl text-gz-sage">✓</span>
                </div>
                <p className="mt-4 font-cormorant text-[18px] !font-bold text-gz-ink">
                  Reporte enviado. ¡Gracias!
                </p>
                <p className="mt-1 font-archivo text-[13px] text-gz-ink-light">
                  Lo revisaremos pronto.
                </p>
              </div>
            ) : (
              /* Estado: Formulario */
              <>
                <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">
                  Reportar un error
                </h3>
                <p className="mt-1 font-archivo text-[13px] text-gz-ink-light">
                  Ayúdanos a mejorar el contenido.
                </p>

                {/* Selector de razón */}
                <div className="mt-4">
                  <label className="mb-1.5 block font-ibm-mono text-[10px] font-medium uppercase tracking-[1px] text-gz-ink-light">
                    ¿Cuál es el problema?
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
                    style={{ backgroundColor: "var(--gz-cream)" }}
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
                  <label className="mb-1.5 block font-ibm-mono text-[10px] font-medium uppercase tracking-[1px] text-gz-ink-light">
                    Describe el problema{" "}
                    <span className="normal-case tracking-normal font-archivo text-gz-ink-light/50">(opcional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: El artículo correcto es el 1545, no el 1546..."
                    rows={3}
                    className="w-full resize-none rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  />
                </div>

                {/* Botones */}
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={handleClose}
                    className="rounded-[3px] px-4 py-2 font-archivo text-[13px] font-medium text-gz-ink-light transition-colors hover:text-gz-ink"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!reason || isSubmitting}
                    className="rounded-[3px] bg-gz-navy px-5 py-2 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
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
