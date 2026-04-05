"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { RAMA_LABELS } from "@/lib/curriculum-data";
import {
  playCorrect,
  playIncorrect,
  playXpGained,
  getAnimationsEnabled,
} from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { Confetti } from "@/app/dashboard/components/confetti";
import { ReportButton } from "@/app/components/report-button";
import { ShareSession } from "@/app/components/share-session";
import { FilterBreadcrumb } from "@/app/dashboard/components/filter-breadcrumb";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type Evento = {
  id: number;
  texto: string;
  unidad: string;
  descripcion: string;
};

type TimelineExercise = {
  id: string;
  titulo: string;
  instruccion: string | null;
  escala: string;
  rangoMin: number;
  rangoMax: number;
  eventos: Evento[];
  rama: string;
  libro: string | null;
  tituloMateria: string | null;
  materia: string | null;
  dificultad: number;
};

type TimelineViewerProps = {
  items: TimelineExercise[];
  attemptsToday: number;
  dailyLimit: number;
  isPremium: boolean;
  initialFilters?: {
    rama?: string;
    libro?: string;
    titulo?: string;
  };
};

type EventoResult = {
  eventoId: number;
  texto: string;
  posicionCorrecta: number;
  posicionUsuario: number;
  esCorrecta: boolean;
  unidad: string;
  descripcion: string;
};

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------

export function TimelineViewer({
  items,
  attemptsToday,
  dailyLimit,
  isPremium,
  initialFilters,
}: TimelineViewerProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Filter state
  const [selectedRama, setSelectedRama] = useState<string>(
    initialFilters?.rama || "ALL",
  );

  // Question state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userPositions, setUserPositions] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    resultados: EventoResult[];
    perfecto: boolean;
    correctCount: number;
    totalEventos: number;
    explicacion: string | null;
    xpGained: number;
    escala: string;
    rangoMin: number;
    rangoMax: number;
  } | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(attemptsToday);
  const [limitReached, setLimitReached] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionPerfect, setSessionPerfect] = useState(0);
  const [shakeCard, setShakeCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();
  const hasFiltersFromUrl = !!(initialFilters?.rama || initialFilters?.libro || initialFilters?.titulo);

  // URL sync
  function updateUrl(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && v !== "ALL") sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Derived filter options
  const availableRamas = useMemo(
    () => Array.from(new Set(items.map((m) => m.rama))),
    [items],
  );

  // Filtered items
  const filteredItems = useMemo(() => {
    let cards = [...items];
    if (selectedRama !== "ALL") cards = cards.filter((m) => m.rama === selectedRama);
    if (initialFilters?.libro)
      cards = cards.filter((m) => (m.libro ?? m.tituloMateria) === initialFilters.libro || m.libro === initialFilters.libro);
    if (initialFilters?.titulo)
      cards = cards.filter((m) => m.tituloMateria === initialFilters.titulo);
    return cards.sort(() => Math.random() - 0.5);
  }, [items, selectedRama, initialFilters]);

  const totalCards = filteredItems.length;
  const currentItem = filteredItems[currentIndex];

  // Filter handlers
  function resetQuestionState() {
    setCurrentIndex(0);
    setUserPositions({});
    setFeedback(null);
    setCompleted(false);
  }

  function handleRamaChange(value: string) {
    setSelectedRama(value);
    resetQuestionState();
    updateUrl({ rama: value });
  }

  // Position input handler
  function handlePositionChange(eventoId: number, value: string) {
    setUserPositions((prev) => ({ ...prev, [eventoId]: value }));
  }

  // Submit answer
  async function handleConfirm() {
    if (isSubmitting || feedback || !currentItem) return;
    setIsSubmitting(true);

    try {
      const posiciones = currentItem.eventos.map((e) => ({
        eventoId: e.id,
        posicionUsuario: Number(userPositions[e.id] ?? 0),
      }));

      const res = await fetch("/api/timeline/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timelineId: currentItem.id, posiciones }),
      });

      const data = await res.json();

      if (data.limit) {
        setLimitReached(true);
        setIsSubmitting(false);
        return;
      }

      setAttemptsCount(data.attemptsToday);
      setSessionXP((prev) => prev + data.xpGained);

      if (data.perfecto) {
        setSessionPerfect((prev) => prev + 1);
      }

      setFeedback({
        resultados: data.resultados,
        perfecto: data.perfecto,
        correctCount: data.correctCount,
        totalEventos: data.totalEventos,
        explicacion: data.explicacion,
        xpGained: data.xpGained,
        escala: data.escala,
        rangoMin: data.rangoMin,
        rangoMax: data.rangoMax,
      });

      // Sound & animation effects
      if (data.perfecto) {
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
      } else {
        playIncorrect();
        if (getAnimationsEnabled()) {
          setShakeCard(true);
          setTimeout(() => setShakeCard(false), 500);
        }
        if (data.xpGained > 0) {
          setTimeout(() => {
            playXpGained();
            showXpFloat(data.xpGained);
          }, 300);
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
      // Network error — silently handled
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    setFeedback(null);
    setUserPositions({});
    if (currentIndex + 1 >= totalCards) setCompleted(true);
    else setCurrentIndex((prev) => prev + 1);
  }

  // Check if all inputs are filled
  const allFilled = currentItem
    ? currentItem.eventos.every(
        (e) => userPositions[e.id] !== undefined && userPositions[e.id] !== "",
      )
    : false;

  // Filters UI
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

  // Timeline visualization bar
  function TimelineBar({
    resultados,
    rangoMin,
    rangoMax,
    escala,
  }: {
    resultados: EventoResult[];
    rangoMin: number;
    rangoMax: number;
    escala: string;
  }) {
    const range = rangoMax - rangoMin;
    if (range <= 0) return null;

    // Sort by correct position for display
    const sorted = [...resultados].sort(
      (a, b) => a.posicionCorrecta - b.posicionCorrecta,
    );

    return (
      <div className="mb-6">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-3">
          Linea de tiempo — {escala}
        </p>
        <div className="relative">
          {/* Main bar */}
          <div className="h-2 bg-gz-rule rounded-full relative">
            {/* Range labels */}
            <span className="absolute -bottom-5 left-0 font-ibm-mono text-[10px] text-gz-ink-light">
              {rangoMin}
            </span>
            <span className="absolute -bottom-5 right-0 font-ibm-mono text-[10px] text-gz-ink-light">
              {rangoMax}
            </span>
          </div>

          {/* Event markers */}
          {sorted.map((r, idx) => {
            const pct =
              ((r.posicionCorrecta - rangoMin) / range) * 100;
            const isCorrect = r.esCorrecta;

            return (
              <div
                key={r.eventoId}
                className="absolute"
                style={{
                  left: `${Math.min(Math.max(pct, 2), 98)}%`,
                  top: "-4px",
                  transform: "translateX(-50%)",
                }}
              >
                {/* Circle marker */}
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    isCorrect
                      ? "bg-gz-sage border-gz-sage"
                      : "bg-gz-burgundy border-gz-burgundy"
                  }`}
                />
                {/* Vertical line */}
                <div
                  className={`w-px h-6 mx-auto ${
                    isCorrect ? "bg-gz-sage/50" : "bg-gz-burgundy/50"
                  }`}
                />
                {/* Label */}
                <p
                  className={`font-archivo text-[10px] leading-tight text-center max-w-[80px] ${
                    isCorrect ? "text-gz-sage" : "text-gz-burgundy"
                  } ${idx % 2 === 0 ? "" : "mt-3"}`}
                  style={{ transform: "translateX(-50%)", marginLeft: "50%" }}
                >
                  {r.posicionCorrecta}
                </p>
              </div>
            );
          })}
        </div>
        {/* Spacer for markers */}
        <div className="h-16" />
      </div>
    );
  }

  // Limit reached screen
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
          href="/dashboard/indice-maestro"
          className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Indice
        </Link>
      </div>
    );
  }

  // Completion screen
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
        <div className="mt-6 grid grid-cols-2 gap-6 text-center">
          <div>
            <p className="font-cormorant text-[36px] !font-bold text-gz-gold">
              {sessionPerfect}/{totalCards}
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
        </div>
        <ShareSession
          modulo="Lineas de Tiempo"
          materia={RAMA_LABELS[selectedRama] ?? undefined}
          total={totalCards}
          correctas={sessionPerfect}
          xp={sessionXP}
        />
        <Link
          href="/dashboard/indice-maestro"
          className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Indice
        </Link>
      </div>
    );
  }

  // Empty state
  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {hasFiltersFromUrl ? <FilterBreadcrumb rama={initialFilters?.rama} libro={initialFilters?.libro} titulo={initialFilters?.titulo} /> : <FiltersUI />}
        <p className="font-cormorant italic text-[17px] text-gz-ink-light text-center">
          No hay ejercicios disponibles para estos filtros.
        </p>
        <Link
          href="/dashboard/indice-maestro"
          className="mt-6 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Indice
        </Link>
      </div>
    );
  }

  // Main exercise view
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/indice-maestro"
          className="font-archivo text-[13px] font-medium text-gz-ink-mid hover:text-gz-ink transition-colors"
        >
          Volver al Indice
        </Link>
        <span className="font-ibm-mono text-[12px] text-gz-ink-light">
          Ejercicio {currentIndex + 1} de {totalCards}
        </span>
      </div>

      {hasFiltersFromUrl ? <FilterBreadcrumb rama={initialFilters?.rama} libro={initialFilters?.libro} titulo={initialFilters?.titulo} /> : <FiltersUI />}

      <Confetti active={showConfetti} color="gold" />

      <div
        className={`rounded-[4px] border border-gz-rule bg-white p-6 sm:p-8${
          shakeCard ? " animate-shake" : ""
        }`}
      >
        {/* Session stats bar */}
        <div className="mb-6 flex items-center justify-between text-sm">
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">
            Perfectos:{" "}
            <span className="font-bold text-gz-gold">{sessionPerfect}</span>
          </span>
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">
            XP Sesion:{" "}
            <span className="font-bold text-gz-gold">+{sessionXP}</span>
          </span>
        </div>

        {/* Title */}
        <h2 className="font-cormorant text-[22px] lg:text-[26px] font-bold text-gz-ink mb-2">
          {currentItem.titulo}
        </h2>

        {/* Instruction */}
        {currentItem.instruccion && (
          <p className="font-archivo text-[14px] text-gz-ink-mid mb-4 leading-relaxed">
            {currentItem.instruccion}
          </p>
        )}

        {/* Scale and range info */}
        <div className="mb-5 flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gz-gold/10 px-3 py-1 font-ibm-mono text-[11px] text-gz-gold">
            Escala: {currentItem.escala}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gz-gold/10 px-3 py-1 font-ibm-mono text-[11px] text-gz-gold">
            Rango: {currentItem.rangoMin} — {currentItem.rangoMax}
          </span>
        </div>

        {/* Timeline visualization after verification */}
        {feedback && (
          <TimelineBar
            resultados={feedback.resultados}
            rangoMin={feedback.rangoMin}
            rangoMax={feedback.rangoMax}
            escala={feedback.escala}
          />
        )}

        {/* Events list */}
        <div className="space-y-4">
          {currentItem.eventos.map((evento) => {
            const result = feedback?.resultados.find(
              (r) => r.eventoId === evento.id,
            );

            return (
              <div
                key={evento.id}
                className={`rounded-[4px] border p-4 ${
                  result
                    ? result.esCorrecta
                      ? "border-gz-sage/30 bg-gz-sage/[0.06]"
                      : "border-gz-burgundy/30 bg-gz-burgundy/[0.06]"
                    : "border-gz-rule bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-archivo text-[14px] text-gz-ink font-medium leading-snug">
                      {evento.texto}
                    </p>
                    {evento.descripcion && (
                      <p className="font-archivo text-[12px] text-gz-ink-light mt-1 leading-relaxed">
                        {evento.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!feedback ? (
                      <div className="flex items-center gap-2">
                        <label className="font-ibm-mono text-[10px] text-gz-ink-light uppercase tracking-[1px] whitespace-nowrap">
                          {currentItem.escala}:
                        </label>
                        <input
                          type="number"
                          min={currentItem.rangoMin}
                          max={currentItem.rangoMax}
                          value={userPositions[evento.id] ?? ""}
                          onChange={(e) =>
                            handlePositionChange(evento.id, e.target.value)
                          }
                          placeholder="?"
                          className="w-20 rounded-[3px] border border-gz-rule bg-white px-2 py-1.5 font-ibm-mono text-[14px] text-gz-ink text-center focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
                        />
                      </div>
                    ) : result ? (
                      <div className="flex items-center gap-2">
                        {result.esCorrecta ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gz-sage text-[11px] font-bold text-white">
                            &#10003;
                          </span>
                        ) : (
                          <>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gz-burgundy text-[11px] font-bold text-white">
                              &#10007;
                            </span>
                            <span className="font-archivo text-[11px] text-gz-burgundy whitespace-nowrap">
                              Correcto: {currentItem.escala} {result.posicionCorrecta}
                            </span>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback panel */}
        {feedback && (
          <div
            className={`mt-6 ${
              feedback.perfecto
                ? "border-l-[3px] border-gz-sage bg-gz-sage/[0.06] rounded-[3px] p-4"
                : "border-l-[3px] border-gz-burgundy bg-gz-burgundy/[0.06] rounded-[3px] p-4"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {feedback.perfecto ? "\u2713" : "\u2717"}
              </span>
              <span
                className={`font-semibold ${
                  feedback.perfecto ? "text-gz-sage" : "text-gz-burgundy"
                }`}
              >
                {feedback.perfecto
                  ? "Perfecto! Todos los eventos ubicados correctamente."
                  : `${feedback.correctCount}/${feedback.totalEventos} eventos correctos (tolerancia: +-1)`}
              </span>
              <span
                className={`ml-auto rounded-full px-2.5 py-0.5 font-bold ${
                  feedback.perfecto
                    ? "bg-gz-sage/[0.15] text-gz-sage font-ibm-mono text-[11px]"
                    : "bg-gz-burgundy/[0.15] text-gz-burgundy font-ibm-mono text-[11px]"
                }`}
              >
                +{feedback.xpGained} XP
              </span>
            </div>

            {feedback.explicacion && (
              <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid mt-3">
                {feedback.explicacion}
              </p>
            )}

            <ReportButton contentType="Timeline" contentId={currentItem.id} />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-center">
          {!feedback ? (
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || !allFilled}
              className="rounded-[3px] bg-gz-navy px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
            >
              {isSubmitting ? "Verificando..." : "Verificar"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="rounded-[3px] bg-gz-navy px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
            >
              {currentIndex + 1 >= totalCards ? "Ver resultados" : "Siguiente"}
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
