"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDateShort } from "@/lib/pasantias-helpers";

export interface ReviewCardData {
  id: string;
  rating: number;
  comment: string | null;
  authorDisplay: string | null;
  isAnonymous: boolean;
  createdAt: string;
  reported: boolean;
  estudioResponse: string | null;
  estudioRespondedAt: string | null;
  /** Sólo presente cuando NO es anónima — para mostrar el nombre real. */
  authorName?: string | null;
  /** Para deduplicar el botón "Reportar" cuando el viewer es el autor. */
  isOwn?: boolean;
}

interface Props {
  review: ReviewCardData;
  /** Etiqueta opcional para mostrar contexto (ej: "Pasantía: Civil II 2025"). */
  contexto?: string;
}

/**
 * Tarjeta editorial de reseña, reusable en /oferta/[id] y /estudio/[slug].
 *
 * - Rating en cormorant gold + estado dorado.
 * - Texto en cormorant 16px italic, con drop-quote tipográfico.
 * - Firma según anonimato o nombre real.
 * - Respuesta del estudio (si existe) en bloque cream con border-l gold,
 *   anidado debajo de la reseña.
 * - Botón discreto "Reportar" que abre un dialog inline para indicar
 *   motivo y POSTea a /reviews/[id]/reportar.
 */
export function ReviewCard({ review, contexto }: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportedLocal, setReportedLocal] = useState(review.reported);

  const display = review.isAnonymous
    ? review.authorDisplay ?? "Reseña anónima"
    : review.authorName ?? review.authorDisplay ?? "Anónimo";

  async function reportar() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/sala/pasantias/reviews/${review.id}/reportar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || undefined }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "No pudimos enviar el reporte");
      } else {
        toast.success("Reseña reportada", {
          description: "Un administrador revisará el contenido.",
        });
        setReportedLocal(true);
        setReportOpen(false);
        setReason("");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="bg-white border border-gz-rule p-5">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <span
          className="font-cormorant font-semibold text-[20px] text-gz-gold tracking-[1px]"
          aria-label={`${review.rating} de 5 estrellas`}
        >
          {"★".repeat(review.rating)}
          <span className="text-gz-ink-light/40">
            {"☆".repeat(5 - review.rating)}
          </span>
        </span>
        <span className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-light">
          {formatDateShort(review.createdAt)}
        </span>
      </header>

      {contexto && (
        <p className="mt-1 font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-mid">
          {contexto}
        </p>
      )}

      <p className="mt-3 font-cormorant italic text-[16px] text-gz-ink leading-[1.55] m-0">
        {review.comment ? (
          <>
            <span className="font-cormorant not-italic text-gz-gold text-[26px] leading-[0] align-[-0.15em] mr-0.5">
              “
            </span>
            {review.comment}
            <span className="font-cormorant not-italic text-gz-gold text-[26px] leading-[0] align-[-0.35em] ml-0.5">
              ”
            </span>
          </>
        ) : (
          <span className="text-gz-ink-mid">Sin comentario adicional.</span>
        )}
      </p>

      <p className="mt-2 font-archivo text-[12px] text-gz-ink-light italic">
        — {display}
      </p>

      {/* Respuesta del estudio */}
      {review.estudioResponse && (
        <div className="mt-4 border-l-[3px] border-gz-gold pl-4 py-2 bg-gz-cream/40">
          <div className="font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase text-gz-gold mb-1">
            Respuesta del estudio
            {review.estudioRespondedAt && (
              <span className="text-gz-ink-light ml-1.5">
                · {formatDateShort(review.estudioRespondedAt)}
              </span>
            )}
          </div>
          <p className="font-cormorant text-[15px] text-gz-ink-mid leading-[1.55] m-0 whitespace-pre-wrap">
            {review.estudioResponse}
          </p>
        </div>
      )}

      {/* Footer: reportar */}
      <footer className="mt-4 flex items-center justify-end gap-3">
        {reportedLocal ? (
          <span className="font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase text-gz-burgundy/80">
            · Reportada
          </span>
        ) : !review.isOwn && !reportOpen ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer"
          >
            Reportar
          </button>
        ) : null}
      </footer>

      {/* Dialog inline de reporte */}
      {reportOpen && !reportedLocal && (
        <div className="mt-3 border-t border-gz-rule pt-4 flex flex-col gap-2">
          <label
            htmlFor={`reason-${review.id}`}
            className="font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase text-gz-ink-mid"
          >
            Motivo del reporte (opcional)
          </label>
          <textarea
            id={`reason-${review.id}`}
            rows={3}
            placeholder="Insultos, datos personales, contenido falso evidente, etc."
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            disabled={busy}
            maxLength={500}
            className="px-3 py-2 border border-gz-rule rounded-[3px] bg-gz-cream/40 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/70 focus:outline-none focus:border-gz-burgundy focus:bg-white transition-colors resize-y"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setReportOpen(false);
                setReason("");
              }}
              disabled={busy}
              className="px-3 py-1.5 border border-gz-rule text-gz-ink-mid font-ibm-mono text-[10px] tracking-[1.4px] uppercase hover:border-gz-ink hover:text-gz-ink transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={reportar}
              disabled={busy}
              className="px-3 py-1.5 bg-gz-burgundy text-gz-cream font-ibm-mono text-[10px] tracking-[1.4px] uppercase hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? "Enviando…" : "Enviar reporte"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/**
 * Helper visual: bloque resumen con promedio + total. Para listings.
 */
export function ReviewSummary({
  count,
  avg,
}: {
  count: number;
  avg: number | null;
}) {
  if (count === 0) return null;
  const stars = avg ? Math.round(avg) : 0;
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span
        className="font-cormorant font-semibold text-[28px] text-gz-gold tracking-[1px] leading-none"
        aria-label={`${avg?.toFixed(1) ?? "—"} de 5 estrellas en promedio`}
      >
        {"★".repeat(stars)}
        <span className="text-gz-ink-light/35">
          {"☆".repeat(5 - stars)}
        </span>
      </span>
      <span className="font-cormorant font-semibold text-[24px] text-gz-ink leading-none">
        {avg ? avg.toFixed(1) : "—"}
      </span>
      <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
        {count} reseña{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}
