"use client";

import { useState, useEffect } from "react";
import { MOTIVOS_REPORTE } from "@/lib/sala-constants";

interface ReporteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (motivo: string, descripcion?: string) => Promise<void>;
  tipoPublicacion: "ayudantía" | "pasantía" | "evento" | "oferta";
}

export function ReporteModal({
  isOpen,
  onClose,
  onSubmit,
  tipoPublicacion,
}: ReporteModalProps) {
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"success" | "hidden" | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setMotivo("");
      setDescripcion("");
      setLoading(false);
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!motivo) return;
    setLoading(true);
    try {
      await onSubmit(motivo, descripcion.trim() || undefined);
      setResult("success");
    } catch {
      setResult("success"); // Even on error, show generic success
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-[4px] border border-gz-rule shadow-lg"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            REPORTAR {tipoPublicacion.toUpperCase()}
          </p>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors"
            aria-label="Cerrar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="M6 6 18 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {result ? (
            /* Post-submit message */
            <div className="text-center py-6">
              <span className="text-[32px] block mb-3">
                {result === "hidden" ? "🛡️" : "✓"}
              </span>
              <p className="font-cormorant text-[18px] !font-bold text-gz-ink mb-2">
                Reporte registrado
              </p>
              <p className="font-archivo text-[13px] text-gz-ink-mid">
                Tu reporte ha sido registrado. Gracias por ayudar a mantener la
                comunidad.
              </p>
              <button
                onClick={onClose}
                className="mt-5 bg-gz-navy text-white font-archivo text-[13px] font-semibold px-6 py-2.5 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <p className="font-archivo text-[14px] font-semibold text-gz-ink mb-4">
                ¿Por qué reportas esta publicación?
              </p>

              {/* Radio buttons */}
              <div className="space-y-2.5 mb-5">
                {MOTIVOS_REPORTE.map((m) => (
                  <label
                    key={m.value}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        motivo === m.value
                          ? "border-gz-gold bg-gz-gold"
                          : "border-gz-rule group-hover:border-gz-gold/50"
                      }`}
                    >
                      {motivo === m.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="font-archivo text-[13px] text-gz-ink">
                      {m.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Description */}
              <div className="mb-5">
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1.5 block">
                  Detalle (opcional)
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  placeholder="Describe el problema..."
                  className="w-full border border-gz-rule rounded-[3px] px-3 py-2.5 font-archivo text-[13px] text-gz-ink bg-white focus:border-gz-gold focus:ring-1 focus:ring-gz-gold/20 focus:outline-none transition-colors resize-none placeholder:text-gz-ink-light/50"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="border border-gz-rule text-gz-ink-mid font-archivo text-[13px] font-semibold px-5 py-2.5 rounded-[3px] hover:border-gz-gold hover:text-gz-gold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!motivo || loading}
                  className="bg-gz-burgundy text-white font-archivo text-[13px] font-semibold px-5 py-2.5 rounded-[3px] hover:bg-gz-burgundy/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar reporte"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
