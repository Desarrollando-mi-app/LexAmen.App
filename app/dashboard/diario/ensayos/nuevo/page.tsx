"use client";

import { useState, useRef, type FormEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { MATERIAS } from "@/app/dashboard/diario/types/obiter";

// ─── Constants ──────────────────────────────────────────────

const TIPOS_ENSAYO = [
  { value: "opinion", label: "Opinión" },
  { value: "nota_doctrinaria", label: "Nota doctrinaria" },
  { value: "comentario_reforma", label: "Comentario de reforma" },
  { value: "analisis_comparado", label: "Análisis comparado" },
  { value: "tesis", label: "Tesis / Memoria" },
  { value: "otro", label: "Otro" },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ─── Helpers ────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

// ─── Component ──────────────────────────────────────────────

export default function NuevoEnsayoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [materia, setMateria] = useState("");
  const [tipoPublicacion, setTipoPublicacion] = useState("");
  const [tags, setTags] = useState("");
  const [resumen, setResumen] = useState("");
  const [showInFeed, setShowInFeed] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  // ─── File handling ──────────────────────────────────────

  function handleFileSelect(file: File | null) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setErrors(["Solo se aceptan archivos PDF o Word (.docx)."]);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrors(["El archivo supera el límite de 10 MB."]);
      return;
    }
    setErrors([]);
    setArchivo(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileSelect(file);
  }

  // ─── Validation ─────────────────────────────────────────

  function validate(): string[] {
    const errs: string[] = [];
    if (!titulo.trim()) errs.push("El título es requerido.");
    if (!archivo) errs.push("Debes subir un archivo.");
    if (!materia) errs.push("Selecciona una materia.");
    if (!tipoPublicacion) errs.push("Selecciona un tipo de publicación.");
    if (wordCount(resumen) > 150)
      errs.push("El resumen supera el límite de 150 palabras.");
    return errs;
  }

  // ─── Submit ─────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("titulo", titulo.trim());
      formData.append("archivo", archivo!);
      formData.append("materia", materia);
      formData.append("tipoPublicacion", tipoPublicacion);
      formData.append("showInFeed", String(showInFeed));

      if (tags.trim()) {
        formData.append("tags", tags.trim());
      }
      if (resumen.trim()) {
        formData.append("resumen", resumen.trim());
      }

      const res = await fetch("/api/diario/ensayos", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || `Error ${res.status}: No se pudo publicar.`
        );
      }

      router.push("/dashboard/diario");
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : "Error al publicar el ensayo.",
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Render helpers ─────────────────────────────────────

  function renderLabel(text: string) {
    return (
      <label className="block font-ibm-mono uppercase tracking-wider text-[11px] text-gz-ink-light mb-1.5">
        {text}
      </label>
    );
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gz-cream">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-8">
          <p className="font-ibm-mono uppercase tracking-wider text-[11px] text-gz-ink-light">
            Ensayo · Nueva Publicacion
          </p>
          <div className="border-t-2 border-gz-rule mt-2" />
        </header>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 border border-red-300 bg-red-50 rounded-[4px] p-4">
            <p className="font-ibm-mono uppercase tracking-wider text-[11px] text-red-700 mb-2">
              Errores
            </p>
            <ul className="list-disc pl-5 space-y-1 font-archivo text-sm text-red-700">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="mb-6">
            {renderLabel("Titulo del ensayo")}
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Hacia una reinterpretación del error esencial"
              className="w-full font-cormorant text-[22px] leading-tight bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
            />
          </div>

          {/* ═══ ARCHIVO ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink mb-4">
              Archivo
            </h2>

            {archivo ? (
              <div className="flex items-center gap-3 bg-white border border-gz-rule rounded-[4px] px-4 py-3">
                <span className="font-archivo text-sm text-gz-ink">
                  {archivo.name}
                </span>
                <span className="font-ibm-mono text-[11px] text-gz-ink-light">
                  {formatFileSize(archivo.size)}
                </span>
                <span className="font-ibm-mono text-[11px] text-green-700">
                  OK
                </span>
                <button
                  type="button"
                  onClick={() => setArchivo(null)}
                  className="ml-auto font-archivo text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  x
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`cursor-pointer border-2 border-dashed rounded-[4px] px-6 py-10 text-center bg-white transition-colors ${
                  dragging
                    ? "border-gz-gold bg-gz-cream"
                    : "border-gz-rule hover:border-gz-gold"
                }`}
              >
                <p className="font-cormorant text-lg text-gz-ink mb-1">
                  Arrastra tu archivo aqui o haz click para buscar
                </p>
                <p className="font-ibm-mono text-[11px] text-gz-ink-light">
                  PDF o Word (.docx) · Maximo 10 MB
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                handleFileSelect(file);
                // Reset so the same file can be re-selected
                e.target.value = "";
              }}
            />
          </div>

          {/* ═══ METADATA ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Materia */}
              <div>
                {renderLabel("Materia")}
                <select
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-gold transition-colors"
                >
                  <option value="">Seleccionar...</option>
                  {MATERIAS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de publicación */}
              <div>
                {renderLabel("Tipo de publicacion")}
                <select
                  value={tipoPublicacion}
                  onChange={(e) => setTipoPublicacion(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-gold transition-colors"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_ENSAYO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div className="md:col-span-2">
                {renderLabel("Tags (opcional, separados por coma)")}
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="derecho comparado, reforma procesal"
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ═══ RESUMEN ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink">
                Resumen (recomendado)
              </h2>
              <span
                className={`font-ibm-mono text-[11px] ${
                  wordCount(resumen) > 150 ? "text-red-600" : "text-gz-ink-light"
                }`}
              >
                {wordCount(resumen)}/150 pal.
              </span>
            </div>
            <textarea
              value={resumen}
              onChange={(e) => {
                if (e.target.value.length <= 1000) setResumen(e.target.value);
              }}
              maxLength={1000}
              rows={4}
              placeholder="Breve resumen que aparecerá en el feed..."
              className="w-full font-cormorant text-[16px] leading-relaxed bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y"
            />
            <p className="font-ibm-mono text-[11px] text-gz-ink-light mt-1.5">
              El resumen aparecera como preview en el feed
            </p>
          </div>

          {/* ═══ OPTIONS & SUBMIT ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            {/* Show in feed checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={showInFeed}
                onChange={(e) => setShowInFeed(e.target.checked)}
                className="accent-gz-navy w-4 h-4"
              />
              <span className="font-archivo text-sm text-gz-ink">
                Mostrar preview en el feed de Obiter Dictum
              </span>
            </label>

            {/* Daily limit */}
            <p className="font-ibm-mono text-[11px] text-gz-ink-light mb-6">
              0/1 publicaciones largas hoy (free)
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 font-archivo text-sm border border-gz-rule text-gz-ink-light rounded-[4px] hover:border-gz-gold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 font-archivo text-sm bg-gz-navy text-white rounded-[4px] hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Publicando..." : "Publicar Ensayo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
