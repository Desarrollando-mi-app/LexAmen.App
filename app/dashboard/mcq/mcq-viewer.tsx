"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ReportButton } from "@/app/components/report-button";

// ─── Tipos ─────────────────────────────────────────────────

type MCQData = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
  unidad: string;
  materia: string;
  submateria: string;
  tipo: string;
  nivel: string;
};

type MCQViewerProps = {
  mcqs: MCQData[];
  materias: string[];
  submaterias: string[];
  niveles: string[];
  attemptsToday: number;
  dailyLimit: number;
  isPremium: boolean;
};

// ─── Mapeos de etiquetas ───────────────────────────────────

const SUBMATERIA_LABELS: Record<string, string> = {
  ACTO_JURIDICO: "Acto Jurídico",
  OBLIGACIONES: "Obligaciones",
  CONTRATOS: "Contratos",
  BIENES: "Bienes",
  JURISDICCION: "Jurisdicción",
  COMPETENCIA: "Competencia",
  JUICIO_ORDINARIO: "Juicio Ordinario",
  RECURSOS: "Recursos",
  JUICIO_EJECUTIVO: "Juicio Ejecutivo",
};

const MATERIA_LABELS: Record<string, string> = {
  TEORIA_DE_LA_LEY: "Teoría de la Ley",
  JURISDICCION_Y_COMPETENCIA: "Jurisdicción y Competencia",
};

const NIVEL_LABELS: Record<string, string> = {
  BASICO: "Básico",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

// ─── Componente principal ──────────────────────────────────

export function MCQViewer({
  mcqs,
  materias,
  submaterias,
  niveles,
  attemptsToday,
  dailyLimit,
  isPremium,
}: MCQViewerProps) {
  // Filtros
  const [selectedNivel, setSelectedNivel] = useState<string>("BASICO");
  const [selectedMateria, setSelectedMateria] = useState<string>("ALL");
  const [selectedSubmateria, setSelectedSubmateria] = useState<string>("ALL");

  // Estado de pregunta
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctOption: string;
    explanation: string | null;
    xpGained: number;
  } | null>(null);

  // Estado de sesión
  const [attemptsCount, setAttemptsCount] = useState(attemptsToday);
  const [limitReached, setLimitReached] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  // ─── Filtrado ────────────────────────────────────────────

  const filteredMCQs = useMemo(() => {
    let cards = mcqs.filter((m) => m.nivel === selectedNivel);
    if (selectedMateria !== "ALL") {
      cards = cards.filter((m) => m.materia === selectedMateria);
    }
    if (selectedSubmateria !== "ALL") {
      cards = cards.filter((m) => m.submateria === selectedSubmateria);
    }
    return cards;
  }, [mcqs, selectedNivel, selectedMateria, selectedSubmateria]);

  const totalCards = filteredMCQs.length;
  const currentMCQ = filteredMCQs[currentIndex];

  // ─── Handlers de filtro ──────────────────────────────────

  function resetQuestionState() {
    setCurrentIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    setCompleted(false);
  }

  function handleNivelChange(value: string) {
    setSelectedNivel(value);
    setSelectedMateria("ALL");
    setSelectedSubmateria("ALL");
    resetQuestionState();
  }

  function handleMateriaChange(value: string) {
    setSelectedMateria(value);
    setSelectedSubmateria("ALL");
    resetQuestionState();
  }

  function handleSubmateriaChange(value: string) {
    setSelectedSubmateria(value);
    resetQuestionState();
  }

  // ─── Handlers de pregunta ────────────────────────────────

  function handleSelectOption(option: string) {
    if (feedback || isSubmitting) return;
    setSelectedOption(option);
  }

  async function handleConfirm() {
    if (!selectedOption || isSubmitting || feedback || !currentMCQ) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/mcq/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mcqId: currentMCQ.id,
          selectedOption,
        }),
      });
      const data = await res.json();

      if (data.limit) {
        setLimitReached(true);
        setIsSubmitting(false);
        return;
      }

      // Actualizar estadísticas de sesión
      setAttemptsCount(data.attemptsToday);
      setSessionXP((prev) => prev + data.xpGained);

      if (data.isCorrect) {
        setSessionCorrect((prev) => prev + 1);
        setStreak((prev) => {
          const newStreak = prev + 1;
          setBestStreak((best) => Math.max(best, newStreak));
          return newStreak;
        });
      } else {
        setStreak(0);
      }

      setFeedback({
        isCorrect: data.isCorrect,
        correctOption: data.correctOption,
        explanation: data.explanation,
        xpGained: data.xpGained,
      });
    } catch {
      // Error de red
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    setSelectedOption(null);
    setFeedback(null);
    if (currentIndex + 1 >= totalCards) {
      setCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  // ─── Estilos de opción ──────────────────────────────────

  function getOptionClasses(option: string): string {
    const base =
      "w-full rounded-xl border p-4 text-left transition-all text-sm";

    if (feedback) {
      if (option === feedback.correctOption) {
        return `${base} border-green-400 bg-green-500/10 ring-2 ring-green-400/20`;
      }
      if (option === selectedOption && !feedback.isCorrect) {
        return `${base} border-red-400 bg-red-500/10 ring-2 ring-red-400/20`;
      }
      return `${base} border-border bg-white opacity-50`;
    }

    if (option === selectedOption) {
      return `${base} border-gold bg-gold/5 ring-2 ring-gold/20 cursor-pointer`;
    }

    return `${base} border-border bg-white hover:border-gold/50 cursor-pointer`;
  }

  function getOptionIcon(option: string): React.ReactNode {
    if (feedback) {
      if (option === feedback.correctOption) {
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
            ✓
          </span>
        );
      }
      if (option === selectedOption && !feedback.isCorrect) {
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            ✗
          </span>
        );
      }
    }

    if (option === selectedOption && !feedback) {
      return (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-xs font-bold text-white">
          {option}
        </span>
      );
    }

    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-xs font-semibold text-navy/60">
        {option}
      </span>
    );
  }

  // ─── Renderizado ─────────────────────────────────────────

  // Pantalla: Límite alcanzado
  if (limitReached && !isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/10">
          <svg
            className="h-10 w-10 text-gold"
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
        <h2 className="mt-6 text-2xl font-bold text-navy">
          Límite diario alcanzado
        </h2>
        <p className="mt-2 text-navy/60">
          Has completado {dailyLimit} preguntas hoy. Actualiza a Premium para
          acceso ilimitado.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper hover:bg-navy/90"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    );
  }

  // Pantalla: Sesión completada
  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <svg
            className="h-10 w-10 text-green-500"
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
        <h2 className="mt-6 text-2xl font-bold text-navy">
          ¡Sesión completada!
        </h2>
        <div className="mt-6 grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-gold">
              {sessionCorrect}/{totalCards}
            </p>
            <p className="text-sm text-navy/50">Correctas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gold">+{sessionXP}</p>
            <p className="text-sm text-navy/50">XP Ganados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gold">{bestStreak}</p>
            <p className="text-sm text-navy/50">Mejor Racha</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper hover:bg-navy/90"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    );
  }

  // Pantalla: Sin preguntas
  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-navy/60">
          No hay preguntas disponibles para estos filtros.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper hover:bg-navy/90"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header: Volver + Contador */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-navy/60 hover:text-navy"
        >
          ← Volver
        </Link>
        <span className="text-sm font-medium text-navy/60">
          Pregunta {currentIndex + 1} de {totalCards}
        </span>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-3">
        {/* Nivel */}
        <select
          value={selectedNivel}
          onChange={(e) => handleNivelChange(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        >
          {niveles.map((n) => (
            <option key={n} value={n}>
              {NIVEL_LABELS[n] ?? n}
            </option>
          ))}
        </select>

        {/* Materia */}
        <select
          value={selectedMateria}
          onChange={(e) => handleMateriaChange(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        >
          <option value="ALL">Todas las materias</option>
          {materias.map((m) => (
            <option key={m} value={m}>
              {MATERIA_LABELS[m] ?? m}
            </option>
          ))}
        </select>

        {/* Submateria */}
        <select
          value={selectedSubmateria}
          onChange={(e) => handleSubmateriaChange(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        >
          <option value="ALL">Todas las submaterias</option>
          {submaterias.map((s) => (
            <option key={s} value={s}>
              {SUBMATERIA_LABELS[s] ?? s}
            </option>
          ))}
        </select>
      </div>

      {/* Card de pregunta */}
      <div className="rounded-xl border border-border bg-white p-6 sm:p-8">
        {/* Estadísticas de sesión */}
        <div className="mb-6 flex items-center justify-between text-sm">
          <span className="font-medium text-navy/60">
            🔥 Racha: <span className="font-bold text-orange-500">{streak}</span>
          </span>
          <span className="font-medium text-navy/60">
            ⚡ XP Sesión:{" "}
            <span className="font-bold text-gold">+{sessionXP}</span>
          </span>
        </div>

        {/* Pregunta */}
        <h3 className="mb-6 text-lg font-semibold leading-relaxed text-navy">
          {currentMCQ.question}
        </h3>

        {/* Opciones */}
        <div className="space-y-3">
          {OPTION_KEYS.map((key) => {
            const optionText =
              currentMCQ[`option${key}` as keyof MCQData] as string;
            return (
              <button
                key={key}
                onClick={() => handleSelectOption(key)}
                disabled={!!feedback || isSubmitting}
                className={getOptionClasses(key)}
              >
                <div className="flex items-start gap-3">
                  {getOptionIcon(key)}
                  <span className="mt-0.5 leading-relaxed text-navy">
                    {optionText}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-6 rounded-lg p-4 ${
              feedback.isCorrect
                ? "border border-green-200 bg-green-50"
                : "border border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {feedback.isCorrect ? "✓" : "✗"}
              </span>
              <span
                className={`font-semibold ${
                  feedback.isCorrect ? "text-green-700" : "text-red-700"
                }`}
              >
                {feedback.isCorrect ? "¡Correcto!" : "Incorrecto"}
              </span>
              <span
                className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  feedback.isCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                +{feedback.xpGained} XP
              </span>
            </div>
            {!feedback.isCorrect && (
              <p className="mt-2 text-sm text-red-600">
                La respuesta correcta es:{" "}
                <span className="font-semibold">{feedback.correctOption}</span>
              </p>
            )}
            {feedback.explanation && (
              <p className="mt-3 text-sm leading-relaxed text-navy/70">
                {feedback.explanation}
              </p>
            )}
            <ReportButton contentType="MCQ" contentId={currentMCQ.id} />
          </div>
        )}

        {/* Botones de acción */}
        <div className="mt-6 flex justify-center">
          {!feedback ? (
            <button
              onClick={handleConfirm}
              disabled={!selectedOption || isSubmitting}
              className="rounded-lg bg-navy px-8 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90 disabled:opacity-50"
            >
              {isSubmitting ? "Verificando..." : "Confirmar"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="rounded-lg bg-navy px-8 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90"
            >
              {currentIndex + 1 >= totalCards
                ? "Ver resultados"
                : "Siguiente →"}
            </button>
          )}
        </div>
      </div>

      {/* Contador diario */}
      {!isPremium && (
        <p className="mt-4 text-center text-xs text-navy/40">
          Hoy: {attemptsCount} / {dailyLimit} preguntas
        </p>
      )}
    </div>
  );
}
