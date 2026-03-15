"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { MATERIAS } from "@/app/dashboard/diario/types/obiter";

// ─── Constants ──────────────────────────────────────────────

const TRIBUNALES = [
  "Corte Suprema",
  "Corte de Apelaciones de Santiago",
  "Corte de Apelaciones de Valparaíso",
  "Corte de Apelaciones de Concepción",
  "Corte de Apelaciones de Temuco",
  "Corte de Apelaciones de Antofagasta",
  "Corte de Apelaciones de La Serena",
  "Corte de Apelaciones de Rancagua",
  "Corte de Apelaciones de Talca",
  "Corte de Apelaciones de Chillán",
  "Corte de Apelaciones de Valdivia",
  "Corte de Apelaciones de Puerto Montt",
  "Corte de Apelaciones de Copiapó",
  "Corte de Apelaciones de Arica",
  "Corte de Apelaciones de Iquique",
  "Corte de Apelaciones de Punta Arenas",
  "Corte de Apelaciones de Coyhaique",
  "Corte de Apelaciones de San Miguel",
  "Tribunal Constitucional",
  "Juzgado Civil",
  "Juzgado de Letras",
  "Otro",
] as const;

// ─── Helpers ────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Component ──────────────────────────────────────────────

export default function NuevoAnalisisPage() {
  const router = useRouter();

  // Form state
  const [titulo, setTitulo] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [rol, setRol] = useState("");
  const [fechaFallo, setFechaFallo] = useState("");
  const [partes, setPartes] = useState("");
  const [materia, setMateria] = useState("");
  const [tags, setTags] = useState("");
  const [falloSource, setFalloSource] = useState<"link" | "pdf">("link");
  const [falloUrl, setFalloUrl] = useState("");
  const [falloPdf, setFalloPdf] = useState<File | null>(null);
  const [hechos, setHechos] = useState("");
  const [ratio, setRatio] = useState("");
  const [opinion, setOpinion] = useState("");
  const [resumen, setResumen] = useState("");
  const [showInFeed, setShowInFeed] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // ─── Validation ─────────────────────────────────────────

  function validate(): string[] {
    const errs: string[] = [];
    if (!titulo.trim()) errs.push("El título es requerido.");
    if (!tribunal) errs.push("Selecciona un tribunal.");
    if (!rol.trim()) errs.push("El número de rol es requerido.");
    if (!fechaFallo) errs.push("La fecha del fallo es requerida.");
    if (!partes.trim()) errs.push("Las partes son requeridas.");
    if (!materia) errs.push("Selecciona una materia.");
    if (falloSource === "link" && !falloUrl.trim()) {
      errs.push("Ingresa el link al fallo o sube un PDF.");
    }
    if (falloSource === "pdf" && !falloPdf) {
      errs.push("Sube el PDF del fallo o ingresa un link.");
    }
    if (!hechos.trim()) errs.push("La sección de hechos es requerida.");
    if (wordCount(hechos) > 300)
      errs.push("Los hechos superan el límite de 300 palabras.");
    if (!ratio.trim())
      errs.push("La ratio decidendi es requerida.");
    if (wordCount(ratio) > 500)
      errs.push("La ratio decidendi supera el límite de 500 palabras.");
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
      const body = {
        titulo: titulo.trim(),
        tribunal,
        rol: rol.trim(),
        fechaFallo,
        partes: partes.trim(),
        materia,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        falloUrl: falloSource === "link" ? falloUrl.trim() : undefined,
        hechos: hechos.trim(),
        ratio: ratio.trim(),
        opinion: opinion.trim() || undefined,
        resumen: resumen.trim() || undefined,
        showInFeed,
      };

      const res = await fetch("/api/diario/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
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
        err instanceof Error ? err.message : "Error al publicar el análisis.",
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

  function renderWordCounter(text: string, max: number) {
    const count = wordCount(text);
    const over = count > max;
    return (
      <span
        className={`font-ibm-mono text-[11px] ${
          over ? "text-red-600" : "text-gz-ink-light"
        }`}
      >
        {count}/{max} pal.
      </span>
    );
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gz-cream">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-8">
          <p className="font-ibm-mono uppercase tracking-wider text-[11px] text-gz-ink-light">
            Analisis de Sentencia · Nuevo
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
            {renderLabel("Título del análisis")}
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Nulidad de contrato por error esencial"
              className="w-full font-cormorant text-[22px] leading-tight bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
            />
          </div>

          {/* ═══ SECTION 1: FICHA TÉCNICA ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink mb-6">
              I. Ficha Tecnica del Fallo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Tribunal */}
              <div>
                {renderLabel("Tribunal")}
                <select
                  value={tribunal}
                  onChange={(e) => setTribunal(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-gold transition-colors"
                >
                  <option value="">Seleccionar...</option>
                  {TRIBUNALES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rol */}
              <div>
                {renderLabel("Numero de Rol")}
                <input
                  type="text"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  placeholder="1234-2026"
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
                />
              </div>

              {/* Fecha */}
              <div>
                {renderLabel("Fecha del fallo")}
                <input
                  type="date"
                  value={fechaFallo}
                  onChange={(e) => setFechaFallo(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-gold transition-colors"
                />
              </div>

              {/* Partes */}
              <div>
                {renderLabel("Partes")}
                <input
                  type="text"
                  value={partes}
                  onChange={(e) => setPartes(e.target.value)}
                  placeholder="Pérez con González"
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
                />
              </div>

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

              {/* Tags */}
              <div>
                {renderLabel("Tags (separados por coma)")}
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="nulidad, buena_fe"
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
                />
              </div>
            </div>

            {/* Fallo original */}
            <div className="mt-6">
              {renderLabel("Fallo original")}
              <div className="flex gap-4 mb-3">
                <label className="flex items-center gap-2 font-archivo text-sm text-gz-ink cursor-pointer">
                  <input
                    type="radio"
                    name="falloSource"
                    checked={falloSource === "link"}
                    onChange={() => setFalloSource("link")}
                    className="accent-gz-navy"
                  />
                  Link al Poder Judicial
                </label>
                <label className="flex items-center gap-2 font-archivo text-sm text-gz-ink cursor-pointer">
                  <input
                    type="radio"
                    name="falloSource"
                    checked={falloSource === "pdf"}
                    onChange={() => setFalloSource("pdf")}
                    className="accent-gz-navy"
                  />
                  Subir PDF del fallo
                </label>
              </div>

              {falloSource === "link" ? (
                <input
                  type="url"
                  value={falloUrl}
                  onChange={(e) => setFalloUrl(e.target.value)}
                  placeholder="https://www.pjud.cl/..."
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
                />
              ) : (
                <div>
                  {falloPdf ? (
                    <div className="flex items-center gap-3 bg-white border border-gz-rule rounded-[4px] px-3 py-2.5">
                      <span className="font-archivo text-sm text-gz-ink">
                        {falloPdf.name}
                      </span>
                      <span className="font-ibm-mono text-[11px] text-gz-ink-light">
                        {(falloPdf.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => setFalloPdf(null)}
                        className="ml-auto font-archivo text-sm text-red-600 hover:text-red-800"
                      >
                        x
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="border border-dashed border-gz-rule rounded-[4px] px-4 py-6 text-center bg-white hover:border-gz-gold transition-colors">
                        <p className="font-archivo text-sm text-gz-ink-light">
                          Haz click para seleccionar un PDF
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0] ?? null;
                          setFalloPdf(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ═══ SECTION 2: HECHOS ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink">
                II. Hechos
              </h2>
              {renderWordCounter(hechos, 300)}
            </div>
            <textarea
              value={hechos}
              onChange={(e) => {
                if (e.target.value.length <= 2000) setHechos(e.target.value);
              }}
              maxLength={2000}
              rows={8}
              placeholder="Describe los hechos relevantes del caso..."
              className="w-full font-cormorant text-[16px] leading-relaxed bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y"
            />
          </div>

          {/* ═══ SECTION 3: RATIO DECIDENDI ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink">
                III. Ratio Decidendi
              </h2>
              {renderWordCounter(ratio, 500)}
            </div>
            <textarea
              value={ratio}
              onChange={(e) => {
                if (e.target.value.length <= 3500) setRatio(e.target.value);
              }}
              maxLength={3500}
              rows={10}
              placeholder="Identifica la razón de la decisión del tribunal..."
              className="w-full font-cormorant text-[16px] leading-relaxed bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y"
            />
          </div>

          {/* ═══ SECTION 4: OPINIÓN DEL AUTOR ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink mb-2">
              IV. Opinion del Autor
            </h2>
            <textarea
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              rows={10}
              placeholder="Tu opinión o comentario crítico sobre el fallo (opcional, sin límite)..."
              className="w-full font-cormorant text-[16px] leading-relaxed bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y"
            />
          </div>

          {/* ═══ RESUMEN PARA EL FEED ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink">
                Resumen para el Feed
              </h2>
              {renderWordCounter(resumen, 150)}
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
                {loading ? "Publicando..." : "Publicar Análisis"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
