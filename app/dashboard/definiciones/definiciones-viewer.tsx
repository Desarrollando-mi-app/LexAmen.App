"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  StudySourceSelector,
  type SourceSelection,
} from "@/app/dashboard/components/study-source-selector";
import { playCorrect, playIncorrect, playXpGained, getAnimationsEnabled } from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { RAMA_LABELS } from "@/lib/curriculum-data";
import { ShareSession } from "@/app/components/share-session";
import { FilterBreadcrumb } from "@/app/dashboard/components/filter-breadcrumb";

/* ─── Types ─── */

interface DefinicionItem {
  id: string;
  definicion: string;
  concepto: string;
  options: string[]; // 4 shuffled options
  explicacion: string | null;
  articuloRef: string | null;
  rama: string | null;
  libro: string | null;
  titulo: string | null;
}

interface Props {
  definiciones: DefinicionItem[];
  attemptsToday: number;
  dailyLimit: number;
  isPremium: boolean;
  initialFilters?: {
    rama?: string;
    libro?: string;
    titulo?: string;
  };
}

type FeedbackState = {
  selected: string;
  isCorrect: boolean;
  correctAnswer: string;
  explicacion: string | null;
  xpGained: number;
} | null;

/* ─── Component ─── */

export function DefinicionesViewer({
  definiciones,
  attemptsToday: initialAttempts,
  dailyLimit,
  isPremium,
  initialFilters,
}: Props) {
  // Show source selector unless URL has specific filters
  const [showSelector, setShowSelector] = useState(
    !initialFilters?.rama && !initialFilters?.libro && !initialFilters?.titulo
  );

  const [selectedRama, setSelectedRama] = useState<string>(
    initialFilters?.rama || "ALL"
  );
  const [selectedLibro, setSelectedLibro] = useState<string>(
    initialFilters?.libro || "ALL"
  );
  const [selectedTitulo, setSelectedTitulo] = useState<string>(
    initialFilters?.titulo || "ALL"
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(initialAttempts);
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [shakeSelected, setShakeSelected] = useState<string | null>(null);
  const [scaleCorrectOpt, setScaleCorrectOpt] = useState<string | null>(null);
  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();
  const hasFiltersFromUrl = !!(initialFilters?.rama || initialFilters?.libro || initialFilters?.titulo);

  // Filter definitions by selected rama/libro/titulo
  const filteredDefiniciones = useMemo(() => {
    let defs = definiciones;
    if (selectedRama !== "ALL")
      defs = defs.filter((d) => d.rama === selectedRama);
    if (selectedLibro !== "ALL")
      defs = defs.filter((d) => d.libro === selectedLibro);
    if (selectedTitulo !== "ALL")
      defs = defs.filter((d) => d.titulo === selectedTitulo);
    return defs;
  }, [definiciones, selectedRama, selectedLibro, selectedTitulo]);

  // Shuffle order for variety
  const shuffledIndices = useMemo(() => {
    const indices = filteredDefiniciones.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [filteredDefiniciones]);

  const current = filteredDefiniciones[shuffledIndices[currentIndex]];
  const isLimitReached = !isPremium && attempts >= dailyLimit;
  const hasMore = currentIndex < shuffledIndices.length - 1;

  function resetState() {
    setCurrentIndex(0);
    setFeedback(null);
    setScore({ correct: 0, incorrect: 0 });
    setStartTime(Date.now());
  }

  const handleSelect = useCallback(
    async (selectedOption: string) => {
      if (feedback || loading || !current) return;
      setLoading(true);

      const tiempoMs = Date.now() - startTime;

      try {
        const res = await fetch("/api/definiciones/responder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            definicionId: current.id,
            respuesta: selectedOption,
            tiempoMs,
          }),
        });

        const data = await res.json();

        if (res.status === 403 && data.limit) {
          setFeedback({
            selected: selectedOption,
            isCorrect: false,
            correctAnswer: current.concepto,
            explicacion: null,
            xpGained: 0,
          });
          setAttempts(data.attemptsToday);
          setLoading(false);
          return;
        }

        setFeedback({
          selected: selectedOption,
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          explicacion: data.explicacion,
          xpGained: data.xpGained,
        });
        setAttempts(data.attemptsToday);
        setScore((prev) => ({
          correct: prev.correct + (data.isCorrect ? 1 : 0),
          incorrect: prev.incorrect + (data.isCorrect ? 0 : 1),
        }));

        // Sound & animation effects
        if (data.isCorrect) {
          playCorrect();
          if (getAnimationsEnabled()) setScaleCorrectOpt(data.correctAnswer);
          if (data.xpGained > 0) {
            setTimeout(() => {
              playXpGained();
              showXpFloat(data.xpGained);
            }, 300);
          }
        } else {
          playIncorrect();
          if (getAnimationsEnabled()) {
            setShakeSelected(selectedOption);
            setTimeout(() => setShakeSelected(null), 500);
          }
        }

        // Show badge modal if new badges earned
        if (data.newBadges?.length > 0) {
          setTimeout(() => {
            for (const badge of data.newBadges) {
              showBadgeModal(badge);
            }
          }, 1500);
        }
      } catch {
        // Network error — allow retry
      } finally {
        setLoading(false);
      }
    },
    [feedback, loading, current, startTime, showBadgeModal]
  );

  const handleNext = useCallback(() => {
    setFeedback(null);
    setScaleCorrectOpt(null);
    setShakeSelected(null);
    setCurrentIndex((prev) => prev + 1);
    setStartTime(Date.now());
  }, []);

  /* ─── Source selector ─── */
  if (showSelector) {
    return (
      <StudySourceSelector
        items={definiciones}
        contentType="definiciones"
        onStart={(sel: SourceSelection) => {
          setSelectedRama(sel.rama);
          setSelectedLibro(sel.libro);
          setSelectedTitulo(sel.titulo);
          resetState();
          setShowSelector(false);
        }}
        onStudyAll={() => {
          setSelectedRama("ALL");
          setSelectedLibro("ALL");
          setSelectedTitulo("ALL");
          resetState();
          setShowSelector(false);
        }}
      />
    );
  }

  /* ─── Empty state ─── */
  if (filteredDefiniciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">📭</span>
        <h2 className="font-cormorant text-2xl font-bold text-gz-ink mb-2">
          No hay definiciones disponibles
        </h2>
        <p className="text-sm text-gz-ink-mid max-w-sm">
          No se encontraron definiciones para esta selecci&oacute;n.
          Prueba con otra materia o estudia todo el contenido.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setShowSelector(true)}
            className="rounded-sm border border-gz-rule px-5 py-2 font-archivo text-sm text-gz-ink-mid hover:bg-gz-cream-dark transition-colors"
          >
            Cambiar selecci&oacute;n
          </button>
          <Link
            href="/dashboard/indice-maestro"
            className="rounded-sm border border-gz-rule px-5 py-2 font-archivo text-sm text-gz-ink-mid hover:bg-gz-cream-dark transition-colors"
          >
            Volver al Indice
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Limit reached ─── */
  if (isLimitReached && !feedback) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">🔒</span>
        <h2 className="font-cormorant text-2xl font-bold text-gz-ink mb-2">
          L&iacute;mite diario alcanzado
        </h2>
        <p className="text-sm text-gz-ink-mid max-w-sm">
          Has completado {dailyLimit} definiciones hoy.
          Actualiza a Premium para practicar sin l&iacute;mites.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard/indice-maestro"
            className="rounded-sm border border-gz-rule px-5 py-2 font-archivo text-sm text-gz-ink-mid hover:bg-gz-cream-dark transition-colors"
          >
            Volver al Indice
          </Link>
          <Link
            href="/dashboard/perfil"
            className="rounded-sm bg-gz-gold px-5 py-2 font-archivo text-sm font-semibold text-white hover:bg-gz-gold-bright transition-colors"
          >
            Ver Premium
          </Link>
        </div>
      </div>
    );
  }

  /* ─── Finished all ─── */
  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">🎉</span>
        <h2 className="font-cormorant text-2xl font-bold text-gz-ink mb-2">
          &iexcl;Completaste todas las definiciones!
        </h2>
        <p className="text-sm text-gz-ink-mid">
          Correctas: {score.correct} &middot; Incorrectas: {score.incorrect}
        </p>
        <ShareSession
          modulo="Definiciones"
          materia={RAMA_LABELS[selectedRama] ?? undefined}
          total={score.correct + score.incorrect}
          correctas={score.correct}
          xp={0}
        />
        <Link
          href="/dashboard/indice-maestro"
          className="mt-6 inline-block rounded-sm border border-gz-rule px-5 py-2 font-archivo text-sm text-gz-ink-mid hover:bg-gz-cream-dark transition-colors"
        >
          Volver al Indice
        </Link>
      </div>
    );
  }

  const totalAnswered = score.correct + score.incorrect;
  const progressPercent =
    filteredDefiniciones.length > 0
      ? Math.round((totalAnswered / filteredDefiniciones.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {hasFiltersFromUrl && <FilterBreadcrumb rama={initialFilters?.rama} libro={initialFilters?.libro} titulo={initialFilters?.titulo} />}

      {/* Progress bar + score */}
      <div className="flex items-center justify-between text-xs text-gz-ink-mid font-ibm-mono">
        <span>
          {totalAnswered}/{filteredDefiniciones.length}
        </span>
        <span>
          {score.correct} ✓ &middot; {score.incorrect} ✗
        </span>
        {!isPremium && (
          <span>
            {attempts}/{dailyLimit} hoy
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gz-rule/30">
        <div
          className="h-1.5 rounded-full bg-gz-gold transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Definition card */}
      <div className="rounded-sm border border-gz-rule bg-white/60 p-6 sm:p-8">
        {/* Definition text */}
        <div className="border-l-[3px] border-gz-gold pl-5 mb-6">
          <p className="font-cormorant text-xl sm:text-2xl italic text-gz-ink leading-relaxed">
            &ldquo;{current.definicion}&rdquo;
          </p>
          {current.articuloRef && (
            <p className="mt-2 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
              {current.articuloRef}
            </p>
          )}
        </div>

        {/* Question */}
        <p className="font-archivo text-sm font-semibold text-gz-ink-mid mb-4 uppercase tracking-[1px]">
          &iquest;Qu&eacute; concepto define esto?
        </p>

        {/* Options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.options.map((option, i) => {
            const letter = String.fromCharCode(65 + i); // A, B, C, D
            let btnClass =
              "border border-gz-rule bg-white hover:border-gz-gold hover:bg-gz-gold/5 cursor-pointer";

            if (feedback) {
              if (option === feedback.correctAnswer) {
                btnClass =
                  "border-2 border-gz-sage bg-gz-sage/10 text-gz-sage";
              } else if (
                option === feedback.selected &&
                !feedback.isCorrect
              ) {
                btnClass =
                  "border-2 border-gz-burgundy bg-gz-burgundy/10 text-gz-burgundy";
              } else {
                btnClass =
                  "border border-gz-rule/40 bg-white/40 opacity-50 cursor-default";
              }
            }

            return (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                disabled={!!feedback || loading}
                className={`
                  flex items-start gap-3 rounded-sm px-4 py-3.5 text-left
                  transition-all duration-200
                  ${btnClass}
                  ${loading ? "opacity-60 cursor-wait" : ""}
                  ${scaleCorrectOpt === option ? "animate-scale-correct" : ""}
                  ${shakeSelected === option ? "animate-shake" : ""}
                `}
              >
                <span className="font-ibm-mono text-xs font-medium text-gz-ink-light mt-0.5 shrink-0">
                  {letter}.
                </span>
                <span className="font-archivo text-sm text-gz-ink leading-snug">
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-6 rounded-sm border p-4 ${
              feedback.isCorrect
                ? "border-gz-sage/40 bg-gz-sage/5"
                : "border-gz-burgundy/40 bg-gz-burgundy/5"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">
                {feedback.isCorrect ? "✅" : "❌"}
              </span>
              <span
                className={`font-archivo text-sm font-semibold ${
                  feedback.isCorrect ? "text-gz-sage" : "text-gz-burgundy"
                }`}
              >
                {feedback.isCorrect ? "¡Correcto!" : "Incorrecto"}
              </span>
              {feedback.xpGained > 0 && (
                <span className="ml-auto font-ibm-mono text-xs text-gz-gold font-medium">
                  +{feedback.xpGained} XP
                </span>
              )}
            </div>

            {!feedback.isCorrect && (
              <p className="text-sm text-gz-ink-mid mt-1">
                La respuesta correcta es:{" "}
                <strong className="text-gz-ink">{feedback.correctAnswer}</strong>
              </p>
            )}

            {feedback.explicacion && (
              <p className="text-sm text-gz-ink-mid mt-2 italic">
                {feedback.explicacion}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Next button */}
      {feedback && (
        <div className="flex justify-end">
          {hasMore && !isLimitReached ? (
            <button
              onClick={handleNext}
              className="font-archivo text-sm font-semibold text-gz-gold hover:text-gz-gold-bright transition-colors"
            >
              Siguiente definici&oacute;n &rarr;
            </button>
          ) : (
            <Link
              href="/dashboard/indice-maestro"
              className="font-archivo text-sm text-gz-ink-mid hover:text-gz-ink transition-colors"
            >
              Volver al Indice
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
