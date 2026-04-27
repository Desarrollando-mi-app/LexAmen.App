"use client";

import { useRef, useState } from "react";
import { RAMAS as MATERIAS } from "@/lib/ramas-derecho";

const TIPOS = [
  { value: "opinion", label: "Opinión" },
  { value: "nota_doctrinaria", label: "Nota doctrinaria" },
  { value: "comentario_reforma", label: "Comentario de reforma" },
  { value: "analisis_comparado", label: "Análisis comparado" },
  { value: "tesis", label: "Tesis / Memoria" },
  { value: "otro", label: "Otro" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const RESUMEN_MAX = 1000;

interface EnsayoModalProps {
  open: boolean;
  onClose: () => void;
  onPublished: (ensayoId: string) => void;
}

export function EnsayoModal({ open, onClose, onPublished }: EnsayoModalProps) {
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("");
  const [tipo, setTipo] = useState("");
  const [tags, setTags] = useState("");
  const [resumen, setResumen] = useState("");
  const [showInFeed, setShowInFeed] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function reset() {
    setTitulo("");
    setMateria("");
    setTipo("");
    setTags("");
    setResumen("");
    setShowInFeed(true);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);
    setSubmitting(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(f.type)) {
      setError("Solo se permiten PDF o DOCX.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("El archivo no puede exceder 10 MB.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Adjunta un PDF o DOCX.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("titulo", titulo);
      fd.append("materia", materia);
      fd.append("tipo", tipo);
      if (tags.trim()) fd.append("tags", tags.trim());
      if (resumen.trim()) fd.append("resumen", resumen.trim());
      fd.append("showInFeed", String(showInFeed));
      fd.append("file", file);

      const res = await fetch("/api/diario/ensayos", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al publicar el ensayo.");
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      onPublished(data.ensayo?.id ?? "");
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
        <div className="h-[5px] w-full bg-gz-sage" />
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4 bg-white">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full font-cormorant text-[20px] leading-none border-2 border-gz-sage/30 bg-gz-sage/10 text-gz-sage">
              ◆
            </span>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-ink-light">
                Nueva publicación
              </p>
              <h3 className="font-cormorant text-[22px] font-bold text-gz-ink leading-none mt-0.5">
                Publicar Ensayo
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
              placeholder='Ej: "La buena fe en los contratos atípicos"'
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-sage focus:outline-none focus:ring-1 focus:ring-gz-sage/30"
            />
          </div>

          {/* Materia + Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Materia *
              </label>
              <select
                value={materia}
                onChange={(e) => setMateria(e.target.value)}
                required
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:border-gz-sage focus:outline-none focus:ring-1 focus:ring-gz-sage/30"
              >
                <option value="">Seleccionar…</option>
                {MATERIAS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
                Tipo *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink focus:border-gz-sage focus:outline-none focus:ring-1 focus:ring-gz-sage/30"
              >
                <option value="">Seleccionar…</option>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Tags <span className="text-gz-ink-light/60 normal-case">(opcional, separados por coma)</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="buena_fe, contratos, doctrina"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-sage focus:outline-none focus:ring-1 focus:ring-gz-sage/30"
            />
          </div>

          {/* Resumen */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Resumen <span className="text-gz-ink-light/60 normal-case">(opcional)</span>
            </label>
            <textarea
              value={resumen}
              onChange={(e) => setResumen(e.target.value.slice(0, RESUMEN_MAX))}
              rows={3}
              placeholder="Una breve descripción de tu ensayo, máx. 1000 caracteres."
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-cormorant text-[15px] leading-relaxed text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-sage focus:outline-none focus:ring-1 focus:ring-gz-sage/30 resize-none"
            />
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">{resumen.length}/{RESUMEN_MAX}</p>
          </div>

          {/* File upload */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Archivo (PDF o DOCX, máx. 10 MB) *
            </label>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                required
                className="block w-full text-[13px] font-archivo text-gz-ink file:mr-3 file:rounded-[3px] file:border-0 file:bg-gz-sage file:px-3 file:py-1.5 file:text-white file:font-semibold file:cursor-pointer hover:file:bg-gz-ink"
              />
            </div>
            {file && (
              <p className="mt-1 font-ibm-mono text-[10px] text-gz-sage">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          {/* Show in feed */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInFeed}
              onChange={(e) => setShowInFeed(e.target.checked)}
              className="h-4 w-4 rounded border-gz-rule text-gz-sage focus:ring-gz-sage"
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
            disabled={submitting || !titulo.trim() || !materia || !tipo || !file}
            className="rounded-[3px] bg-gz-sage px-5 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-ink active:scale-95 disabled:opacity-50 transition-all duration-200 cursor-pointer"
          >
            {submitting ? "Publicando…" : "Publicar ensayo"}
          </button>
        </div>
      </form>
    </div>
  );
}
