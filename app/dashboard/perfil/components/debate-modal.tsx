"use client";

import { useState } from "react";

const RAMAS = [
  { value: "civil", label: "Derecho Civil" },
  { value: "penal", label: "Derecho Penal" },
  { value: "constitucional", label: "Derecho Constitucional" },
  { value: "administrativo", label: "Derecho Administrativo" },
  { value: "laboral", label: "Derecho Laboral" },
  { value: "tributario", label: "Derecho Tributario" },
  { value: "comercial", label: "Derecho Comercial" },
  { value: "procesal", label: "Derecho Procesal" },
  { value: "internacional", label: "Derecho Internacional" },
  { value: "ambiental", label: "Derecho Ambiental" },
  { value: "familia", label: "Derecho de Familia" },
  { value: "otro", label: "Otro" },
];

interface DebateModalProps {
  open: boolean;
  onClose: () => void;
  onPublished: (debateId: string) => void;
}

export function DebateModal({ open, onClose, onPublished }: DebateModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [rama, setRama] = useState("");
  const [materias, setMaterias] = useState("");
  const [miPosicion, setMiPosicion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setTitulo("");
    setDescripcion("");
    setRama("");
    setMaterias("");
    setMiPosicion("");
    setError(null);
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/diario/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ titulo, descripcion, rama, materias, miPosicion }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al publicar el debate.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      onPublished(data.debate?.id ?? "");
      reset();
      onClose();
    } catch {
      setError("Error de conexión.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/45 p-4 overflow-y-auto cal-anim-backdrop"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="cal-anim-modal w-full max-w-2xl rounded-[6px] border border-gz-rule overflow-hidden shadow-[0_20px_50px_-15px_rgba(15,15,15,0.35)] my-8"
        style={{ backgroundColor: "var(--gz-cream)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rail superior burdeos (color de Debate) */}
        <div className="h-[5px] w-full bg-gz-burgundy" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4 bg-white">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full font-cormorant text-[20px] leading-none border-2 border-gz-burgundy/30 bg-gz-burgundy/10 text-gz-burgundy">
              ⚔
            </span>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-ink-light">
                Nueva publicación
              </p>
              <h3 className="font-cormorant text-[22px] font-bold text-gz-ink leading-none mt-0.5">
                Proponer un Debate
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Título */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Título del debate *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              minLength={10}
              maxLength={200}
              placeholder='Ej: "La prescripción adquisitiva debe operar de pleno derecho"'
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-burgundy focus:outline-none focus:ring-1 focus:ring-gz-burgundy/30"
            />
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">{titulo.length}/200</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Descripción del problema jurídico *
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              minLength={30}
              maxLength={2000}
              rows={4}
              placeholder="Describe el problema, las normas aplicables y por qué es debatible…"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-cormorant text-[15px] leading-relaxed text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-burgundy focus:outline-none focus:ring-1 focus:ring-gz-burgundy/30 resize-none"
            />
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">{descripcion.length}/2000</p>
          </div>

          {/* Rama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Rama *
              </label>
              <select
                value={rama}
                onChange={(e) => setRama(e.target.value)}
                required
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:border-gz-burgundy focus:outline-none focus:ring-1 focus:ring-gz-burgundy/30"
              >
                <option value="">Seleccionar…</option>
                {RAMAS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Materias <span className="text-gz-ink-light/60 normal-case">(opcional)</span>
              </label>
              <input
                type="text"
                value={materias}
                onChange={(e) => setMaterias(e.target.value)}
                placeholder="prescripción, posesión, bienes"
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-burgundy focus:outline-none focus:ring-1 focus:ring-gz-burgundy/30"
              />
            </div>
          </div>

          {/* Mi posición */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Tu posición *
            </label>
            <textarea
              value={miPosicion}
              onChange={(e) => setMiPosicion(e.target.value)}
              required
              minLength={10}
              maxLength={500}
              rows={3}
              placeholder="¿A favor o en contra? ¿Qué tesis defiendes?"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-cormorant text-[15px] leading-relaxed text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-burgundy focus:outline-none focus:ring-1 focus:ring-gz-burgundy/30 resize-none"
            />
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">{miPosicion.length}/500</p>
          </div>

          {error && (
            <div className="rounded-[3px] border border-gz-burgundy/30 bg-gz-burgundy/[0.06] px-3 py-2">
              <p className="font-archivo text-[12px] text-gz-burgundy">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gz-rule px-5 py-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[3px] border border-gz-rule px-4 py-1.5 font-archivo text-[12px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !titulo.trim() || !descripcion.trim() || !rama || !miPosicion.trim()}
            className="rounded-[3px] bg-gz-burgundy px-5 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-ink active:scale-95 disabled:opacity-50 transition-all duration-200 cursor-pointer"
          >
            {submitting ? "Publicando…" : "Publicar debate"}
          </button>
        </div>
      </form>
    </div>
  );
}
