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
import {
  StudySourceSelector,
  type SourceSelection,
} from "@/app/dashboard/components/study-source-selector";
import { playCorrect, playIncorrect, playXpGained, playStreakBonus, getAnimationsEnabled } from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { Confetti } from "@/app/dashboard/components/confetti";

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
  const [shakeCard, setShakeCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();

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

      // Sound & animation effects
      if (data.isCorrect) {
        playCorrect();
        if (data.xpGained > 0) {
          setTimeout(() => {
            playXpGained();
            showXpFloat(data.xpGained + (data.streakBonus ?? 0));
          }, 300);
        }
        const newStreak = streak + 1;
        if (newStreak >= 5 && newStreak % 5 === 0) {
          setTimeout(() => {
            playStreakBonus();
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 2500);
          }, 500);
        }
      } else {
        playIncorrect();
        if (getAnimationsEnabled()) {
          setShakeCard(true);
          setTimeout(() => setShakeCard(false), 500);
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
    const base = "flex-1 rounded-[4px] p-5 text-center font-semibold transition-all";
    if (feedback) {
      if (feedback.correctAnswer === true) return `${base} border-gz-sage bg-gz-sage text-white`;
      if (feedback.selectedAnswer === true && !feedback.isCorrect) return `${base} border-gz-burgundy bg-gz-burgundy text-white`;
      return `${base} border-gz-rule bg-white text-gz-ink-light opacity-30`;
    }
    return `${base} border-2 border-gz-sage text-gz-sage hover:bg-gz-sage hover:text-white cursor-pointer font-archivo text-[16px] font-bold uppercase tracking-[1px]`;
  }

  function getFalseButtonClasses(): string {
    const base = "flex-1 rounded-[4px] p-5 text-center font-semibold transition-all";
    if (feedback) {
      if (feedback.correctAnswer === false) return `${base} border-gz-sage bg-gz-sage text-white`;
      if (feedback.selectedAnswer === false && !feedback.isCorrect) return `${base} border-gz-burgundy bg-gz-burgundy text-white`;
      return `${base} border-gz-rule bg-white text-gz-ink-light opacity-30`;
    }
    return `${base} border-2 border-gz-burgundy text-gz-burgundy hover:bg-gz-burgundy hover:text-white cursor-pointer font-archivo text-[16px] font-bold uppercase tracking-[1px]`;
  }

  // ─── Filters UI ──────────────────────────────────────────

  function FiltersUI() {
    return (
      <div className="mb-6 flex flex-wrap gap-3">
        <select value={selectedRama} onChange={(e) => handleRamaChange(e.target.value)} className="rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors">
          <option value="ALL">Todas las ramas</option>
          {availableRamas.map((r) => <option key={r} value={r}>{RAMA_LABELS[r] ?? r}</option>)}
        </select>
        <select value={selectedLibro} onChange={(e) => handleLibroChange(e.target.value)} className="rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors">
          <option value="ALL">Todos los libros</option>
          {availableLibros.map((l) => <option key={l} value={l}>{LIBRO_LABELS[l] ?? l}</option>)}
        </select>
        {availableTitulos.length > 0 && (
          <select value={selectedTitulo} onChange={(e) => handleTituloChange(e.target.value)} className="rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors">
            <option value="ALL">Todos los titulos</option>
            {availableTitulos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {availableDificultades.length > 1 && (
          <select value={selectedDificultad} onChange={(e) => handleDificultadChange(e.target.value)} className="rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors">
            <option value="ALL">Toda dificultad</option>
            {availableDificultades.map((d) => <option key={d} value={d}>{DIFICULTAD_LABELS[d] ?? d}</option>)}
          </select>
        )}
      </div>
    );
  }

  // ─── Source selector screen ─────────────────────────────

  if (showSelector) {
    return (
      <StudySourceSelector
        items={items}
        contentType="vf"
        onStart={(sel: SourceSelection) => {
          setSelectedRama(sel.rama);
          setSelectedLibro(sel.libro);
          setSelectedTitulo(sel.titulo);
          setSelectedDificultad("ALL");
          resetQuestionState();
          updateUrl({ rama: sel.rama, libro: sel.libro, titulo: sel.titulo });
          setShowSelector(false);
        }}
        onStudyAll={() => {
          setSelectedRama("ALL");
          setSelectedLibro("ALL");
          setSelectedTitulo("ALL");
          setSelectedDificultad("ALL");
          resetQuestionState();
          setShowSelector(false);
        }}
      />
    );
  }

  // ─── Screens ─────────────────────────────────────────────

  if (limitReached && !isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gz-gold/10">
          <svg className="h-10 w-10 text-gz-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
        </div>
        <h2 className="mt-6 font-cormorant text-[28px] !font-bold text-gz-ink">Limite diario alcanzado</h2>
        <p className="mt-2 font-archivo text-[14px] text-gz-ink-mid">Has completado {dailyLimit} afirmaciones hoy. Actualiza a Premium para acceso ilimitado.</p>
        <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy">Volver al Dashboard</Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gz-sage/10">
          <svg className="h-10 w-10 text-gz-sage" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h2 className="mt-6 font-cormorant text-[28px] !font-bold text-gz-ink">Sesion completada!</h2>
        <div className="mt-6 grid grid-cols-3 gap-6 text-center">
          <div><p className="font-cormorant text-[36px] !font-bold text-gz-gold">{sessionCorrect}/{totalCards}</p><p className="font-ibm-mono text-[11px] text-gz-ink-light uppercase tracking-[1px]">Correctas</p></div>
          <div><p className="font-cormorant text-[36px] !font-bold text-gz-gold">+{sessionXP}</p><p className="font-ibm-mono text-[11px] text-gz-ink-light uppercase tracking-[1px]">XP Ganados</p></div>
          <div><p className="font-cormorant text-[36px] !font-bold text-gz-gold">{bestStreak}</p><p className="font-ibm-mono text-[11px] text-gz-ink-light uppercase tracking-[1px]">Mejor Racha</p></div>
        </div>
        <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy">Volver al Dashboard</Link>
      </div>
    );
  }

  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FiltersUI />
        <p className="font-cormorant italic text-[17px] text-gz-ink-light text-center">No hay afirmaciones disponibles para estos filtros.</p>
        <Link href="/dashboard" className="mt-6 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy">Volver al Dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard" className="font-archivo text-[13px] font-medium text-gz-ink-mid hover:text-gz-ink transition-colors">Volver</Link>
        <span className="font-ibm-mono text-[12px] text-gz-ink-light">Afirmacion {currentIndex + 1} de {totalCards}</span>
      </div>

      <FiltersUI />

      <Confetti active={showConfetti} color="gold" />

      <div className={`rounded-[4px] border border-gz-rule bg-white p-6 sm:p-8${shakeCard ? " animate-shake" : ""}`}>
        <div className="mb-6 flex items-center justify-between text-sm">
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">Racha: <span className="font-bold text-gz-gold">{streak}</span></span>
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">XP Sesion: <span className="font-bold text-gz-gold">+{sessionXP}</span></span>
        </div>

        <h3 className="mb-8 font-cormorant text-[20px] lg:text-[22px] text-gz-ink leading-relaxed text-center">{currentItem.statement}</h3>

        <div className="flex gap-4">
          <button onClick={() => handleAnswer(true)} disabled={!!feedback || isSubmitting} className={getTrueButtonClasses()}>
            <span className="text-2xl">&#10003;</span><p className="mt-1">Verdadero</p>
          </button>
          <button onClick={() => handleAnswer(false)} disabled={!!feedback || isSubmitting} className={getFalseButtonClasses()}>
            <span className="text-2xl">&#10007;</span><p className="mt-1">Falso</p>
          </button>
        </div>

        {isSubmitting && <p className="mt-4 text-center font-archivo text-[13px] text-gz-ink-light">Verificando...</p>}

        {feedback && (
          <div className={`mt-6 ${feedback.isCorrect ? "border-l-[3px] border-gz-sage bg-gz-sage/[0.06] rounded-[3px] p-4" : "border-l-[3px] border-gz-burgundy bg-gz-burgundy/[0.06] rounded-[3px] p-4"}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{feedback.isCorrect ? "&#10003;" : "&#10007;"}</span>
              <span className={`font-semibold ${feedback.isCorrect ? "text-gz-sage" : "text-gz-burgundy"}`}>{feedback.isCorrect ? "Correcto!" : "Incorrecto"}</span>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${feedback.isCorrect ? "bg-gz-sage/[0.15] text-gz-sage font-ibm-mono text-[11px]" : "bg-gz-burgundy/[0.15] text-gz-burgundy font-ibm-mono text-[11px]"}`}>+{feedback.xpGained} XP</span>
              {feedback.streakBonus > 0 && <span className="ml-1 rounded-full bg-gz-gold/15 px-2.5 py-0.5 text-xs font-bold text-gz-gold font-ibm-mono text-[11px]">+{feedback.streakBonus} Bonus Racha</span>}
            </div>
            {!feedback.isCorrect && <p className="mt-2 font-archivo text-[13px] text-gz-burgundy">La respuesta correcta es: <span className="font-semibold">{feedback.correctAnswer ? "Verdadero" : "Falso"}</span></p>}
            {feedback.explanation && <p className="mt-3 font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid">{feedback.explanation}</p>}
            <ReportButton contentType="TRUEFALSE" contentId={currentItem.id} />
          </div>
        )}

        {feedback && (
          <div className="mt-6 flex justify-center">
            <button onClick={handleNext} className="rounded-[3px] bg-gz-navy px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy">{currentIndex + 1 >= totalCards ? "Ver resultados" : "Siguiente"}</button>
          </div>
        )}
      </div>

      {!isPremium && <p className="mt-4 text-center font-ibm-mono text-[11px] text-gz-ink-light">Hoy: {attemptsCount} / {dailyLimit} afirmaciones</p>}
    </div>
  );
}
