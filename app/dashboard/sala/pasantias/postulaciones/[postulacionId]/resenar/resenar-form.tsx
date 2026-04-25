"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
  postulacionId: string;
  authorDisplaySugerido: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "Mala experiencia",
  2: "Por debajo de lo esperado",
  3: "Aceptable",
  4: "Buena experiencia",
  5: "Excelente",
};

/**
 * Form de reseña post-pasantía. Envía a POST /review.
 *
 * Componentes:
 *  - Selector de rating: 5 estrellas con hover preview, accesible vía
 *    teclado (radiogroup + flechas).
 *  - Toggle de anonimato: si está ON, el comentario se firma con el
 *    authorDisplay (sugerido o personalizado), no con el nombre real.
 *  - Comentario: cormorant 16px, contador 3000 chars.
 *  - authorDisplay: visible sólo cuando está anónimo. Pre-llenado con
 *    "Estudiante · UDP · 2026" o equivalente, editable.
 */
export function ResenarForm({ postulacionId, authorDisplaySugerido }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [authorDisplay, setAuthorDisplay] = useState(authorDisplaySugerido);
  const [error, setError] = useState<string | null>(null);

  const MAX_COMMENT = 3000;
  const MAX_AUTHOR = 120;
  const restantes = MAX_COMMENT - comment.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError("Selecciona una calificación de 1 a 5 estrellas.");
      return;
    }
    if (comment.length > MAX_COMMENT) {
      setError(`El comentario supera los ${MAX_COMMENT} caracteres.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/sala/pasantias/postulaciones/${postulacionId}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating,
            comment: comment.trim() || undefined,
            isAnonymous,
            authorDisplay: isAnonymous
              ? authorDisplay.trim() || authorDisplaySugerido
              : undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "No pudimos publicar la reseña.");
        setSubmitting(false);
        return;
      }
      startTransition(() => {
        router.push(
          `/dashboard/sala/pasantias/gestion?tab=enviadas&resenaPublicada=1`,
        );
        router.refresh();
      });
    } catch {
      setError("Error de red. Intenta nuevamente.");
      setSubmitting(false);
    }
  }

  const disabled = submitting || isPending;
  const ratingShown = hover || rating;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gz-rule p-7 flex flex-col gap-6"
      aria-busy={disabled}
    >
      {/* Rating */}
      <fieldset className="flex flex-col gap-2 border-0 p-0 m-0">
        <legend className="font-ibm-mono text-[10.5px] tracking-[1.6px] uppercase text-gz-ink-mid p-0 mb-1">
          Tu calificación
        </legend>
        <div
          role="radiogroup"
          aria-label="Calificación de 1 a 5 estrellas"
          className="flex items-center gap-2"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= ratingShown;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} de 5 — ${RATING_LABELS[n]}`}
                disabled={disabled}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onClick={() => setRating(n)}
                className={`text-[36px] leading-none font-cormorant transition-colors ${
                  filled ? "text-gz-gold" : "text-gz-ink-light/35"
                } hover:text-gz-gold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gz-gold focus-visible:ring-offset-1`}
              >
                {filled ? "★" : "☆"}
              </button>
            );
          })}
          <span className="ml-2 font-cormorant italic text-[15px] text-gz-ink-mid">
            {ratingShown ? RATING_LABELS[ratingShown] : "Selecciona una calificación"}
          </span>
        </div>
      </fieldset>

      {/* Comentario */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="comment"
          className="font-ibm-mono text-[10.5px] tracking-[1.6px] uppercase text-gz-ink-mid"
        >
          Tu reseña{" "}
          <span className="text-gz-ink-light normal-case tracking-normal">
            (recomendado)
          </span>
        </label>
        <textarea
          id="comment"
          rows={9}
          placeholder="¿Qué aprendiste? ¿Cómo fue el trato, la carga, la mentoría? ¿Recomendarías la pasantía a un compañero? Sé concreto: los detalles ayudan más que los adjetivos."
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          disabled={disabled}
          maxLength={MAX_COMMENT}
          className="px-3.5 py-3 border border-gz-rule rounded-[3px] bg-gz-cream/40 font-cormorant text-[16px] leading-[1.55] text-gz-ink placeholder:text-gz-ink-light/70 placeholder:italic placeholder:font-cormorant focus:outline-none focus:border-gz-gold focus:bg-white transition-colors resize-y min-h-[160px]"
        />
        <span
          className={`font-ibm-mono text-[10px] tracking-[1.2px] uppercase self-end ${
            restantes < 200 ? "text-gz-burgundy" : "text-gz-ink-light"
          }`}
        >
          {restantes} restantes
        </span>
      </div>

      {/* Anonimato */}
      <div className="border-t border-gz-rule pt-5 flex flex-col gap-3">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            disabled={disabled}
            className="mt-1 w-4 h-4 accent-gz-gold cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex-1">
            <div className="font-cormorant font-semibold text-[17px] text-gz-ink leading-tight">
              Publicar de forma anónima
            </div>
            <div className="font-archivo text-[12.5px] text-gz-ink-mid leading-[1.5] mt-0.5">
              Tu nombre real queda oculto. La reseña se firma con la etiqueta
              que escribas abajo (por defecto sugerimos algo basado en tu
              etapa y universidad). El estudio igualmente conoce quién hizo
              la pasantía a través del registro de la postulación.
            </div>
          </div>
        </label>

        {isAnonymous && (
          <div className="flex flex-col gap-2 pl-7">
            <label
              htmlFor="authorDisplay"
              className="font-ibm-mono text-[10.5px] tracking-[1.6px] uppercase text-gz-ink-mid"
            >
              Etiqueta visible
            </label>
            <input
              id="authorDisplay"
              type="text"
              placeholder={authorDisplaySugerido}
              value={authorDisplay}
              onChange={(e) => setAuthorDisplay(e.target.value.slice(0, MAX_AUTHOR))}
              disabled={disabled}
              maxLength={MAX_AUTHOR}
              className="px-3.5 py-3 border border-gz-rule rounded-[3px] bg-gz-cream/40 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/70 focus:outline-none focus:border-gz-gold focus:bg-white transition-colors"
            />
            <span className="font-archivo text-[11.5px] text-gz-ink-light italic leading-[1.5]">
              Aparecerá como «— {authorDisplay.trim() || authorDisplaySugerido}» al pie de tu reseña.
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="border-l-[3px] border-gz-burgundy bg-gz-burgundy/5 px-4 py-3 font-archivo text-[13.5px] text-gz-burgundy leading-[1.5]"
        >
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2.5 items-center pt-2 border-t border-gz-rule">
        <button
          type="submit"
          disabled={disabled || rating < 1}
          className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? "Publicando…" : "Publicar reseña →"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={disabled}
          className="px-5 py-3 border border-gz-rule text-gz-ink-mid font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:border-gz-ink hover:text-gz-ink transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <span className="ml-auto font-archivo text-[11px] text-gz-ink-light italic">
          Una vez publicada, no podrás editarla.
        </span>
      </div>
    </form>
  );
}
