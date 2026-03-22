"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ReportButton } from "@/app/components/report-button";
import { RAMA_LABELS, TITULO_LABELS } from "@/lib/curriculum-data";
import {
  playCorrect,
  playIncorrect,
  playXpGained,
  getAnimationsEnabled,
} from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { Confetti } from "@/app/dashboard/components/confetti";

// ---- Tipos ----

interface Segmento {
  id: number;
  texto: string;
}

interface SegmentoFull {
  id: number;
  texto: string;
  esError: boolean;
  textoCorrecto?: string;
  explicacion?: string;
}

interface ErrorIdItem {
  id: string;
  segmentos: string; // JSON string of [{ id, texto }]
  totalErrores: number;
  rama: string;
  libro: string | null;
  titulo: string | null;
  materia: string | null;
  dificultad: number;
}

interface ErrorIdViewerProps {
  items: ErrorIdItem[];
  attemptsToday: number;
  dailyLimit: number;
  isPremium: boolean;
  initialFilters?: { rama?: string; libro?: string; titulo?: string };
}

interface Feedback {
  segmentos: SegmentoFull[];
  aciertos: number;
  fallosPositivos: number;
  totalErrores: number;
  explicacionGeneral: string | null;
  xpGained: number;
}

const DIFICULTAD_MAP: Record<number, string> = {
  1: "Basico",
  2: "Intermedio",
  3: "Avanzado",
};

// ---- Componente principal ----

export function ErrorIdViewer({
  items,
  attemptsToday,
  dailyLimit,
  isPremium,
  initialFilters,
}: ErrorIdViewerProps) {
  const router = useRouter();
  const pathname = usePathname();

  // ---- Filtros ----
  const [selectedRama, setSelectedRama] = useState<string>(
    initialFilters?.rama || "ALL"
  );

  function updateUrl(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && v !== "ALL") sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const availableRamas = useMemo(
    () => Array.from(new Set(items.map((i) => i.rama))),
    [items]
  );

  const filteredItems = useMemo(() => {
    let pool = [...items];
    if (selectedRama !== "ALL")
      pool = pool.filter((i) => i.rama === selectedRama);
    return pool;
  }, [items, selectedRama]);

  // ---- Estado de ejercicio ----
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSegments, setSelectedSegments] = useState<Set<number>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(attemptsToday);
  const [limitReached, setLimitReached] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionPerfect, setSessionPerfect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [shakeCard, setShakeCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();

  const totalCards = filteredItems.length;
  const currentItem = filteredItems[currentIndex];
  const currentSegments: Segmento[] = currentItem
    ? JSON.parse(currentItem.segmentos)
    : [];

  // ---- Handlers ----

  function resetExerciseState() {
    setCurrentIndex(0);
    setSelectedSegments(new Set());
    setFeedback(null);
    setCompleted(false);
  }

  function handleRamaChange(value: string) {
    setSelectedRama(value);
    resetExerciseState();
    updateUrl({ rama: value });
  }

  function handleToggleSegment(segId: number) {
    if (feedback || isSubmitting) return;
    setSelectedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(segId)) next.delete(segId);
      else next.add(segId);
      return next;
    });
  }

  async function handleVerify() {
    if (isSubmitting || feedback || !currentItem) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/error-identification/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorIdentificationId: currentItem.id,
          selecciones: Array.from(selectedSegments),
        }),
      });
      const data = await res.json();

      if (data.limit) {
        setLimitReached(true);
        setIsSubmitting(false);
        return;
      }

      setAttemptsCount(data.attemptsToday);
      setSessionXP((prev) => prev + data.xpGained);
      setSessionTotal((prev) => prev + 1);

      const isPerfect =
        data.aciertos === data.totalErrores && data.fallosPositivos === 0;
      if (isPerfect) {
        setSessionPerfect((prev) => prev + 1);
      }

      setFeedback({
        segmentos: data.segmentos,
        aciertos: data.aciertos,
        fallosPositivos: data.fallosPositivos,
        totalErrores: data.totalErrores,
        explicacionGeneral: data.explicacionGeneral,
        xpGained: data.xpGained,
      });

      // Sound & animation effects
      if (isPerfect) {
        playCorrect();
        if (getAnimationsEnabled()) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2500);
        }
        if (data.xpGained > 0) {
          setTimeout(() => {
            playXpGained();
            showXpFloat(data.xpGained);
          }, 300);
        }
      } else if (data.aciertos > 0) {
        // Partial -- still play xp sound if earned
        if (data.xpGained > 0) {
          setTimeout(() => {
            playXpGained();
            showXpFloat(data.xpGained);
          }, 300);
        }
      } else {
        playIncorrect();
        if (getAnimationsEnabled()) {
          setShakeCard(true);
          setTimeout(() => setShakeCard(false), 500);
        }
      }

      // Badge modal
      if (data.newBadges?.length > 0) {
        setTimeout(() => {
          for (const badge of data.newBadges) {
            showBadgeModal(badge);
          }
        }, 1500);
      }
    } catch {
      // Network error
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    setSelectedSegments(new Set());
    setFeedback(null);
    if (currentIndex + 1 >= totalCards) setCompleted(true);
    else setCurrentIndex((prev) => prev + 1);
  }

  // ---- Segment styling ----

  function getSegmentClasses(segId: number): string {
    const base =
      "inline transition-all duration-200 rounded-[2px] px-[2px] py-[1px]";

    if (feedback) {
      const fullSeg = feedback.segmentos.find(
        (s: SegmentoFull) => s.id === segId
      );
      if (!fullSeg) return base;

      const wasSelected = selectedSegments.has(segId);

      // Correctly identified error
      if (fullSeg.esError && wasSelected) {
        return `${base} bg-gz-sage/20 border-b-2 border-gz-sage`;
      }
      // Missed error
      if (fullSeg.esError && !wasSelected) {
        return `${base} bg-gz-burgundy/20 border-b-2 border-gz-burgundy`;
      }
      // False positive (selected but not an error)
      if (!fullSeg.esError && wasSelected) {
        return `${base} bg-orange-200/60 border-b-2 border-orange-400`;
      }
      // Correct non-error (not selected, not an error)
      return base;
    }

    // Pre-verification states
    if (selectedSegments.has(segId)) {
      return `${base} bg-gz-gold/20 border-b-2 border-gz-gold cursor-pointer`;
    }
    return `${base} hover:bg-gz-gold/10 cursor-pointer`;
  }

  // ---- Filters UI ----

  function FiltersUI() {
    return (
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={selectedRama}
          onChange={(e) => handleRamaChange(e.target.value)}
          className="rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors"
        >
          <option value="ALL">Todas las ramas</option>
          {availableRamas.map((r) => (
            <option key={r} value={r}>
              {RAMA_LABELS[r] ?? r}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ---- Screens ----

  // Limit reached
  if (limitReached && !isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gz-gold/10">
          <svg
            className="h-10 w-10 text-gz-gold"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>
        <h2 className="mt-6 font-cormorant text-[28px] !font-bold text-gz-ink">
          Limite diario alcanzado
        </h2>
        <p className="mt-2 font-archivo text-[14px] text-gz-ink-mid">
          Has completado {dailyLimit} ejercicios hoy. Actualiza a Premium para
          acceso ilimitado.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // Completed
  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gz-sage/10">
          <svg
            className="h-10 w-10 text-gz-sage"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="mt-6 font-cormorant text-[28px] !font-bold text-gz-ink">
          Sesion completada!
        </h2>
        <div className="mt-6 grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="font-cormorant text-[36px] !font-bold text-gz-gold">
              {sessionPerfect}/{sessionTotal}
            </p>
            <p className="font-ibm-mono text-[11px] text-gz-ink-light uppercase tracking-[1px]">
              Perfectos
            </p>
          </div>
          <div>
            <p className="font-cormorant text-[36px] !font-bold text-gz-gold">
              +{sessionXP}
            </p>
            <p className="font-ibm-mono text-[11px] text-gz-ink-light uppercase tracking-[1px]">
              XP Ganados
            </p>
          </div>
          <div>
            <p className="font-cormorant text-[36px] !font-bold text-gz-gold">
              {sessionTotal}
            </p>
            <p className="font-ibm-mono text-[11px] text-gz-ink-light uppercase tracking-[1px]">
              Ejercicios
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // No exercises
  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FiltersUI />
        <p className="font-cormorant italic text-[17px] text-gz-ink-light text-center">
          No hay ejercicios disponibles para estos filtros.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // ---- Main exercise view ----

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-archivo text-[13px] font-medium text-gz-ink-mid hover:text-gz-ink transition-colors"
        >
          Volver
        </Link>
        <span className="font-ibm-mono text-[12px] text-gz-ink-light">
          Ejercicio {currentIndex + 1} de {totalCards}
        </span>
      </div>

      <FiltersUI />

      <Confetti active={showConfetti} color="gold" />

      <div
        className={`rounded-[4px] border border-gz-rule bg-white p-6 sm:p-8${
          shakeCard ? " animate-shake" : ""
        }`}
      >
        {/* Header info */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-ibm-mono text-[11px] uppercase tracking-[1px] text-gz-ink-light">
              {RAMA_LABELS[currentItem.rama] ?? currentItem.rama}
            </span>
            {currentItem.titulo && (
              <>
                <span className="text-gz-rule">&middot;</span>
                <span className="font-ibm-mono text-[11px] text-gz-ink-light">
                  {TITULO_LABELS[currentItem.titulo] ?? currentItem.titulo}
                </span>
              </>
            )}
          </div>
          <span className="font-ibm-mono text-[11px] text-gz-ink-light">
            {DIFICULTAD_MAP[currentItem.dificultad] ?? `Niv. ${currentItem.dificultad}`}
          </span>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">
            XP Sesion:{" "}
            <span className="font-bold text-gz-gold">+{sessionXP}</span>
          </span>
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">
            Seleccionados:{" "}
            <span className="font-bold text-gz-gold">
              {selectedSegments.size}
            </span>
            /{currentItem.totalErrores} errores
          </span>
        </div>

        <div className="h-[1px] bg-gz-rule mb-5" />

        {/* Instructions */}
        <p className="mb-4 font-archivo text-[13px] text-gz-ink-mid italic">
          Haz clic en los fragmentos que contengan un error juridico. Encuentra
          los {currentItem.totalErrores} error
          {currentItem.totalErrores > 1 ? "es" : ""} en el texto.
        </p>

        {/* Segments as inline text */}
        <div className="font-cormorant text-[17px] lg:text-[19px] leading-[1.8] text-gz-ink">
          {currentSegments.map((seg) => (
            <span
              key={seg.id}
              onClick={() => handleToggleSegment(seg.id)}
              className={getSegmentClasses(seg.id)}
            >
              {seg.texto}
            </span>
          ))}
        </div>

        {/* Feedback section */}
        {feedback && (
          <div className="mt-6 space-y-4">
            {/* Summary bar */}
            <div
              className={`rounded-[3px] p-4 ${
                feedback.aciertos === feedback.totalErrores &&
                feedback.fallosPositivos === 0
                  ? "border-l-[3px] border-gz-sage bg-gz-sage/[0.06]"
                  : feedback.aciertos > 0
                  ? "border-l-[3px] border-orange-400 bg-orange-50"
                  : "border-l-[3px] border-gz-burgundy bg-gz-burgundy/[0.06]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {feedback.aciertos === feedback.totalErrores &&
                  feedback.fallosPositivos === 0
                    ? "\u2713"
                    : feedback.aciertos > 0
                    ? "~"
                    : "\u2717"}
                </span>
                <span
                  className={`font-semibold ${
                    feedback.aciertos === feedback.totalErrores &&
                    feedback.fallosPositivos === 0
                      ? "text-gz-sage"
                      : feedback.aciertos > 0
                      ? "text-orange-600"
                      : "text-gz-burgundy"
                  }`}
                >
                  {feedback.aciertos === feedback.totalErrores &&
                  feedback.fallosPositivos === 0
                    ? "Perfecto!"
                    : feedback.aciertos > 0
                    ? "Parcialmente correcto"
                    : "Incorrecto"}
                </span>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 font-bold font-ibm-mono text-[11px] ${
                    feedback.xpGained > 0
                      ? "bg-gz-sage/[0.15] text-gz-sage"
                      : "bg-gz-rule text-gz-ink-light"
                  }`}
                >
                  +{feedback.xpGained} XP
                </span>
              </div>
              <p className="mt-2 font-archivo text-[13px] text-gz-ink-mid">
                Errores encontrados: {feedback.aciertos}/{feedback.totalErrores}
                {feedback.fallosPositivos > 0 && (
                  <span className="ml-2 text-orange-600">
                    ({feedback.fallosPositivos} falso
                    {feedback.fallosPositivos > 1 ? "s" : ""} positivo
                    {feedback.fallosPositivos > 1 ? "s" : ""})
                  </span>
                )}
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 font-archivo text-[12px] text-gz-ink-mid">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-[2px] bg-gz-sage/20 border border-gz-sage" />
                Error identificado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-[2px] bg-gz-burgundy/20 border border-gz-burgundy" />
                Error no encontrado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-[2px] bg-orange-200/60 border border-orange-400" />
                Falso positivo
              </span>
            </div>

            {/* Per-error explanations */}
            <div className="space-y-3">
              {feedback.segmentos
                .filter((s: SegmentoFull) => s.esError)
                .map((seg: SegmentoFull) => {
                  const wasFound = selectedSegments.has(seg.id);
                  return (
                    <div
                      key={seg.id}
                      className={`rounded-[3px] border p-3 ${
                        wasFound
                          ? "border-gz-sage/30 bg-gz-sage/[0.03]"
                          : "border-gz-burgundy/30 bg-gz-burgundy/[0.03]"
                      }`}
                    >
                      <p className="font-archivo text-[13px]">
                        <span
                          className={`font-semibold ${
                            wasFound ? "text-gz-sage" : "text-gz-burgundy"
                          }`}
                        >
                          {wasFound ? "Encontrado" : "No encontrado"}:
                        </span>{" "}
                        <span className="text-gz-ink italic">
                          &ldquo;{seg.texto}&rdquo;
                        </span>
                      </p>
                      {seg.textoCorrecto && (
                        <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
                          <span className="font-semibold text-gz-sage">
                            Correcto:
                          </span>{" "}
                          {seg.textoCorrecto}
                        </p>
                      )}
                      {seg.explicacion && (
                        <p className="mt-1 font-cormorant text-[15px] leading-[1.6] text-gz-ink-mid">
                          {seg.explicacion}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* General explanation */}
            {feedback.explicacionGeneral && (
              <div className="rounded-[3px] border border-gz-rule bg-gz-cream/50 p-4">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold mb-1">
                  Explicacion General
                </p>
                <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid">
                  {feedback.explicacionGeneral}
                </p>
              </div>
            )}

            <ReportButton
              contentType="ERROR_IDENTIFICATION"
              contentId={currentItem.id}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-center">
          {!feedback ? (
            <button
              onClick={handleVerify}
              disabled={selectedSegments.size === 0 || isSubmitting}
              className="rounded-[3px] bg-gz-navy px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
            >
              {isSubmitting ? "Verificando..." : "Verificar"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="rounded-[3px] bg-gz-navy px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
            >
              {currentIndex + 1 >= totalCards
                ? "Ver resultados"
                : "Siguiente"}
            </button>
          )}
        </div>
      </div>

      {!isPremium && (
        <p className="mt-4 text-center font-ibm-mono text-[11px] text-gz-ink-light">
          Hoy: {attemptsCount} / {dailyLimit} ejercicios
        </p>
      )}
    </div>
  );
}
