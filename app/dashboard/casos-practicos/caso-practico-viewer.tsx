"use client";

import { useState, useCallback, useMemo } from "react";
import { playCorrect, playIncorrect, playXpGained, getAnimationsEnabled } from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { Confetti } from "@/app/dashboard/components/confetti";
import { RAMA_LABELS } from "@/lib/curriculum-data";
import { ReportButton } from "@/app/components/report-button";
import { ExerciseWatermark } from "@/app/components/exercise-watermark";
import { ExerciseCodeBadge } from "@/app/components/exercise-code-badge";
import { ShareSession } from "@/app/components/share-session";
import Link from "next/link";

/* ─── Types ─── */
interface CasoSummary {
  id: string;
  titulo: string;
  hechos: string;
  resumenFinal: string | null;
  rama: string;
  libro: string | null;
  tituloMateria: string | null;
  parrafo: string | null;
  materia: string | null;
  dificultad: number;
  preguntasCount: number;
}

interface Pregunta {
  id: number;
  tipo: string;
  pregunta: string;
  opciones: string[];
}

interface GradedRespuesta {
  preguntaId: number;
  respuestaTexto: string;
  correcta: boolean;
  explicacion: string | null;
  correctaTexto: string | null;
}

interface AttemptResult {
  gradedRespuestas: GradedRespuesta[];
  correctas: number;
  totalPreguntas: number;
  allCorrect: boolean;
  xpGained: number;
  attemptsToday: number;
  newBadges: { slug: string; label: string; emoji: string; description: string; tier: string }[];
}

/* ─── Question type config ─── */
const TIPO_CONFIG: Record<string, { label: string; icon: string }> = {
  identificar: { label: "Identificar el problema", icon: "\uD83D\uDD0D" },
  norma: { label: "Norma aplicable", icon: "\uD83D\uDCDC" },
  resolver: { label: "Resolucion", icon: "\u2696\uFE0F" },
};

/*
 * State machine:
 * "browse"    -> user picks a case from the list
 * "playing"   -> answering questions one at a time (client-side only)
 * "submitting"-> sending answers to server
 * "reviewing" -> showing per-question feedback sequentially after submit
 * "summary"   -> final summary card
 * "limit"     -> daily limit reached
 */
type Phase = "browse" | "playing" | "submitting" | "reviewing" | "summary" | "limit";

export function CasoPracticoViewer({
  casos,
  plan,
  attemptsToday: initialAttemptsToday,
  dailyLimit,
  completedIds = [],
}: {
  casos: CasoSummary[];
  plan: string;
  attemptsToday: number;
  dailyLimit: number;
  completedIds?: string[];
}) {
  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();
  const completedSet = useMemo(() => new Set(completedIds), [completedIds]);

  const [phase, setPhase] = useState<Phase>("browse");
  const [ramaFilter, setRamaFilter] = useState<string>("ALL");

  // Current case
  const [selectedCaso, setSelectedCaso] = useState<CasoSummary | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [collectedAnswers, setCollectedAnswers] = useState<{ preguntaId: number; respuestaTexto: string }[]>([]);

  // Results
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);

  // Global
  const [attemptsToday, setAttemptsToday] = useState(initialAttemptsToday);
  const [confettiActive, setConfettiActive] = useState(false);
  const [loadingCase, setLoadingCase] = useState(false);
  const [sessionStats, setSessionStats] = useState({ completed: 0, totalCorrect: 0, totalXp: 0 });

  const isFree = plan === "FREE";
  const isLimitReached = isFree && attemptsToday >= dailyLimit;

  const filteredCasos =
    ramaFilter === "ALL" ? casos : casos.filter((c) => c.rama === ramaFilter);
  const uniqueRamas = Array.from(new Set(casos.map((c) => c.rama)));

  /* ─── Start a case ─── */
  const startCase = useCallback(
    async (caso: CasoSummary) => {
      if (isLimitReached) {
        setPhase("limit");
        return;
      }
      setLoadingCase(true);
      try {
        const res = await fetch(`/api/caso-practico?rama=${caso.rama}`);
        const data = await res.json();
        const fullCase = data.items?.find((c: { id: string }) => c.id === caso.id);
        if (!fullCase || !fullCase.preguntas?.length) return;

        setSelectedCaso(caso);
        setPreguntas(fullCase.preguntas);
        setCurrentQ(0);
        setSelectedOption(null);
        setCollectedAnswers([]);
        setResult(null);
        setReviewIndex(0);
        setPhase("playing");
      } catch {
        // silent
      } finally {
        setLoadingCase(false);
      }
    },
    [isLimitReached]
  );

  /* ─── Answer current question (client-side) ─── */
  const answerCurrentQuestion = useCallback(() => {
    if (selectedOption === null) return;
    const pregunta = preguntas[currentQ];
    const newAnswers = [
      ...collectedAnswers,
      { preguntaId: pregunta.id, respuestaTexto: pregunta.opciones[selectedOption] },
    ];
    setCollectedAnswers(newAnswers);

    if (currentQ < preguntas.length - 1) {
      // Next question
      setCurrentQ((q) => q + 1);
      setSelectedOption(null);
    } else {
      // All answered -> submit
      submitAttempt(newAnswers);
    }
  }, [selectedOption, currentQ, preguntas, collectedAnswers]);

  /* ─── Submit attempt ─── */
  const submitAttempt = useCallback(
    async (answers: { preguntaId: number; respuestaTexto: string }[]) => {
      setPhase("submitting");
      try {
        const res = await fetch("/api/caso-practico/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            casoPracticoId: selectedCaso!.id,
            respuestas: answers,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          if (err.limit) {
            setAttemptsToday(err.attemptsToday);
            setPhase("limit");
            return;
          }
          setPhase("browse");
          return;
        }

        const data: AttemptResult = await res.json();
        setResult(data);
        setAttemptsToday(data.attemptsToday);
        setReviewIndex(0);
        setPhase("reviewing");

        // Play sound for first question feedback
        const first = data.gradedRespuestas[0];
        if (first && getAnimationsEnabled()) {
          if (first.correcta) playCorrect();
          else playIncorrect();
        }
      } catch {
        setPhase("browse");
      }
    },
    [selectedCaso]
  );

  /* ─── Advance review ─── */
  const advanceReview = useCallback(() => {
    if (!result) return;
    const nextIdx = reviewIndex + 1;
    if (nextIdx < result.gradedRespuestas.length) {
      setReviewIndex(nextIdx);
      const graded = result.gradedRespuestas[nextIdx];
      if (graded && getAnimationsEnabled()) {
        if (graded.correcta) playCorrect();
        else playIncorrect();
      }
    } else {
      // Show summary
      setPhase("summary");

      // Update session stats
      setSessionStats((prev) => ({
        completed: prev.completed + 1,
        totalCorrect: prev.totalCorrect + result.correctas,
        totalXp: prev.totalXp + result.xpGained,
      }));

      // XP float
      if (result.xpGained > 0) {
        if (getAnimationsEnabled()) playXpGained();
        showXpFloat(result.xpGained);
      }

      // Confetti if all correct
      if (result.allCorrect) {
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 3000);
      }

      // Badges
      if (result.newBadges?.length) {
        result.newBadges.forEach((b) => {
          if (b) showBadgeModal(b);
        });
      }
    }
  }, [result, reviewIndex, showXpFloat, showBadgeModal]);

  /* ─── Go back to browse ─── */
  const backToBrowse = useCallback(() => {
    setSelectedCaso(null);
    setPreguntas([]);
    setResult(null);
    setPhase(isLimitReached ? "limit" : "browse");
  }, [isLimitReached]);

  /* ═══════════════════════════════════════════════════════════ */
  /* ─── RENDER ─── */
  /* ═══════════════════════════════════════════════════════════ */

  // ─── LIMIT SCREEN ───
  if (phase === "limit") {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gz-rule">
          <span className="text-2xl">&#x1F512;</span>
        </div>
        <h2 className="mt-6 font-cormorant text-[24px] font-bold text-gz-ink">
          Limite diario alcanzado
        </h2>
        <p className="mt-2 max-w-md font-archivo text-[13px] text-gz-ink-light">
          Has completado {attemptsToday} de {dailyLimit} casos practicos hoy.
          Actualiza tu plan para acceso ilimitado.
        </p>
        {sessionStats.completed > 0 && (
          <div className="mt-6 rounded-[4px] border border-gz-rule px-6 py-4">
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
              Sesion de hoy
            </p>
            <div className="mt-2 flex gap-6">
              <div className="text-center">
                <p className="font-cormorant text-[20px] font-bold text-gz-ink">
                  {sessionStats.completed}
                </p>
                <p className="font-archivo text-[11px] text-gz-ink-light">casos</p>
              </div>
              <div className="text-center">
                <p className="font-cormorant text-[20px] font-bold text-gz-gold">
                  {sessionStats.totalCorrect}
                </p>
                <p className="font-archivo text-[11px] text-gz-ink-light">correctas</p>
              </div>
              <div className="text-center">
                <p className="font-cormorant text-[20px] font-bold text-gz-sage">
                  +{sessionStats.totalXp} XP
                </p>
                <p className="font-archivo text-[11px] text-gz-ink-light">ganados</p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setPhase("browse")}
          className="mt-6 font-archivo text-[12px] text-gz-ink-light underline hover:text-gz-ink"
        >
          Ver casos
        </button>
      </div>
    );
  }

  // ─── BROWSE: Case list ───
  if (phase === "browse") {
    return (
      <>
        {/* Session stats bar */}
        {sessionStats.completed > 0 && (
          <div className="mb-6 flex items-center justify-between rounded-[4px] border border-gz-rule px-4 py-3">
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
              Sesion
            </span>
            <div className="flex gap-4 font-archivo text-[12px]">
              <span className="text-gz-ink">
                {sessionStats.completed} caso{sessionStats.completed !== 1 ? "s" : ""}
              </span>
              <span className="text-gz-gold">{sessionStats.totalCorrect} correctas</span>
              <span className="text-gz-sage">+{sessionStats.totalXp} XP</span>
            </div>
          </div>
        )}

        {/* Rama filter */}
        {uniqueRamas.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setRamaFilter("ALL")}
              className={`rounded-[3px] px-3 py-1.5 font-archivo text-[11px] uppercase tracking-[1px] transition-colors ${
                ramaFilter === "ALL"
                  ? "bg-gz-navy text-white"
                  : "border border-gz-rule text-gz-ink-light hover:border-gz-gold hover:text-gz-gold"
              }`}
            >
              Todas
            </button>
            {uniqueRamas.map((rama) => (
              <button
                key={rama}
                onClick={() => setRamaFilter(rama)}
                className={`rounded-[3px] px-3 py-1.5 font-archivo text-[11px] uppercase tracking-[1px] transition-colors ${
                  ramaFilter === rama
                    ? "bg-gz-navy text-white"
                    : "border border-gz-rule text-gz-ink-light hover:border-gz-gold hover:text-gz-gold"
                }`}
              >
                {RAMA_LABELS[rama] || rama.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}

        {/* Free plan attempts counter */}
        {isFree && (
          <div className="mb-4 font-archivo text-[12px] text-gz-ink-light">
            Casos hoy: {attemptsToday}/{dailyLimit}
            {isLimitReached && (
              <span className="ml-2 text-red-500">(limite alcanzado)</span>
            )}
          </div>
        )}

        {/* Case cards */}
        {filteredCasos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-archivo text-[13px] text-gz-ink-light">
              No hay casos practicos disponibles{ramaFilter !== "ALL" ? " en esta rama" : ""}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCasos.map((caso) => {
              const isCompleted = completedSet.has(caso.id);
              return (
              <button
                key={caso.id}
                onClick={() => startCase(caso)}
                disabled={loadingCase || isLimitReached}
                className="w-full rounded-[4px] border border-gz-rule p-5 text-left transition-all hover:border-gz-gold hover:shadow-sm disabled:opacity-50"
                style={{ backgroundColor: "var(--gz-cream)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Completion indicator */}
                  <span className={`mt-0.5 flex-shrink-0 text-[16px] ${isCompleted ? "text-gz-sage" : "text-gz-rule"}`}>
                    {isCompleted ? "✅" : "○"}
                  </span>
                  <div className="flex-1">
                    <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                      {RAMA_LABELS[caso.rama] || caso.rama.replace(/_/g, " ")}
                      {caso.materia && <span className="ml-2 text-gz-gold">{caso.materia}</span>}
                    </p>
                    <h3 className="mt-1.5 font-cormorant text-[18px] font-bold text-gz-ink">
                      {caso.titulo}
                    </h3>
                    <p className="mt-1 line-clamp-2 font-archivo text-[13px] italic text-gz-ink-light">
                      {caso.hechos}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                      {caso.preguntasCount} preg.
                    </span>
                    <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                      Dif. {caso.dificultad}
                    </span>
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // ─── PLAYING: Answering questions ───
  if (phase === "playing" && selectedCaso && preguntas.length > 0) {
    const pregunta = preguntas[currentQ];
    const tipoConf = TIPO_CONFIG[pregunta.tipo] || {
      label: pregunta.tipo,
      icon: "\u2753",
    };

    return (
      <div>
        {/* Progress bar */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-gz-rule/50">
            <div
              className="h-full rounded-full bg-gz-gold transition-all duration-300"
              style={{ width: `${((currentQ + 1) / preguntas.length) * 100}%` }}
            />
          </div>
          <span className="font-ibm-mono text-[11px] text-gz-ink-light">
            {currentQ + 1}/{preguntas.length}
          </span>
        </div>

        {/* Case title */}
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
          {RAMA_LABELS[selectedCaso.rama] || selectedCaso.rama.replace(/_/g, " ")}
        </p>
        <h2 className="mt-1 font-cormorant text-[20px] font-bold text-gz-ink">
          {selectedCaso.titulo}
        </h2>

        {/* Hechos card */}
        <div
          className="relative isolate mt-4 rounded-[4px] border border-gz-rule p-5"
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          <ExerciseWatermark />
          <ExerciseCodeBadge type="CASO_PRACTICO" id={selectedCaso.id} />
          <p className="mb-2 font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            Hechos del caso
          </p>
          <p className="font-cormorant text-[16px] italic leading-relaxed text-gz-ink">
            {selectedCaso.hechos}
          </p>
        </div>

        {/* Question */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">{tipoConf.icon}</span>
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold">
              {tipoConf.label}
            </span>
          </div>

          <h3 className="font-cormorant text-[18px] font-bold text-gz-ink">
            {pregunta.pregunta}
          </h3>

          {/* Options */}
          <div className="mt-4 space-y-2">
            {pregunta.opciones.map((opcion, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedOption(idx)}
                className={`w-full rounded-[4px] border p-4 text-left font-archivo text-[14px] transition-all ${
                  selectedOption === idx
                    ? "border-gz-gold bg-gz-gold/10 text-gz-ink"
                    : "border-gz-rule text-gz-ink hover:border-gz-gold/50"
                }`}
              >
                <span className="mr-3 font-ibm-mono text-[12px] text-gz-ink-light">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {opcion}
              </button>
            ))}
          </div>

          {/* Confirm button */}
          <button
            onClick={answerCurrentQuestion}
            disabled={selectedOption === null}
            className="mt-6 w-full rounded-[4px] bg-gz-navy py-3 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-40"
          >
            {currentQ < preguntas.length - 1 ? "Siguiente pregunta" : "Enviar respuestas"}
          </button>
        </div>

        <ReportButton contentType="CasoPractico" contentId={selectedCaso.id} />
      </div>
    );
  }

  // ─── SUBMITTING ───
  if (phase === "submitting") {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gz-gold border-t-transparent" />
        <p className="mt-4 font-archivo text-[13px] text-gz-ink-light">
          Evaluando respuestas...
        </p>
      </div>
    );
  }

  // ─── REVIEWING: Per-question feedback ───
  if (phase === "reviewing" && result && selectedCaso) {
    const graded = result.gradedRespuestas[reviewIndex];
    const pregunta = preguntas[reviewIndex];
    if (!graded || !pregunta) return null;

    const tipoConf = TIPO_CONFIG[pregunta.tipo] || {
      label: pregunta.tipo,
      icon: "\u2753",
    };

    return (
      <div>
        {/* Progress */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-gz-rule/50">
            <div
              className="h-full rounded-full bg-gz-gold transition-all duration-300"
              style={{
                width: `${((reviewIndex + 1) / result.gradedRespuestas.length) * 100}%`,
              }}
            />
          </div>
          <span className="font-ibm-mono text-[11px] text-gz-ink-light">
            Resultado {reviewIndex + 1}/{result.gradedRespuestas.length}
          </span>
        </div>

        {/* Type label */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">{tipoConf.icon}</span>
          <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold">
            {tipoConf.label}
          </span>
        </div>

        <h3 className="font-cormorant text-[18px] font-bold text-gz-ink">
          {pregunta.pregunta}
        </h3>

        {/* Options with correct/incorrect highlighting */}
        <div className="mt-4 space-y-2">
          {pregunta.opciones.map((opcion, idx) => {
            const isSelected = opcion.trim() === graded.respuestaTexto?.trim();
            const isCorrectOption = opcion.trim() === graded.correctaTexto?.trim();
            let borderClass = "border-gz-rule";
            let bgClass = "";

            if (isCorrectOption) {
              borderClass = "border-green-500";
              bgClass = "bg-green-50";
            } else if (isSelected && !graded.correcta) {
              borderClass = "border-red-400";
              bgClass = "bg-red-50";
            }

            return (
              <div
                key={idx}
                className={`rounded-[4px] border p-4 font-archivo text-[14px] text-gz-ink ${borderClass} ${bgClass}`}
              >
                <span className="mr-3 font-ibm-mono text-[12px] text-gz-ink-light">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {opcion}
                {isCorrectOption && (
                  <span className="ml-2 font-ibm-mono text-[11px] text-green-600">
                    ✓ Correcta
                  </span>
                )}
                {isSelected && !graded.correcta && (
                  <span className="ml-2 font-ibm-mono text-[11px] text-red-500">
                    ✗ Tu respuesta
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Result badge */}
        <div
          className={`mt-4 rounded-[4px] border p-4 ${
            graded.correcta
              ? "border-green-300 bg-green-50"
              : "border-red-300 bg-red-50"
          }`}
        >
          <p
            className={`font-cormorant text-[16px] font-bold ${
              graded.correcta ? "text-green-700" : "text-red-700"
            }`}
          >
            {graded.correcta ? "Correcto (+2 XP)" : "Incorrecto"}
          </p>
          {graded.explicacion && (
            <p className="mt-2 font-archivo text-[13px] text-gz-ink">
              {graded.explicacion}
            </p>
          )}
        </div>

        {/* Next button */}
        <button
          onClick={advanceReview}
          className="mt-6 w-full rounded-[4px] bg-gz-navy py-3 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          {reviewIndex < result.gradedRespuestas.length - 1
            ? "Siguiente resultado"
            : "Ver resumen"}
        </button>
      </div>
    );
  }

  // ─── SUMMARY ───
  if (phase === "summary" && result && selectedCaso) {
    return (
      <div>
        <Confetti active={confettiActive} />

        <div className="rounded-[4px] border-2 border-gz-rule p-6 text-center">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
            Caso completado
          </p>
          <h2 className="mt-2 font-cormorant text-[24px] font-bold text-gz-ink">
            {selectedCaso.titulo}
          </h2>

          {/* Score */}
          <div className="mx-auto mt-6 flex max-w-xs justify-center gap-8">
            <div className="text-center">
              <p className="font-cormorant text-[32px] font-bold text-gz-ink">
                {result.correctas}/{result.totalPreguntas}
              </p>
              <p className="font-archivo text-[11px] text-gz-ink-light">correctas</p>
            </div>
            <div className="text-center">
              <p className="font-cormorant text-[32px] font-bold text-gz-gold">
                +{result.xpGained}
              </p>
              <p className="font-archivo text-[11px] text-gz-ink-light">XP ganados</p>
            </div>
          </div>

          {result.allCorrect && (
            <div className="mt-4 rounded-[3px] bg-gz-gold/10 px-4 py-2">
              <p className="font-cormorant text-[16px] font-bold text-gz-gold">
                Perfecto! +3 XP bonus
              </p>
            </div>
          )}

          {/* Resumen final */}
          {selectedCaso.resumenFinal && (
            <div className="mt-6 rounded-[4px] border border-gz-rule p-4 text-left">
              <p className="mb-2 font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                Resumen del caso
              </p>
              <p className="font-archivo text-[13px] leading-relaxed text-gz-ink">
                {selectedCaso.resumenFinal}
              </p>
            </div>
          )}
        </div>

        {/* Session stats */}
        <div className="mt-6 rounded-[4px] border border-gz-rule px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
              Sesion
            </span>
            <div className="flex gap-4 font-archivo text-[12px]">
              <span className="text-gz-ink">
                {sessionStats.completed} caso{sessionStats.completed !== 1 ? "s" : ""}
              </span>
              <span className="text-gz-gold">{sessionStats.totalCorrect} correctas</span>
              <span className="text-gz-sage">+{sessionStats.totalXp} XP</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={backToBrowse}
            className="flex-1 rounded-[4px] border border-gz-rule py-3 font-archivo text-[13px] font-semibold text-gz-ink transition-colors hover:border-gz-gold"
          >
            Elegir otro caso
          </button>
          {!isLimitReached && (
            <button
              onClick={() => startCase(selectedCaso)}
              className="flex-1 rounded-[4px] bg-gz-navy py-3 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
            >
              Repetir caso
            </button>
          )}
        </div>

        <ShareSession
          modulo="Casos Prácticos"
          materia={RAMA_LABELS[selectedCaso.rama] ?? undefined}
          total={result.totalPreguntas}
          correctas={result.correctas}
          xp={result.xpGained}
        />

        <div className="mt-4 text-center">
          <Link
            href="/dashboard/indice-maestro"
            className="font-archivo text-[12px] text-gz-ink-light underline hover:text-gz-ink transition-colors"
          >
            Volver al Índice Maestro
          </Link>
        </div>

        <ReportButton contentType="CasoPractico" contentId={selectedCaso.id} />
      </div>
    );
  }

  return null;
}
