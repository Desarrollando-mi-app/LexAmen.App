"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

const MOTIVOS = [
  { value: "spam", label: "Spam o publicidad no deseada" },
  { value: "contenido_ofensivo", label: "Contenido ofensivo o inapropiado" },
  { value: "plagio", label: "Plagio o contenido copiado" },
  { value: "acoso", label: "Acoso o intimidación" },
  { value: "informacion_falsa", label: "Información jurídica deliberadamente falsa" },
  { value: "otro", label: "Otro motivo" },
];

interface ReportModalProps {
  reportadoId: string;
  contenidoId?: string;
  contenidoTipo?: string;
  trigger?: ReactNode;
}

export function ReportModal({
  reportadoId,
  contenidoId,
  contenidoTipo,
  trigger,
}: ReportModalProps) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!motivo) {
      toast.error("Selecciona un motivo");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportadoId,
          contenidoId,
          contenidoTipo,
          motivo,
          descripcion: descripcion.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Reporte enviado. Gracias por ayudarnos a mantener la comunidad.");
        setOpen(false);
        setMotivo("");
        setDescripcion("");
      } else {
        toast.error(data.error || "Error al enviar el reporte");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </span>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          title="Reportar"
        >
          🚩
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !submitting && setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-cormorant text-[20px] font-bold text-gz-ink">
              Reportar contenido
            </h3>
            <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
              ¿Por qué reportas este contenido?
            </p>

            {/* Motivo radio group */}
            <div className="mt-4 space-y-2">
              {MOTIVOS.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-center gap-3 rounded-[4px] border px-4 py-2.5 cursor-pointer transition-all font-archivo text-[13px] ${
                    motivo === m.value
                      ? "border-gz-gold bg-gz-gold/[0.06] text-gz-ink"
                      : "border-gz-rule text-gz-ink-mid hover:border-gz-gold/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="motivo"
                    value={m.value}
                    checked={motivo === m.value}
                    onChange={() => setMotivo(m.value)}
                    className="accent-[var(--gz-gold)]"
                  />
                  {m.label}
                </label>
              ))}
            </div>

            {/* Descripcion */}
            <div className="mt-4">
              <label className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
                Descripción (opcional)
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={1000}
                rows={3}
                className="mt-1 w-full rounded-[4px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 resize-none"
                placeholder="Explica brevemente por qué reportas este contenido..."
              />
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="rounded-[3px] px-4 py-2 font-archivo text-[13px] font-medium text-gz-ink-mid hover:text-gz-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !motivo}
                className="rounded-[3px] bg-gz-burgundy px-5 py-2 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-burgundy/90 disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Enviar reporte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
