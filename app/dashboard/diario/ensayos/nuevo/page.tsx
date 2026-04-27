"use client";

import { useState, useRef, type FormEvent, type DragEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MATERIAS } from "@/app/dashboard/diario/types/obiter";
import { TagsInput } from "@/app/dashboard/diario/components/tags-input";

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
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/dashboard/diario?tab=ensayos"
            className="group inline-flex items-center gap-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-sage transition-colors cursor-pointer"
          >
            <span className="font-cormorant text-[16px] leading-none -mt-px transition-transform group-hover:-translate-x-1">←</span>
            Volver a los ensayos
          </Link>
          <span className="hidden sm:inline font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Nuevo · Ensayo
          </span>
        </div>

        {/* ═══ Hero editorial ═══════════════════════════════════ */}
        <header className="gz-section-header relative mb-7">
          <div className="h-px bg-gz-ink/35 mb-3" />

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={44}
              height={44}
              className="h-9 w-9 shrink-0"
            />
            <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-sage font-semibold flex items-center gap-1.5">
              <span aria-hidden>📜</span>
              Sección III · Ensayo · Nuevo
            </p>
          </div>

          <h1 className="font-cormorant text-[30px] sm:text-[40px] !font-bold leading-[1.05] tracking-tight text-gz-ink mb-2">
            Publica tu <span className="text-gz-sage italic">ensayo</span>
          </h1>
          <p className="font-cormorant italic text-[15px] sm:text-[16px] text-gz-ink-mid">
            Sube tu pieza académica — opinión, doctrina, comentario o tesis. La tribuna larga del estudio jurídico.
          </p>

          {/* Triple regla */}
          <div className="mt-4 h-[3px] bg-gz-ink/85" />
          <div className="h-px bg-gz-ink/85 mt-[2px]" />
          <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
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
            {renderLabel("Título del ensayo")}
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Hacia una reinterpretación del error esencial"
              className="w-full font-cormorant text-[22px] leading-tight bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-sage focus:ring-1 focus:ring-gz-sage/20 transition-colors"
            />
          </div>

          {/* ═══ ARCHIVO ═══ */}
          <div className="border-t border-gz-rule mt-8 pt-7">
            <SectionHeader
              numero="I"
              titulo="Archivo"
              hint="PDF o Word (.docx) · Máximo 10 MB"
            />

            {archivo ? (
              <div className="flex items-center gap-3 bg-white border border-gz-rule rounded-[4px] px-4 py-3">
                <div className="flex h-10 w-9 shrink-0 items-center justify-center rounded-[3px] border border-gz-sage/40 bg-gz-sage/5 font-ibm-mono text-[9px] font-bold tracking-[1px] text-gz-sage">
                  {archivo.name.split(".").pop()?.toUpperCase() ?? "DOC"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-archivo text-[13px] font-semibold text-gz-ink truncate">
                    {archivo.name}
                  </p>
                  <p className="font-ibm-mono text-[10px] text-gz-ink-light uppercase tracking-[1px]">
                    {formatFileSize(archivo.size)}
                    <span className="mx-1.5 text-gz-rule-dark">·</span>
                    <span className="text-gz-sage font-semibold">✓ Subido</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setArchivo(null)}
                  className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-gz-ink-light hover:bg-gz-burgundy/10 hover:text-gz-burgundy transition-colors cursor-pointer"
                  aria-label="Quitar archivo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`cursor-pointer border-2 border-dashed rounded-[4px] px-6 py-12 text-center bg-white transition-all ${
                  dragging
                    ? "border-gz-sage bg-gz-sage/[0.04] scale-[1.005]"
                    : "border-gz-rule hover:border-gz-sage/60 hover:bg-gz-sage/[0.02]"
                }`}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gz-sage/10">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="text-gz-sage">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12m4.5-4.5V18" />
                  </svg>
                </div>
                <p className="font-cormorant italic text-[17px] text-gz-ink-mid mb-1">
                  Arrastra tu archivo aquí o haz click para buscar
                </p>
                <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  PDF o Word (.docx) · Máximo 10 MB
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
          <div className="border-t border-gz-rule mt-8 pt-7">
            <SectionHeader
              numero="II"
              titulo="Clasificación"
              hint="Rama del derecho, tipo de ensayo y etiquetas para que tus colegas lo encuentren."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Rama */}
              <div>
                {renderLabel("Rama del derecho")}
                <select
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-sage focus:ring-1 focus:ring-gz-sage/20 transition-colors cursor-pointer"
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
                {renderLabel("Tipo de publicación")}
                <select
                  value={tipoPublicacion}
                  onChange={(e) => setTipoPublicacion(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-sage focus:ring-1 focus:ring-gz-sage/20 transition-colors cursor-pointer"
                >
                  <option value="">Seleccionar...</option>
                  {TIPOS_ENSAYO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags — free-form */}
              <div className="md:col-span-2">
                {renderLabel("Tags")}
                <p className="text-gz-ink-light font-archivo text-[13px] italic mt-1.5 mb-2">
                  Escribe tus propios #tags. Espacio, enter o coma para confirmar.
                </p>
                <TagsInput
                  value={tags}
                  onChange={setTags}
                  placeholder="ej: derecho_comparado, reforma_procesal..."
                  accent="sage"
                  max={8}
                />
              </div>
            </div>
          </div>

          {/* ═══ RESUMEN ═══ */}
          <div className="border-t border-gz-rule mt-8 pt-7">
            <div className="flex items-start justify-between mb-2 gap-3">
              <div className="flex-1">
                <SectionHeader
                  numero="III"
                  titulo="Bajada"
                  hint="Resumen breve que aparecerá como preview en el feed de Obiter Dictum."
                  noMarginBottom
                />
              </div>
              <span
                className={`font-ibm-mono text-[10px] uppercase tracking-[1px] tabular-nums shrink-0 mt-1 ${
                  wordCount(resumen) > 150 ? "text-gz-burgundy font-bold" : "text-gz-ink-light"
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
              className="mt-3 w-full font-cormorant italic text-[16px] leading-[1.6] bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-sage focus:ring-1 focus:ring-gz-sage/20 transition-colors resize-y"
            />
          </div>

          {/* ═══ OPTIONS & SUBMIT ═══ */}
          <div className="border-t border-gz-rule mt-8 pt-7">
            {/* Show in feed checkbox — card editorial */}
            <label className="flex items-start gap-3 cursor-pointer rounded-[3px] border border-gz-rule bg-white p-3 hover:border-gz-sage/50 transition-colors mb-4">
              <input
                type="checkbox"
                checked={showInFeed}
                onChange={(e) => setShowInFeed(e.target.checked)}
                className="accent-gz-sage w-4 h-4 mt-0.5"
              />
              <div className="flex-1">
                <span className="font-archivo text-[13px] font-semibold text-gz-ink">
                  Mostrar preview en el feed de Obiter Dictum
                </span>
                <p className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mt-0.5">
                  Se generará un OD-resumen automático que enlaza a este ensayo.
                </p>
              </div>
            </label>

            {/* Daily limit */}
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-6 flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-gz-ink-light/50" />
              0/1 publicaciones largas hoy (free)
            </p>

            {/* Buttons */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-full border border-gz-rule px-6 py-2.5 font-archivo text-[12px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light hover:border-gz-burgundy hover:text-gz-burgundy transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-gz-sage px-7 py-2.5 font-archivo text-[12px] font-semibold uppercase tracking-[1.5px] text-white hover:bg-gz-ink transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Publicando…" : "Publicar Ensayo →"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SectionHeader — header editorial reutilizable ─────────

function SectionHeader({
  numero,
  titulo,
  hint,
  noMarginBottom = false,
}: {
  numero: string;
  titulo: string;
  hint?: string;
  noMarginBottom?: boolean;
}) {
  return (
    <div className={noMarginBottom ? "" : "mb-4"}>
      <div className="flex items-baseline gap-3 mb-1">
        <span
          className="font-cormorant text-[28px] !font-bold text-gz-sage/40 leading-none"
          aria-hidden
        >
          {numero}
        </span>
        <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink leading-none">
          {titulo}
        </h2>
      </div>
      {hint && (
        <p className="font-cormorant italic text-[13px] text-gz-ink-mid pl-9">
          {hint}
        </p>
      )}
    </div>
  );
}
