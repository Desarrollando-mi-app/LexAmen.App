"use client";

// ─── InvReportarCita — botón pequeño + modal de reporte ────────
//
// Permite a cualquier usuario autenticado reportar una cita interna
// con razón estructurada + detalles opcionales. La razón "otro"
// requiere detalles >=10 chars. Tras éxito, mostramos un toast simple
// (alert nativo, sin librería) y cerramos el modal.

import { useState, useRef, useEffect } from "react";

const REASONS = [
  { value: "inflado", label: "Cita inflada (gratuita / de relleno)" },
  { value: "irrelevante", label: "Cita irrelevante al tema" },
  { value: "plagio", label: "Posible plagio" },
  { value: "otro", label: "Otro motivo" },
];

export function InvReportarCita({ citacionId }: { citacionId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape cierra
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setReason("");
    setDetails("");
    setError(null);
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason) {
      setError("Selecciona un motivo.");
      return;
    }
    if (reason === "otro" && details.trim().length < 10) {
      setError("Describe el motivo (mín. 10 caracteres).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/citaciones/${citacionId}/reportar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al enviar el reporte.");
        return;
      }
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 1200);
    } catch {
      setError("Error de red al enviar el reporte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          reset();
          setOpen(true);
        }}
        className="font-cormorant italic text-[10px] text-inv-ink-4 hover:text-inv-tinta-roja underline-offset-2 hover:underline cursor-pointer transition-colors"
        title="Reportar esta cita"
      >
        Reportar
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-inv-ink/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-label="Reportar cita"
            className="fixed left-1/2 top-[18vh] z-50 w-[92vw] max-w-[480px] -translate-x-1/2 rounded-[3px] border border-inv-ink bg-inv-paper shadow-2xl overflow-hidden"
          >
            <div className="h-[3px] bg-inv-tinta-roja" />
            <div className="p-5">
              <p className="font-cormorant italic text-[11px] uppercase tracking-[2.5px] text-inv-tinta-roja mb-1">
                — Reportar cita —
              </p>
              <h2 className="font-cormorant text-[20px] font-medium text-inv-ink leading-tight mb-1">
                <em>¿Qué hay de sospechoso?</em>
              </h2>
              <p className="font-cormorant italic text-[12px] text-inv-ink-3 mb-4">
                La redacción de Studio IURIS revisará tu reporte.
              </p>

              {submitted ? (
                <div className="py-6 text-center">
                  <p className="font-cormorant italic text-[15px] text-inv-ocre">
                    Reporte enviado. Lo revisará la redacción.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block font-cormorant italic text-[11px] uppercase tracking-[1.5px] text-inv-ink-3 mb-1.5">
                      Motivo *
                    </label>
                    <div className="space-y-1.5">
                      {REASONS.map((r) => (
                        <label
                          key={r.value}
                          className="flex items-center gap-2 cursor-pointer font-crimson-pro text-[13px] text-inv-ink"
                        >
                          <input
                            type="radio"
                            name="reason"
                            value={r.value}
                            checked={reason === r.value}
                            onChange={(e) => setReason(e.target.value)}
                            className="accent-inv-tinta-roja"
                          />
                          {r.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-cormorant italic text-[11px] uppercase tracking-[1.5px] text-inv-ink-3 mb-1.5">
                      Detalles {reason === "otro" ? "*" : "(opcional)"}
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full p-2 border border-inv-rule bg-inv-paper font-crimson-pro text-[13px] text-inv-ink outline-none resize-y focus:border-inv-tinta-roja"
                      placeholder="Describe brevemente lo que viste…"
                    />
                    <p className="text-right font-cormorant italic text-[10px] text-inv-ink-4 mt-0.5">
                      {details.length} / 500
                    </p>
                  </div>

                  {error && (
                    <p className="font-crimson-pro text-[12px] text-inv-tinta-roja border border-inv-tinta-roja/40 bg-inv-tinta-roja/[0.05] px-2.5 py-1.5">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      disabled={submitting}
                      className="px-4 py-1.5 border border-inv-rule font-crimson-pro text-[11px] tracking-[1px] uppercase text-inv-ink-3 hover:border-inv-ink hover:text-inv-ink transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !reason}
                      className="px-4 py-1.5 bg-inv-tinta-roja text-inv-paper font-crimson-pro text-[11px] tracking-[1px] uppercase hover:bg-inv-ink transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Enviando…" : "Enviar reporte"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
