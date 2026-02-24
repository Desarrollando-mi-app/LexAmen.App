"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────

type FlashcardProgress = {
  nextReviewAt: string; // ISO string
  easeFactor: number;
  interval: number;
  repetitions: number;
};

type FlashcardData = {
  id: string;
  front: string;
  back: string;
  submateria: string;
  tipo: string;
  nivel: string;
  progress: FlashcardProgress | null;
};

type FlashcardViewerProps = {
  flashcards: FlashcardData[];
  submaterias: string[];
  niveles: string[];
  reviewsToday: number;
  dailyLimit: number;
  isPremium: boolean;
};

// ─── Mapeo de enums a español ────────────────────────────

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

const NIVEL_LABELS: Record<string, string> = {
  BASICO: "Básico",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
};

// ─── Component ───────────────────────────────────────────

export function FlashcardViewer({
  flashcards,
  submaterias,
  niveles,
  reviewsToday,
  dailyLimit,
  isPremium,
}: FlashcardViewerProps) {
  const [selectedNivel, setSelectedNivel] = useState<string>("BASICO");
  const [selectedSubmateria, setSelectedSubmateria] = useState<string>("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewsCount, setReviewsCount] = useState(reviewsToday);
  const [limitReached, setLimitReached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Filtrar y ordenar tarjetas
  const filteredCards = useMemo(() => {
    const now = new Date().toISOString();

    // Filtrar por nivel
    let cards = flashcards.filter((c) => c.nivel === selectedNivel);

    // Filtrar por submateria
    if (selectedSubmateria !== "ALL") {
      cards = cards.filter((c) => c.submateria === selectedSubmateria);
    }

    // Ordenar: sin progreso primero, luego pendientes (nextReviewAt <= now), luego el resto
    return [...cards].sort((a, b) => {
      const aScore = !a.progress ? 0 : a.progress.nextReviewAt <= now ? 1 : 2;
      const bScore = !b.progress ? 0 : b.progress.nextReviewAt <= now ? 1 : 2;
      return aScore - bScore;
    });
  }, [flashcards, selectedNivel, selectedSubmateria]);

  const currentCard = filteredCards[currentIndex];
  const totalCards = filteredCards.length;

  // ─── Handlers ──────────────────────────────────────────

  async function handleRate(quality: number) {
    if (!currentCard || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashcardId: currentCard.id,
          quality,
        }),
      });

      const data = await res.json();

      if (data.limit) {
        setLimitReached(true);
        setIsSubmitting(false);
        return;
      }

      setReviewsCount(data.reviewsToday ?? reviewsCount + 1);

      // Avanzar a siguiente tarjeta
      setIsFlipped(false);

      // Pequeño delay para que se vea el unflip antes de cambiar
      setTimeout(() => {
        if (currentIndex + 1 >= totalCards) {
          setCompleted(true);
        } else {
          setCurrentIndex((prev) => prev + 1);
        }
      }, 300);
    } catch (err) {
      console.error("Error al enviar review:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNivelChange(value: string) {
    setSelectedNivel(value);
    setSelectedSubmateria("ALL");
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
  }

  function handleFilterChange(value: string) {
    setSelectedSubmateria(value);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
  }

  // ─── Pantalla: Límite alcanzado ────────────────────────

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
        <p className="mt-2 max-w-sm text-navy/60">
          Has completado {dailyLimit} revisiones hoy. Actualiza a Premium para
          revisiones ilimitadas.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // ─── Pantalla: Sesión completada ───────────────────────

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <svg
            className="h-10 w-10 text-green-600"
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
        <p className="mt-2 text-navy/60">
          Has revisado {reviewsCount} tarjeta{reviewsCount !== 1 ? "s" : ""} hoy.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // ─── Pantalla: Sin tarjetas ────────────────────────────

  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-navy/60">
          No hay tarjetas disponibles para esta materia.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // ─── Pantalla principal ────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Barra superior: volver + contador */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/70 transition-colors hover:text-navy"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Volver
        </Link>
        <span className="text-sm font-medium text-navy/60">
          Tarjeta {currentIndex + 1} de {totalCards}
        </span>
      </div>

      {/* Filtros: nivel + submateria */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedNivel}
          onChange={(e) => handleNivelChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20 sm:w-auto"
        >
          {niveles.map((n) => (
            <option key={n} value={n}>
              {NIVEL_LABELS[n] ?? n}
            </option>
          ))}
        </select>
        <select
          value={selectedSubmateria}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20 sm:w-auto"
        >
          <option value="ALL">Todas las materias</option>
          {submaterias.map((sub) => (
            <option key={sub} value={sub}>
              {SUBMATERIA_LABELS[sub] ?? sub}
            </option>
          ))}
        </select>
      </div>

      {/* Tarjeta flip */}
      <div
        className="perspective cursor-pointer"
        onClick={() => !isSubmitting && setIsFlipped((prev) => !prev)}
      >
        <div
          className={`flip-card-inner min-h-[300px] sm:min-h-[350px] ${
            isFlipped ? "flipped" : ""
          }`}
        >
          {/* Front — Pregunta */}
          <div className="flip-card-front flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-8 shadow-sm">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-gold">
              {SUBMATERIA_LABELS[currentCard.submateria] ??
                currentCard.submateria}
            </div>
            <p className="text-center text-lg font-semibold leading-relaxed text-navy sm:text-xl">
              {currentCard.front}
            </p>
            <p className="mt-6 text-sm text-navy/40">
              Toca para ver la respuesta
            </p>
          </div>

          {/* Back — Respuesta */}
          <div className="flip-card-back flex flex-col items-center justify-center rounded-2xl border-2 border-gold/30 bg-navy p-8 shadow-sm">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-gold/70">
              Respuesta
            </div>
            <p className="text-center text-base leading-relaxed text-paper/90 sm:text-lg">
              {currentCard.back}
            </p>
          </div>
        </div>
      </div>

      {/* Botones de rating (solo visibles tras flip) */}
      <div
        className={`grid grid-cols-3 gap-3 transition-all duration-300 ${
          isFlipped
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <button
          onClick={() => handleRate(0)}
          disabled={isSubmitting || !isFlipped}
          className="flex flex-col items-center gap-1 rounded-xl border border-red-300 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          <span className="text-lg">✗</span>
          <span>No lo sabía</span>
        </button>
        <button
          onClick={() => handleRate(3)}
          disabled={isSubmitting || !isFlipped}
          className="flex flex-col items-center gap-1 rounded-xl border border-gold bg-gold/10 px-4 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"
        >
          <span className="text-lg">~</span>
          <span>Con dificultad</span>
        </button>
        <button
          onClick={() => handleRate(5)}
          disabled={isSubmitting || !isFlipped}
          className="flex flex-col items-center gap-1 rounded-xl border border-green-400 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/20 disabled:opacity-50"
        >
          <span className="text-lg">✓</span>
          <span>Lo sabía</span>
        </button>
      </div>

      {/* Contador de revisiones del día */}
      <div className="border-t border-border pt-4 text-center text-sm text-navy/50">
        Hoy: {reviewsCount}
        {!isPremium ? ` / ${dailyLimit}` : ""} revisiones
      </div>
    </div>
  );
}
