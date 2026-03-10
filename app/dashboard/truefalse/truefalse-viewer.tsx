"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ReportButton } from "@/app/components/report-button";
import {
  RAMA_LABELS,
  LIBRO_LABELS,
  DIFICULTAD_LABELS,
} from "@/lib/curriculum-data";

// ─── Tipos ─────────────────────────────────────────────────

type TrueFalseData = {
  id: string;
  statement: string;
  isTrue: boolean;
  explanation: string | null;
  rama: string;
  codigo: string;
  libro: string;
  titulo: string;
  parrafo: string | null;
  dificultad: string;
};

type TrueFalseViewerProps = {
  items: TrueFalseData[];
  attemptsToday: number;
  dailyLimit: number;
  isPremium: boolean;
  initialFilters?: {
    rama?: string;
    libro?: string;
    titulo?: string;
    dificultad?: string;
  };
};

// ─── Componente principal ──────────────────────────────────

export function TrueFalseViewer({
  items,
  attemptsToday,
  dailyLimit,
  isPremium,
  initialFilters,
}: TrueFalseViewerProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [selectedRama, setSelectedRama] = useState<string>(
    initialFilters?.rama || "ALL"
  );
  const [selectedLibro, setSelectedLibro] = useState<string>(
    initialFilters?.libro || "ALL"
  );
  const [selectedTitulo, setSelectedTitulo] = useState<string>(
    initialFilters?.titulo || "ALL"
  );
  const [selectedDificultad, setSelectedDificultad] = useState<string>(
    initialFilters?.dificultad || "ALL"
  );

  function updateUrl(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && v !== "ALL") sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctAnswer: boolean;
    explanation: string | null;
    xpGained: number;
    streakBonus: number;
    selectedAnswer: boolean;
  } | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(attemptsToday);
  const [limitReached, setLimitReached] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  // ─── Derived filter options ────────────────────────────

  const availableRamas = useMemo(
    () => Array.from(new Set(items.map((i) => i.rama))),
    [items]
  );
  const availableLibros = useMemo(() => {
    const cards =
      selectedRama !== "ALL"
        ? items.filter((i) => i.rama === selectedRama)
        : items;
    return Array.from(new Set(cards.map((i) => i.libro)));
  }, [items, selectedRama]);
  const availableTitulos = useMemo(() => {
    let cards = items;
    if (selectedRama !== "ALL") cards = cards.filter((i) => i.rama === selectedRama);
    if (selectedLibro !== "ALL") cards = cards.filter((i) => i.libro === selectedLibro);
    return Array.from(new Set(cards.map((i) => i.titulo)));
  }, [items, selectedRama, selectedLibro]);
  const availableDificultades = useMemo(() => {
    let cards = items;
    if (selectedRama !== "ALL") cards = cards.filter((i) => i.rama === selectedRama);
    if (selectedLibro !== "ALL") cards = cards.filter((i) => i.libro === selectedLibro);
    if (selectedTitulo !== "ALL") cards = cards.filter((i) => i.titulo === selectedTitulo);
    return Array.from(new Set(cards.map((i) => i.dificultad)));
  }, [items, selectedRama, selectedLibro, selectedTitulo]);

  // ─── Filtrado ────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    let cards = [...items];
    if (selectedRama !== "ALL") cards = cards.filter((i) => i.rama === selectedRama);
    if (selectedLibro !== "ALL") cards = cards.filter((i) => i.libro === selectedLibro);
    if (selectedTitulo !== "ALL") cards = cards.filter((i) => i.titulo === selectedTitulo);
    if (selectedDificultad !== "ALL") cards = cards.filter((i) => i.dificultad === selectedDificultad);
    return cards;
  }, [items, selectedRama, selectedLibro, selectedTitulo, selectedDificultad]);

  const totalCards = filteredItems.length;
  const currentItem = filteredItems[currentIndex];

  // ─── Handlers ──────────────────────────────────────────

  function resetQuestionState() {
    setCurrentIndex(0);
    setFeedback(null);
    setCompleted(false);
  }

  function handleRamaChange(value: string) {
    setSelectedRama(value);
    setSelectedLibro("ALL");
    setSelectedTitulo("ALL");
    setSelectedDificultad("ALL");
    resetQuestionState();
    updateUrl({ rama: value });
  }

  function handleLibroChange(value: string) {
    setSelectedLibro(value);
    setSelectedTitulo("ALL");
    setSelectedDificultad("ALL");
    resetQuestionState();
    updateUrl({ rama: selectedRama, libro: value });
  }

  function handleTituloChange(value: string) {
    setSelectedTitulo(value);
    setSelectedDificultad("ALL");
    resetQuestionState();
    updateUrl({ rama: selectedRama, libro: selectedLibro, titulo: value });
  }

  function handleDificultadChange(value: string) {
    setSelectedDificultad(value);
    resetQuestionState();
    updateUrl({
      rama: selectedRama,
      libro: selectedLibro,
      titulo: selectedTitulo,
      dificultad: value,
    });
  }

  async function handleAnswer(selectedAnswer: boolean) {
    if (isSubmitting || feedback || !currentItem) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/truefalse/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trueFalseId: currentItem.id, selectedAnswer, streak }),
      });
      const data = await res.json();

      if (data.limit) {
        setLimitReached(true);
        setIsSubmitting(false);
        return;
      }

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
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        xpGained: data.xpGained,
        streakBonus: data.streakBonus ?? 0,
        selectedAnswer,
      });
    } catch {
      // Error de red
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    setFeedback(null);
    if (currentIndex + 1 >= totalCards) setCompleted(true);
    else setCurrentIndex((prev) => prev + 1);
  }

  // ─── Button styles ────────────────────────────────────────

  function getTrueButtonClasses(): string {
    const base = "flex-1 rounded-xl border-2 p-5 text-center font-semibold transition-all";
    if (feedback) {
      if (feedback.correctAnswer === true) return `${base} border-green-400 bg-green-500/10 text-green-700`;
      if (feedback.selectedAnswer === true && !feedback.isCorrect) return `${base} border-red-400 bg-red-500/10 text-red-700`;
      return `${base} border-border bg-white text-navy/30`;
    }
    return `${base} border-green-300 bg-white text-green-700 hover:bg-green-500/10 hover:border-green-400 cursor-pointer`;
  }

  function getFalseButtonClasses(): string {
    const base = "flex-1 rounded-xl border-2 p-5 text-center font-semibold transition-all";
    if (feedback) {
      if (feedback.correctAnswer === false) return `${base} border-green-400 bg-green-500/10 text-green-700`;
      if (feedback.selectedAnswer === false && !feedback.isCorrect) return `${base} border-red-400 bg-red-500/10 text-red-700`;
      return `${base} border-border bg-white text-navy/30`;
    }
    return `${base} border-red-300 bg-white text-red-700 hover:bg-red-500/10 hover:border-red-400 cursor-pointer`;
  }

  // ─── Filters UI ──────────────────────────────────────────

  function FiltersUI() {
    return (
      <div className="mb-6 flex flex-wrap gap-3">
        <select value={selectedRama} onChange={(e) => handleRamaChange(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold">
          <option value="ALL">Todas las ramas</option>
          {availableRamas.map((r) => <option key={r} value={r}>{RAMA_LABELS[r] ?? r}</option>)}
        </select>
        <select value={selectedLibro} onChange={(e) => handleLibroChange(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold">
          <option value="ALL">Todos los libros</option>
          {availableLibros.map((l) => <option key={l} value={l}>{LIBRO_LABELS[l] ?? l}</option>)}
        </select>
        {availableTitulos.length > 0 && (
          <select value={selectedTitulo} onChange={(e) => handleTituloChange(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold">
            <option value="ALL">Todos los titulos</option>
            {availableTitulos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {availableDificultades.length > 1 && (
          <select value={selectedDificultad} onChange={(e) => handleDificultadChange(e.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold">
            <option value="ALL">Toda dificultad</option>
            {availableDificultades.map((d) => <option key={d} value={d}>{DIFICULTAD_LABELS[d] ?? d}</option>)}
          </select>
        )}
      </div>
    );
  }

  // ─── Screens ─────────────────────────────────────────────

  if (limitReached && !isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/10">
          <svg className="h-10 w-10 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-navy">Limite diario alcanzado</h2>
        <p className="mt-2 text-navy/60">Has completado {dailyLimit} afirmaciones hoy. Actualiza a Premium para acceso ilimitado.</p>
        <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper hover:bg-navy/90">Volver al Dashboard</Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-navy">Sesion completada!</h2>
        <div className="mt-6 grid grid-cols-3 gap-6 text-center">
          <div><p className="text-2xl font-bold text-gold">{sessionCorrect}/{totalCards}</p><p className="text-sm text-navy/50">Correctas</p></div>
          <div><p className="text-2xl font-bold text-gold">+{sessionXP}</p><p className="text-sm text-navy/50">XP Ganados</p></div>
          <div><p className="text-2xl font-bold text-gold">{bestStreak}</p><p className="text-sm text-navy/50">Mejor Racha</p></div>
        </div>
        <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper hover:bg-navy/90">Volver al Dashboard</Link>
      </div>
    );
  }

  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FiltersUI />
        <p className="text-lg text-navy/60">No hay afirmaciones disponibles para estos filtros.</p>
        <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper hover:bg-navy/90">Volver al Dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-medium text-navy/60 hover:text-navy">Volver</Link>
        <span className="text-sm font-medium text-navy/60">Afirmacion {currentIndex + 1} de {totalCards}</span>
      </div>

      <FiltersUI />

      <div className="rounded-xl border border-border bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between text-sm">
          <span className="font-medium text-navy/60">Racha: <span className="font-bold text-orange-500">{streak}</span></span>
          <span className="font-medium text-navy/60">XP Sesion: <span className="font-bold text-gold">+{sessionXP}</span></span>
        </div>

        <h3 className="mb-8 text-lg font-semibold leading-relaxed text-navy">{currentItem.statement}</h3>

        <div className="flex gap-4">
          <button onClick={() => handleAnswer(true)} disabled={!!feedback || isSubmitting} className={getTrueButtonClasses()}>
            <span className="text-2xl">&#10003;</span><p className="mt-1">Verdadero</p>
          </button>
          <button onClick={() => handleAnswer(false)} disabled={!!feedback || isSubmitting} className={getFalseButtonClasses()}>
            <span className="text-2xl">&#10007;</span><p className="mt-1">Falso</p>
          </button>
        </div>

        {isSubmitting && <p className="mt-4 text-center text-sm text-navy/40">Verificando...</p>}

        {feedback && (
          <div className={`mt-6 rounded-lg p-4 ${feedback.isCorrect ? "border border-green-200 bg-green-50" : "border border-red-200 bg-red-50"}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{feedback.isCorrect ? "&#10003;" : "&#10007;"}</span>
              <span className={`font-semibold ${feedback.isCorrect ? "text-green-700" : "text-red-700"}`}>{feedback.isCorrect ? "Correcto!" : "Incorrecto"}</span>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${feedback.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>+{feedback.xpGained} XP</span>
              {feedback.streakBonus > 0 && <span className="ml-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold">+{feedback.streakBonus} Bonus Racha</span>}
            </div>
            {!feedback.isCorrect && <p className="mt-2 text-sm text-red-600">La respuesta correcta es: <span className="font-semibold">{feedback.correctAnswer ? "Verdadero" : "Falso"}</span></p>}
            {feedback.explanation && <p className="mt-3 text-sm leading-relaxed text-navy/70">{feedback.explanation}</p>}
            <ReportButton contentType="TRUEFALSE" contentId={currentItem.id} />
          </div>
        )}

        {feedback && (
          <div className="mt-6 flex justify-center">
            <button onClick={handleNext} className="rounded-lg bg-navy px-8 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90">{currentIndex + 1 >= totalCards ? "Ver resultados" : "Siguiente"}</button>
          </div>
        )}
      </div>

      {!isPremium && <p className="mt-4 text-center text-xs text-navy/40">Hoy: {attemptsCount} / {dailyLimit} afirmaciones</p>}
    </div>
  );
}
