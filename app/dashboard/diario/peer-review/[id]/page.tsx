"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────

interface ReviewData {
  id: string;
  publicacionId: string;
  publicacionTipo: "analisis" | "ensayo";
  autorId: string;
  reviewerId: string;
  estado: string;
  claridadScore: number | null;
  rigorScore: number | null;
  originalidadScore: number | null;
  comentarioGeneral: string | null;
  sugerencias: string | null;
  createdAt: string;
  completedAt: string | null;
  reviewer: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    universidad: string | null;
  };
  autor: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    universidad: string | null;
  } | null;
  publicacion: {
    id: string;
    titulo: string;
    materia: string;
    hechos?: string;
    ratioDecidendi?: string;
    opinion?: string;
    resumen?: string;
    tribunal?: string;
    numeroRol?: string;
    partes?: string;
    archivoUrl?: string;
    archivoNombre?: string;
    tipo?: string;
  } | null;
}

// ─── Star Rating Component ──────────────────────────────────

function StarRating({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="mb-6">
      <label className="block font-ibm-mono uppercase tracking-wider text-[11px] text-gz-ink-light mb-1">
        {label}
      </label>
      <p className="font-archivo text-[12px] text-gz-ink-light italic mb-2">
        {hint}
      </p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill={star <= (hover || value) ? "#c9a84c" : "none"}
              stroke={star <= (hover || value) ? "#c9a84c" : "#bbb"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
        <span className="ml-2 font-ibm-mono text-[12px] text-gz-ink-mid">
          {value > 0 ? `${value}/5` : "--"}
        </span>
      </div>
    </div>
  );
}

// ─── Content Section (read-only) ────────────────────────────

function ContentSection({
  number,
  title,
  content,
}: {
  number: string;
  title: string;
  content: string;
}) {
  return (
    <section className="mb-8">
      <h3 className="mb-3 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-burgundy font-medium">
        {number}. {title}
      </h3>
      <div
        className="font-cormorant text-[16px] leading-[1.8] text-gz-ink"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {content}
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────

export default function PeerReviewPage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = params.id as string;

  // Data
  const [review, setReview] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [claridad, setClaridad] = useState(0);
  const [rigor, setRigor] = useState(0);
  const [originalidad, setOriginalidad] = useState(0);
  const [comentario, setComentario] = useState("");
  const [sugerencias, setSugerencias] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ─── Fetch review data ────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/diario/peer-review/${reviewId}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Error al cargar el review");
        }
        const data = await res.json();
        setReview(data.review);

        // If already completed, pre-fill
        if (data.review.estado === "completado") {
          setClaridad(data.review.claridadScore ?? 0);
          setRigor(data.review.rigorScore ?? 0);
          setOriginalidad(data.review.originalidadScore ?? 0);
          setComentario(data.review.comentarioGeneral ?? "");
          setSugerencias(data.review.sugerencias ?? "");
          setSubmitted(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reviewId]);

  // ─── Submit review ────────────────────────────────────────

  async function handleSubmit() {
    setSubmitError(null);

    if (claridad === 0 || rigor === 0 || originalidad === 0) {
      setSubmitError("Debes asignar las 3 puntuaciones.");
      return;
    }
    if (!comentario.trim()) {
      setSubmitError("El comentario general es requerido.");
      return;
    }
    if (comentario.length > 1000) {
      setSubmitError("El comentario no puede exceder 1000 caracteres.");
      return;
    }
    if (sugerencias.length > 1000) {
      setSubmitError("Las sugerencias no pueden exceder 1000 caracteres.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/diario/peer-review/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          claridadScore: claridad,
          rigorScore: rigor,
          originalidadScore: originalidad,
          comentarioGeneral: comentario.trim(),
          sugerencias: sugerencias.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Error al enviar el review");
      }

      await res.json();
      setSubmitted(true);
      setReview((prev) =>
        prev ? { ...prev, estado: "completado" } : prev
      );
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Error al enviar."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Loading / Error ──────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gz-cream">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-gz-cream-dark" />
            <div className="h-[2px] bg-gz-rule" />
            <div className="h-40 animate-pulse rounded bg-gz-cream-dark" />
            <div className="h-40 animate-pulse rounded bg-gz-cream-dark" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-gz-cream">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="rounded-[4px] border border-red-300 bg-red-50 p-6 text-center">
            <p className="font-archivo text-sm text-red-700">
              {error || "Review no encontrado"}
            </p>
            <Link
              href="/dashboard/diario/peer-review/mis-pendientes"
              className="mt-4 inline-block font-archivo text-sm text-gz-gold hover:underline"
            >
              Volver a mis pendientes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pub = review.publicacion;
  const isAnalisis = review.publicacionTipo === "analisis";

  return (
    <div className="min-h-screen bg-gz-cream">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link
          href="/dashboard/diario/peer-review/mis-pendientes"
          className="mb-6 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink transition-colors"
        >
          &larr; Mis reviews pendientes
        </Link>

        {/* ═══ HEADER ═══ */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-burgundy font-medium">
              Peer Review
            </p>
            <span
              className={`rounded-full px-3 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] ${
                review.estado === "completado"
                  ? "bg-green-100 text-green-700"
                  : "bg-gz-gold/15 text-gz-gold"
              }`}
            >
              {review.estado === "completado" ? "Completado" : "Pendiente"}
            </span>
            <span className="rounded-full bg-gz-navy/15 px-3 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-navy">
              {isAnalisis ? "Analisis" : "Ensayo"}
            </span>
          </div>
          <div className="border-t-2 border-gz-rule mt-2" />
        </header>

        {/* ═══ PUBLICATION CONTENT (READ-ONLY) ═══ */}
        {pub && (
          <div className="mb-10">
            <h1 className="mb-5 font-cormorant text-[28px] font-bold leading-tight text-gz-ink">
              {pub.titulo}
            </h1>

            {/* Author info */}
            {review.autor && (
              <div className="flex items-center gap-3 mb-6">
                {review.autor.avatarUrl ? (
                  <img
                    src={review.autor.avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
                    {review.autor.firstName[0]}
                    {review.autor.lastName[0]}
                  </div>
                )}
                <div>
                  <p className="font-archivo text-[13px] font-semibold text-gz-ink">
                    {review.autor.firstName} {review.autor.lastName}
                  </p>
                  {review.autor.universidad && (
                    <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                      {review.autor.universidad}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ficha Tecnica for Analisis */}
            {isAnalisis && pub.tribunal && (
              <div className="mb-8 rounded-[4px] border border-gz-rule bg-gz-cream-dark/30 p-5">
                <h3 className="mb-3 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-mid font-medium">
                  Ficha Tecnica
                </h3>
                <div className="grid grid-cols-2 gap-3 font-archivo text-[13px]">
                  <div>
                    <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                      Tribunal
                    </span>
                    <p className="text-gz-ink">{pub.tribunal}</p>
                  </div>
                  <div>
                    <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                      Rol
                    </span>
                    <p className="text-gz-ink">{pub.numeroRol}</p>
                  </div>
                  <div>
                    <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                      Partes
                    </span>
                    <p className="text-gz-ink">{pub.partes}</p>
                  </div>
                  <div>
                    <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                      Materia
                    </span>
                    <p className="text-gz-ink">{pub.materia}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumen */}
            {pub.resumen && (
              <div className="mb-8 border-l-[3px] border-gz-gold pl-5">
                <p className="font-cormorant text-[17px] italic leading-[1.8] text-gz-ink-mid">
                  {pub.resumen}
                </p>
              </div>
            )}

            {/* Analisis sections */}
            {isAnalisis && (
              <>
                {pub.hechos && (
                  <ContentSection number="I" title="Hechos Relevantes" content={pub.hechos} />
                )}
                {pub.ratioDecidendi && (
                  <ContentSection number="II" title="Ratio Decidendi" content={pub.ratioDecidendi} />
                )}
                {pub.opinion && (
                  <ContentSection number="III" title="Opinion del Autor" content={pub.opinion} />
                )}
              </>
            )}

            {/* Ensayo file link */}
            {!isAnalisis && pub.archivoUrl && (
              <div className="mb-8 rounded-[4px] border border-gz-rule bg-white p-5">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
                  Archivo del Ensayo
                </p>
                <a
                  href={pub.archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-archivo text-[14px] font-medium text-gz-gold hover:underline"
                >
                  {pub.archivoNombre || "Descargar ensayo"} &rarr;
                </a>
                {pub.tipo && (
                  <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
                    Tipo: {pub.tipo}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ DIVIDER ═══ */}
        <div className="h-[3px] bg-gz-rule-dark mb-8" />

        {/* ═══ EVALUATION FORM ═══ */}
        <div className="mb-8">
          <h2 className="font-cormorant text-[24px] font-bold text-gz-ink mb-1">
            {submitted ? "Tu evaluacion" : "Evaluar publicacion"}
          </h2>
          <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-6">
            {submitted
              ? "Review completado"
              : "Puntua cada criterio de 1 a 5 estrellas"}
          </p>

          {/* Scores */}
          <div className="rounded-[4px] border border-gz-rule bg-white p-6">
            <StarRating
              label="Claridad"
              value={claridad}
              onChange={submitted ? () => {} : setClaridad}
              hint="Redaccion clara, estructura logica, facil de seguir"
            />

            <StarRating
              label="Rigor Juridico"
              value={rigor}
              onChange={submitted ? () => {} : setRigor}
              hint="Precision tecnica, correcta aplicacion de normas y doctrina"
            />

            <StarRating
              label="Originalidad"
              value={originalidad}
              onChange={submitted ? () => {} : setOriginalidad}
              hint="Aporte original, perspectiva novedosa, valor academico"
            />

            {/* Comentario General */}
            <div className="mb-6">
              <label className="block font-ibm-mono uppercase tracking-wider text-[11px] text-gz-ink-light mb-1.5">
                Comentario General
              </label>
              <p className="font-archivo text-[12px] text-gz-ink-light italic mb-2">
                Tu evaluacion critica y constructiva de la publicacion
              </p>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                disabled={submitted}
                maxLength={1000}
                rows={5}
                placeholder="Escribe tu comentario sobre la publicacion..."
                className="w-full font-cormorant text-[15px] leading-relaxed bg-gz-cream border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y disabled:opacity-70 disabled:cursor-not-allowed"
              />
              <div className="mt-1 text-right">
                <span
                  className={`font-ibm-mono text-[10px] ${
                    comentario.length > 900
                      ? "text-red-500"
                      : "text-gz-ink-light"
                  }`}
                >
                  {comentario.length}/1000
                </span>
              </div>
            </div>

            {/* Sugerencias */}
            <div className="mb-6">
              <label className="block font-ibm-mono uppercase tracking-wider text-[11px] text-gz-ink-light mb-1.5">
                Sugerencias (opcional)
              </label>
              <p className="font-archivo text-[12px] text-gz-ink-light italic mb-2">
                Recomendaciones especificas para mejorar la publicacion
              </p>
              <textarea
                value={sugerencias}
                onChange={(e) => setSugerencias(e.target.value)}
                disabled={submitted}
                maxLength={1000}
                rows={4}
                placeholder="Sugerencias para el autor..."
                className="w-full font-cormorant text-[15px] leading-relaxed bg-gz-cream border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y disabled:opacity-70 disabled:cursor-not-allowed"
              />
              <div className="mt-1 text-right">
                <span
                  className={`font-ibm-mono text-[10px] ${
                    sugerencias.length > 900
                      ? "text-red-500"
                      : "text-gz-ink-light"
                  }`}
                >
                  {sugerencias.length}/1000
                </span>
              </div>
            </div>

            {/* Error */}
            {submitError && (
              <div className="mb-4 rounded-[4px] border border-red-300 bg-red-50 px-4 py-3">
                <p className="font-archivo text-[13px] text-red-700">
                  {submitError}
                </p>
              </div>
            )}

            {/* Submit / Success */}
            {submitted ? (
              <div className="rounded-[4px] border border-green-300 bg-green-50 px-4 py-4 text-center">
                <p className="font-archivo text-[14px] font-semibold text-green-700 mb-1">
                  Review completado exitosamente
                </p>
                <p className="font-ibm-mono text-[11px] text-green-600">
                  +5 XP ganados
                </p>
                <Link
                  href="/dashboard/diario/peer-review/mis-pendientes"
                  className="mt-3 inline-block font-archivo text-[13px] font-semibold text-gz-gold hover:underline"
                >
                  Ver mis reviews pendientes &rarr;
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 font-archivo text-sm border border-gz-rule text-gz-ink-light rounded-[4px] hover:border-gz-gold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 font-archivo text-sm bg-gz-navy text-white rounded-[4px] hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Enviando..." : "Enviar evaluacion"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
