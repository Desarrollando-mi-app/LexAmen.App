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

type MCQData = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
  rama: string;
  codigo: string;
  libro: string;
  titulo: string;
  parrafo: string | null;
  dificultad: string;
};

type MCQViewerProps = {
  mcqs: MCQData[];
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

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

// ─── Componente principal ──────────────────────────────────

export function MCQViewer({
  mcqs,
  attemptsToday,
  dailyLimit,
  isPremium,
  initialFilters,
}: MCQViewerProps) {
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctOption: string;
    explanation: string | null;
    xpGained: number;
    streakBonus: number;
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
    () => Array.from(new Set(mcqs.map((m) => m.rama))),
    [mcqs]
  );
  const availableLibros = useMemo(() => {
    const cards =
      selectedRama !== "ALL"
        ? mcqs.filter((m) => m.rama === selectedRama)
        : mcqs;
    return Array.from(new Set(cards.map((m) => m.libro)));
  }, [mcqs, selectedRama]);
  const availableTitulos = useMemo(() => {
    let cards = mcqs;
    if (selectedRama !== "ALL") cards = cards.filter((m) => m.rama === selectedRama);
    if (selectedLibro !== "ALL") cards = cards.filter((m) => m.libro === selectedLibro);
    return Array.from(new Set(cards.map((m) => m.titulo)));
  }, [mcqs, selectedRama, selectedLibro]);
  const availableDificultades = useMemo(() => {
    let cards = mcqs;
    if (selectedRama !== "ALL") cards = cards.filter((m) => m.rama === selectedRama);
    if (selectedLibro !== "ALL") cards = cards.filter((m) => m.libro === selectedLibro);
    if (selectedTitulo !== "ALL") cards = cards.filter((m) => m.titulo === selectedTitulo);
    return Array.from(new Set(cards.map((m) => m.dificultad)));
  }, [mcqs, selectedRama, selectedLibro, selectedTitulo]);

  // ─── Filtrado ────────────────────────────────────────────

  const filteredMCQs = useMemo(() => {
    let cards = [...mcqs];
    if (selectedRama !== "ALL") cards = cards.filter((m) => m.rama === selectedRama);
    if (selectedLibro !== "ALL") cards = cards.filter((m) => m.libro === selectedLibro);
    if (selectedTitulo !== "ALL") cards = cards.filter((m) => m.titulo === selectedTitulo);
    if (selectedDificultad !== "ALL") cards = cards.filter((m) => m.dificultad === selectedDificultad);
    return cards;
  }, [mcqs, selectedRama, selectedLibro, selectedTitulo, selectedDificultad]);

  const totalCards = filteredMCQs.length;
  const currentMCQ = filteredMCQs[currentIndex];

  // ─── Handlers de filtro ──────────────────────────────────

  function resetQuestionState() {
    setCurrentIndex(0);
    setSelectedOption(null);
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
        body: JSON.stringify({ mcqId: currentMCQ.id, selectedOption, streak }),
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
        correctOption: data.correctOption,
        explanation: data.explanation,
        xpGained: data.xpGained,
        streakBonus: data.streakBonus ?? 0,
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
    if (currentIndex + 1 >= totalCards) setCompleted(true);
    else setCurrentIndex((prev) => prev + 1);
  }

  // ─── Option styles ────────────────────────────────────────

  function getOptionClasses(option: string): string {
    const base = "w-full rounded-xl border p-4 text-left transition-all text-sm";
    if (feedback) {
      if (option === feedback.correctOption)
        return `${base} border-green-400 bg-green-500/10 ring-2 ring-green-400/20`;
      if (option === selectedOption && !feedback.isCorrect)
        return `${base} border-red-400 bg-red-500/10 ring-2 ring-red-400/20`;
      return `${base} border-border bg-white opacity-50`;
    }
    if (option === selectedOption)
      return `${base} border-gold bg-gold/5 ring-2 ring-gold/20 cursor-pointer`;
    return `${base} border-border bg-white hover:border-gold/50 cursor-pointer`;
  }

  function getOptionIcon(option: string): React.ReactNode {
    if (feedback) {
      if (option === feedback.correctOption)
        return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">&#10003;</span>;
      if (option === selectedOption && !feedback.isCorrect)
        return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">&#10007;</span>;
    }
    if (option === selectedOption && !feedback)
      return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-xs font-bold text-white">{option}</span>;
    return <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-xs font-semibold text-navy/60">{option}</span>;
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
        <p className="mt-2 text-navy/60">Has completado {dailyLimit} preguntas hoy. Actualiza a Premium para acceso ilimitado.</p>
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
        <p className="text-lg text-navy/60">No hay preguntas disponibles para estos filtros.</p>
        <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper hover:bg-navy/90">Volver al Dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="text-sm font-medium text-navy/60 hover:text-navy">Volver</Link>
        <span className="text-sm font-medium text-navy/60">Pregunta {currentIndex + 1} de {totalCards}</span>
      </div>

      <FiltersUI />

      <div className="rounded-xl border border-border bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between text-sm">
          <span className="font-medium text-navy/60">Racha: <span className="font-bold text-orange-500">{streak}</span></span>
          <span className="font-medium text-navy/60">XP Sesion: <span className="font-bold text-gold">+{sessionXP}</span></span>
        </div>

        <h3 className="mb-6 text-lg font-semibold leading-relaxed text-navy">{currentMCQ.question}</h3>

        <div className="space-y-3">
          {OPTION_KEYS.map((key) => {
            const optionText = currentMCQ[`option${key}` as keyof MCQData] as string;
            return (
              <button key={key} onClick={() => handleSelectOption(key)} disabled={!!feedback || isSubmitting} className={getOptionClasses(key)}>
                <div className="flex items-start gap-3">
                  {getOptionIcon(key)}
                  <span className="mt-0.5 leading-relaxed text-navy">{optionText}</span>
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={`mt-6 rounded-lg p-4 ${feedback.isCorrect ? "border border-green-200 bg-green-50" : "border border-red-200 bg-red-50"}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{feedback.isCorrect ? "&#10003;" : "&#10007;"}</span>
              <span className={`font-semibold ${feedback.isCorrect ? "text-green-700" : "text-red-700"}`}>{feedback.isCorrect ? "Correcto!" : "Incorrecto"}</span>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${feedback.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>+{feedback.xpGained} XP</span>
              {feedback.streakBonus > 0 && <span className="ml-1 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold">+{feedback.streakBonus} Bonus Racha</span>}
            </div>
            {!feedback.isCorrect && <p className="mt-2 text-sm text-red-600">La respuesta correcta es: <span className="font-semibold">{feedback.correctOption}</span></p>}
            {feedback.explanation && <p className="mt-3 text-sm leading-relaxed text-navy/70">{feedback.explanation}</p>}
            <ReportButton contentType="MCQ" contentId={currentMCQ.id} />
          </div>
        )}

        <div className="mt-6 flex justify-center">
          {!feedback ? (
            <button onClick={handleConfirm} disabled={!selectedOption || isSubmitting} className="rounded-lg bg-navy px-8 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90 disabled:opacity-50">{isSubmitting ? "Verificando..." : "Confirmar"}</button>
          ) : (
            <button onClick={handleNext} className="rounded-lg bg-navy px-8 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90">{currentIndex + 1 >= totalCards ? "Ver resultados" : "Siguiente"}</button>
          )}
        </div>
      </div>

      {!isPremium && <p className="mt-4 text-center text-xs text-navy/40">Hoy: {attemptsCount} / {dailyLimit} preguntas</p>}
    </div>
  );
}
