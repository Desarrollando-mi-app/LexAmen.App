"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  playCorrect,
  playIncorrect,
  playXpGained,
  getAnimationsEnabled,
} from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { Confetti } from "@/app/dashboard/components/confetti";
import { RAMA_LABELS } from "@/lib/curriculum-data";

// ─── Types ───────────────────────────────────────────────

interface Par {
  id: number;
  izquierda: string;
  derecha: string;
}

interface MatchColumnsItem {
  id: string;
  titulo: string;
  instruccion: string | null;
  pares: string; // JSON string
  columnaIzqLabel: string;
  columnaDerLabel: string;
  explicacion: string | null;
  rama: string;
  libro: string | null;
  tituloMateria: string | null;
  materia: string | null;
  dificultad: number;
}

interface MatchColumnsViewerProps {
  items: MatchColumnsItem[];
  attemptsToday: number;
  dailyLimit: number;
  isPremium: boolean;
  initialFilters?: { rama?: string };
}

interface Resultado {
  izquierdaId: number;
  izquierda: string;
  derechaSeleccionada: number | null;
  derechaCorrecta: number;
  derechaTexto: string;
  esCorrecta: boolean;
}

interface Feedback {
  resultados: Resultado[];
  correctas: number;
  totalPares: number;
  perfecto: boolean;
  explicacion: string | null;
  xpGained: number;
}

const DIFICULTAD_MAP: Record<number, string> = {
  1: "Basico",
  2: "Intermedio",
  3: "Avanzado",
};

// ─── Shuffle helper ──────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ─── Component ───────────────────────────────────────────

export function MatchColumnsViewer({
  items,
  attemptsToday,
  dailyLimit,
  isPremium,
  initialFilters,
}: MatchColumnsViewerProps) {
  const router = useRouter();
  const pathname = usePathname();

  // ─── Filters ──────────────────────────────────────────
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

  // ─── Exercise state ───────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, number | null>>(
    {}
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

  // Parse pares and create shuffled derecha
  const { pares, shuffledDerecha } = useMemo(() => {
    if (!currentItem) return { pares: [], shuffledDerecha: [] };
    const parsed: Par[] = JSON.parse(currentItem.pares);
    const shuffled = shuffleArray(parsed.map((p) => ({ id: p.id, texto: p.derecha })));
    return { pares: parsed, shuffledDerecha: shuffled };
  }, [currentItem]);

  // Track which derecha ids are already selected
  const selectedDerechaIds = useMemo(() => {
    const ids = new Set<number>();
    for (const val of Object.values(selections)) {
      if (val !== null && val !== undefined) ids.add(val);
    }
    return ids;
  }, [selections]);

  // Check if all pairs have selections
  const allSelected = useMemo(() => {
    return pares.length > 0 && pares.every((p) => selections[p.id] != null);
  }, [pares, selections]);

  // ─── Handlers ─────────────────────────────────────────

  function resetExerciseState() {
    setCurrentIndex(0);
    setSelections({});
    setFeedback(null);
    setCompleted(false);
  }

  function handleRamaChange(value: string) {
    setSelectedRama(value);
    resetExerciseState();
    updateUrl({ rama: value });
  }

  const handleSelectChange = useCallback(
    (izquierdaId: number, derechaId: number | null) => {
      if (feedback || isSubmitting) return;
      setSelections((prev) => ({
        ...prev,
        [izquierdaId]: derechaId,
      }));
    },
    [feedback, isSubmitting]
  );

  async function handleVerify() {
    if (isSubmitting || feedback || !currentItem || !allSelected) return;
    setIsSubmitting(true);

    const conexiones = pares.map((p) => ({
      izquierdaId: p.id,
      derechaId: selections[p.id]!,
    }));

    try {
      const res = await fetch("/api/match-columns/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchColumnsId: currentItem.id,
          conexiones,
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

      if (data.perfecto) {
        setSessionPerfect((prev) => prev + 1);
      }

      setFeedback({
        resultados: data.resultados,
        correctas: data.correctas,
        totalPares: data.totalPares,
        perfecto: data.perfecto,
        explicacion: data.explicacion,
        xpGained: data.xpGained,
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
      } else if (data.correctas > 0) {
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
    setSelections({});
    setFeedback(null);
    if (currentIndex + 1 >= totalCards) setCompleted(true);
    else setCurrentIndex((prev) => prev + 1);
  }

  // ─── Get row class based on feedback ──────────────────

  function getRowClass(parId: number): string {
    if (!feedback) return "";
    const resultado = feedback.resultados.find(
      (r) => r.izquierdaId === parId
    );
    if (!resultado) return "";
    return resultado.esCorrecta
      ? "bg-gz-sage/10"
      : "bg-gz-burgundy/10";
  }

  // ─── Filters UI ───────────────────────────────────────

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

  // ─── Screens ──────────────────────────────────────────

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

  // ─── Main exercise view ───────────────────────────────

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
            {currentItem.tituloMateria && (
              <>
                <span className="text-gz-rule">&middot;</span>
                <span className="font-ibm-mono text-[11px] text-gz-ink-light">
                  {currentItem.tituloMateria}
                </span>
              </>
            )}
          </div>
          <span className="font-ibm-mono text-[11px] text-gz-ink-light">
            {DIFICULTAD_MAP[currentItem.dificultad] ??
              `Niv. ${currentItem.dificultad}`}
          </span>
        </div>

        {/* Title */}
        <h2 className="font-cormorant text-[22px] lg:text-[26px] font-bold text-gz-ink mb-2">
          {currentItem.titulo}
        </h2>

        {/* Instruction */}
        {currentItem.instruccion && (
          <p className="mb-4 font-archivo text-[13px] text-gz-ink-mid italic">
            {currentItem.instruccion}
          </p>
        )}

        <div className="mb-2 flex items-center justify-between">
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">
            XP Sesion:{" "}
            <span className="font-bold text-gz-gold">+{sessionXP}</span>
          </span>
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">
            {pares.length} pares
          </span>
        </div>

        <div className="h-[1px] bg-gz-rule mb-5" />

        {/* Column headers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-2">
          <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
            {currentItem.columnaIzqLabel}
          </div>
          <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hidden sm:block">
            {currentItem.columnaDerLabel}
          </div>
        </div>

        {/* Pairs rows */}
        <div className="space-y-0">
          {pares.map((par, idx) => {
            const rowClass = getRowClass(par.id);
            const resultado = feedback?.resultados.find(
              (r) => r.izquierdaId === par.id
            );

            return (
              <div
                key={par.id}
                className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-6 border-b border-gz-rule py-3 transition-colors ${rowClass} ${
                  idx === 0 ? "border-t border-gz-rule" : ""
                }`}
              >
                {/* Left column item */}
                <div className="flex items-center">
                  <span className="font-ibm-mono text-[11px] text-gz-ink-light mr-3">
                    {idx + 1}.
                  </span>
                  <span className="font-archivo text-[14px] font-medium text-gz-ink">
                    {par.izquierda}
                  </span>
                </div>

                {/* Right column select */}
                <div>
                  {/* Mobile label */}
                  <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold sm:hidden block mb-1">
                    {currentItem.columnaDerLabel}
                  </span>
                  <select
                    value={selections[par.id] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleSelectChange(
                        par.id,
                        val === "" ? null : Number(val)
                      );
                    }}
                    disabled={!!feedback || isSubmitting}
                    className={`w-full rounded-[3px] border px-3 py-2.5 font-archivo text-[14px] transition-colors focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 ${
                      feedback
                        ? resultado?.esCorrecta
                          ? "border-gz-sage bg-gz-sage/5 text-gz-ink"
                          : "border-gz-burgundy bg-gz-burgundy/5 text-gz-ink"
                        : "border-gz-rule bg-white text-gz-ink"
                    } disabled:cursor-not-allowed`}
                  >
                    <option value="">— Seleccionar —</option>
                    {shuffledDerecha.map((d) => {
                      const isSelectedForThis = selections[par.id] === d.id;
                      const isUsedByOther =
                        selectedDerechaIds.has(d.id) && !isSelectedForThis;
                      return (
                        <option
                          key={d.id}
                          value={d.id}
                          disabled={isUsedByOther}
                        >
                          {d.texto}
                          {isUsedByOther ? " (ya seleccionada)" : ""}
                        </option>
                      );
                    })}
                  </select>

                  {/* Show correct answer if wrong */}
                  {feedback && resultado && !resultado.esCorrecta && (
                    <p className="mt-1 font-archivo text-[12px] text-gz-burgundy">
                      Correcta:{" "}
                      <span className="font-semibold">
                        {resultado.derechaTexto}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feedback section */}
        {feedback && (
          <div className="mt-6 space-y-4">
            {/* Summary bar */}
            <div
              className={`rounded-[3px] p-4 ${
                feedback.perfecto
                  ? "border-l-[3px] border-gz-sage bg-gz-sage/[0.06]"
                  : feedback.correctas > 0
                  ? "border-l-[3px] border-orange-400 bg-orange-50"
                  : "border-l-[3px] border-gz-burgundy bg-gz-burgundy/[0.06]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {feedback.perfecto
                    ? "\u2713"
                    : feedback.correctas > 0
                    ? "~"
                    : "\u2717"}
                </span>
                <span
                  className={`font-semibold ${
                    feedback.perfecto
                      ? "text-gz-sage"
                      : feedback.correctas > 0
                      ? "text-orange-600"
                      : "text-gz-burgundy"
                  }`}
                >
                  {feedback.perfecto
                    ? "Perfecto!"
                    : feedback.correctas > 0
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
                Conexiones correctas: {feedback.correctas}/{feedback.totalPares}
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 font-archivo text-[12px] text-gz-ink-mid">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-[2px] bg-gz-sage/20 border border-gz-sage" />
                Correcto
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-[2px] bg-gz-burgundy/20 border border-gz-burgundy" />
                Incorrecto
              </span>
            </div>

            {/* Explanation */}
            {feedback.explicacion && (
              <div className="rounded-[3px] border border-gz-rule bg-gz-cream/50 p-4">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold mb-1">
                  Explicacion
                </p>
                <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid">
                  {feedback.explicacion}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex justify-center">
          {!feedback ? (
            <button
              onClick={handleVerify}
              disabled={!allSelected || isSubmitting}
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
