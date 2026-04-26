"use client";

import { useState } from "react";

const MATERIAS = [
  { value: "acto_juridico", label: "Acto Jurídico" },
  { value: "obligaciones", label: "Obligaciones" },
  { value: "contratos", label: "Contratos" },
  { value: "procesal_civil", label: "Procesal Civil" },
  { value: "bienes", label: "Bienes" },
  { value: "familia", label: "Familia" },
  { value: "sucesiones", label: "Sucesiones" },
  { value: "otro", label: "Otro" },
];

const FORMATOS = [
  {
    value: "mini" as const,
    label: "Mini",
    description: "Análisis breve (resumen + opinión, 800 palabras aprox).",
    color: "var(--gz-gold)",
  },
  {
    value: "completo" as const,
    label: "Completo",
    description: "Análisis exhaustivo (hechos, ratio, opinión, sin tope).",
    color: "var(--gz-navy)",
  },
];

const HECHOS_MAX = 2000;
const RATIO_MAX = 3500;
const RESUMEN_MAX = 1000;

interface AnalisisModalProps {
  open: boolean;
  onClose: () => void;
  onPublished: (analisisId: string) => void;
}

export function AnalisisModal({ open, onClose, onPublished }: AnalisisModalProps) {
  const [formato, setFormato] = useState<"mini" | "completo">("mini");
  const [titulo, setTitulo] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [numeroRol, setNumeroRol] = useState("");
  const [fechaFallo, setFechaFallo] = useState("");
  const [partes, setPartes] = useState("");
  const [materia, setMateria] = useState("");
  const [tags, setTags] = useState("");
  const [falloUrl, setFalloUrl] = useState("");
  const [hechos, setHechos] = useState("");
  const [ratioDecidendi, setRatioDecidendi] = useState("");
  const [opinion, setOpinion] = useState("");
  const [resumen, setResumen] = useState("");
  const [showInFeed, setShowInFeed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setFormato("mini");
    setTitulo("");
    setTribunal("");
    setNumeroRol("");
    setFechaFallo("");
    setPartes("");
    setMateria("");
    setTags("");
    setFalloUrl("");
    setHechos("");
    setRatioDecidendi("");
    setOpinion("");
    setResumen("");
    setShowInFeed(true);
    setError(null);
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        formato,
        titulo,
        tribunal,
        numeroRol,
        fechaFallo,
        partes,
        materia,
        tags: tags.trim() || undefined,
        falloUrl: falloUrl.trim() || undefined,
        hechos,
        ratioDecidendi,
        opinion,
        resumen,
        showInFeed,
      };
      const res = await fetch("/api/diario/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al publicar el análisis.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      onPublished(data.analisis?.id ?? "");
      reset();
      onClose();
    } catch {
      setError("Error de conexión.");
      setSubmitting(false);
    }
  }

  const formatoActivo = FORMATOS.find((f) => f.value === formato)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/45 p-4 overflow-y-auto cal-anim-backdrop"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="cal-anim-modal w-full max-w-3xl rounded-[6px] border border-gz-rule overflow-hidden shadow-[0_20px_50px_-15px_rgba(15,15,15,0.35)] my-8"
        style={{ backgroundColor: "var(--gz-cream)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[5px] w-full" style={{ backgroundColor: formatoActivo.color }} />
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4 bg-white">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full font-cormorant text-[20px] leading-none border-2"
              style={{
                color: formatoActivo.color,
                borderColor: `color-mix(in srgb, ${formatoActivo.color} 30%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${formatoActivo.color} 10%, transparent)`,
              }}
            >
              ¶
            </span>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-ink-light">
                Nueva publicación
              </p>
              <h3 className="font-cormorant text-[22px] font-bold text-gz-ink leading-none mt-0.5">
                Análisis de Sentencia
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

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Formato selector */}
          <div>
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2">
              Formato del análisis
            </p>
            <div className="grid grid-cols-2 gap-2">
              {FORMATOS.map((f) => {
                const active = formato === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormato(f.value)}
                    className={`text-left rounded-[4px] border-2 p-3 transition-all cursor-pointer ${
                      active
                        ? "border-current shadow-sm"
                        : "border-gz-rule hover:border-gz-ink/30"
                    }`}
                    style={active ? { color: f.color } : undefined}
                  >
                    <p className="font-cormorant text-[18px] font-bold leading-none">{f.label}</p>
                    <p className="font-archivo text-[11px] text-gz-ink-mid mt-1 leading-snug">
                      {f.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              placeholder='Ej: "La nulidad relativa frente a la confirmación tácita"'
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:outline-none focus:ring-1"
              style={{ borderColor: undefined }}
            />
          </div>

          {/* Tribunal + Rol + Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Tribunal *
              </label>
              <input
                type="text"
                value={tribunal}
                onChange={(e) => setTribunal(e.target.value)}
                required
                placeholder="Corte Suprema"
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                N° Rol *
              </label>
              <input
                type="text"
                value={numeroRol}
                onChange={(e) => setNumeroRol(e.target.value)}
                required
                placeholder="12345-2024"
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Fecha del fallo *
              </label>
              <input
                type="date"
                value={fechaFallo}
                onChange={(e) => setFechaFallo(e.target.value)}
                required
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:outline-none"
              />
            </div>
          </div>

          {/* Partes + Materia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Partes *
              </label>
              <input
                type="text"
                value={partes}
                onChange={(e) => setPartes(e.target.value)}
                required
                placeholder="Pérez con Banco Estado"
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Materia *
              </label>
              <select
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                required
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:outline-none"
              >
                <option value="">Seleccionar…</option>
                {MATERIAS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags + URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Tags <span className="text-gz-ink-light/60 normal-case">(opcional)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="nulidad, contrato, casacion"
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                URL del fallo <span className="text-gz-ink-light/60 normal-case">(opcional)</span>
              </label>
              <input
                type="url"
                value={falloUrl}
                onChange={(e) => setFalloUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:outline-none"
              />
            </div>
          </div>

          {/* Hechos */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Hechos *
            </label>
            <textarea
              value={hechos}
              onChange={(e) => setHechos(e.target.value.slice(0, HECHOS_MAX))}
              required
              minLength={20}
              rows={3}
              placeholder="Resumen de los hechos del caso…"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-cormorant text-[15px] leading-relaxed text-gz-ink focus:outline-none resize-none"
            />
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">{hechos.length}/{HECHOS_MAX}</p>
          </div>

          {/* Ratio Decidendi */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Ratio Decidendi *
            </label>
            <textarea
              value={ratioDecidendi}
              onChange={(e) => setRatioDecidendi(e.target.value.slice(0, RATIO_MAX))}
              required
              minLength={20}
              rows={4}
              placeholder="Razón fundamental de la decisión…"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-cormorant text-[15px] leading-relaxed text-gz-ink focus:outline-none resize-none"
            />
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">{ratioDecidendi.length}/{RATIO_MAX}</p>
          </div>

          {/* Opinion */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Opinión personal *
            </label>
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              required
              minLength={20}
              rows={4}
              placeholder="Tu análisis crítico de la decisión…"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-cormorant text-[15px] leading-relaxed text-gz-ink focus:outline-none resize-none"
            />
          </div>

          {/* Resumen */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Resumen ejecutivo *
            </label>
            <textarea
              value={resumen}
              onChange={(e) => setResumen(e.target.value.slice(0, RESUMEN_MAX))}
              required
              minLength={20}
              rows={3}
              placeholder="Síntesis para el feed…"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-cormorant text-[15px] leading-relaxed text-gz-ink focus:outline-none resize-none"
            />
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">{resumen.length}/{RESUMEN_MAX}</p>
          </div>

          {/* Show in feed */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInFeed}
              onChange={(e) => setShowInFeed(e.target.checked)}
              className="h-4 w-4 rounded border-gz-rule text-gz-navy focus:ring-gz-navy"
            />
            <span className="font-archivo text-[12px] text-gz-ink-mid">
              Mostrar en el feed del Diario
            </span>
          </label>

          {error && (
            <div className="rounded-[3px] border border-gz-burgundy/30 bg-gz-burgundy/[0.06] px-3 py-2">
              <p className="font-archivo text-[12px] text-gz-burgundy">{error}</p>
            </div>
          )}

          <p className="font-archivo italic text-[11px] text-gz-ink-light leading-snug">
            ¿Necesitas colaboración con colegas o peer review? Usá la{" "}
            <a
              href="/dashboard/diario/analisis/nuevo"
              className="text-gz-gold hover:underline"
            >
              versión completa del editor →
            </a>
          </p>
        </div>

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
            disabled={
              submitting ||
              !titulo.trim() ||
              !tribunal.trim() ||
              !numeroRol.trim() ||
              !fechaFallo ||
              !partes.trim() ||
              !materia ||
              !hechos.trim() ||
              !ratioDecidendi.trim() ||
              !opinion.trim() ||
              !resumen.trim()
            }
            className="rounded-[3px] px-5 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-ink active:scale-95 disabled:opacity-50 transition-all duration-200 cursor-pointer"
            style={{ backgroundColor: formatoActivo.color }}
          >
            {submitting ? "Publicando…" : "Publicar análisis"}
          </button>
        </div>
      </form>
    </div>
  );
}
