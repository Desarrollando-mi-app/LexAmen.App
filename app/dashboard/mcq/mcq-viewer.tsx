"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ReportButton } from "@/app/components/report-button";
import {
  RAMA_LABELS,
  LIBRO_LABELS,
  DIFICULTAD_LABELS,
  TITULO_LABELS,
} from "@/lib/curriculum-data";
import {
  StudySourceSelector,
  type SourceSelection,
} from "@/app/dashboard/components/study-source-selector";
import { playCorrect, playIncorrect, playXpGained, playStreakBonus, getAnimationsEnabled } from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { Confetti } from "@/app/dashboard/components/confetti";
import { ShareSession } from "@/app/components/share-session";

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
  const [shakeCard, setShakeCard] = useState(false);
  const [scaleCorrectOption, setScaleCorrectOption] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();

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

      // Sound & animation effects
      if (data.isCorrect) {
        playCorrect();
        if (getAnimationsEnabled()) setScaleCorrectOption(data.correctOption);
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
    setSelectedOption(null);
    setFeedback(null);
    setScaleCorrectOption(null);
    if (currentIndex + 1 >= totalCards) setCompleted(true);
    else setCurrentIndex((prev) => prev + 1);
  }

  // ─── Option styles ────────────────────────────────────────

  function getOptionClasses(option: string): string {
    const base = "w-full rounded-[4px] border p-4 text-left transition-all font-archivo text-[14px]";
    if (feedback) {
      if (option === feedback.correctOption)
        return `${base} border-gz-sage bg-gz-sage/[0.06] ring-2 ring-gz-sage/20`;
      if (option === selectedOption && !feedback.isCorrect)
        return `${base} border-gz-burgundy bg-gz-burgundy/[0.06] ring-2 ring-gz-burgundy/20`;
      return `${base} border-gz-rule bg-white opacity-50`;
    }
    if (option === selectedOption)
      return `${base} border-gz-gold bg-gz-gold/[0.06] ring-2 ring-gz-gold/20 cursor-pointer`;
    return `${base} border-gz-rule bg-white hover:border-gz-gold hover:bg-gz-gold/[0.04] cursor-pointer`;
  }

  function getOptionIcon(option: string): React.ReactNode {
    if (feedback) {
      if (option === feedback.correctOption)
        return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-sage text-xs font-bold text-white">&#10003;</span>;
      if (option === selectedOption && !feedback.isCorrect)
        return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-burgundy text-xs font-bold text-white">&#10007;</span>;
    }
    if (option === selectedOption && !feedback)
      return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-gold text-xs font-bold text-white">{option}</span>;
    return <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gz-rule bg-white text-xs font-semibold text-gz-ink-mid">{option}</span>;
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
            {availableTitulos.map((t) => <option key={t} value={t}>{TITULO_LABELS[t] ?? t}</option>)}
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
        items={mcqs}
        contentType="mcq"
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
        <p className="mt-2 font-archivo text-[14px] text-gz-ink-mid">Has completado {dailyLimit} preguntas hoy. Actualiza a Premium para acceso ilimitado.</p>
        <Link href="/dashboard/indice-maestro" className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy">Volver al Indice</Link>
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
        <ShareSession
          modulo="MCQ"
          materia={RAMA_LABELS[selectedRama] ?? undefined}
          titulo={selectedTitulo !== "ALL" ? (TITULO_LABELS[selectedTitulo] ?? selectedTitulo) : undefined}
          total={totalCards}
          correctas={sessionCorrect}
          xp={sessionXP}
        />
        <Link href="/dashboard/indice-maestro" className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy">Volver al Indice</Link>
      </div>
    );
  }

  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FiltersUI />
        <p className="font-cormorant italic text-[17px] text-gz-ink-light text-center">No hay preguntas disponibles para estos filtros.</p>
        <Link href="/dashboard/indice-maestro" className="mt-6 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy">Volver al Indice</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/dashboard/indice-maestro" className="font-archivo text-[13px] font-medium text-gz-ink-mid hover:text-gz-ink transition-colors">Volver al Indice</Link>
        <span className="font-ibm-mono text-[12px] text-gz-ink-light">Pregunta {currentIndex + 1} de {totalCards}</span>
      </div>

      <FiltersUI />

      <Confetti active={showConfetti} color="gold" />

      <div className={`rounded-[4px] border border-gz-rule bg-white p-6 sm:p-8${shakeCard ? " animate-shake" : ""}`}>
        <div className="mb-6 flex items-center justify-between text-sm">
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">Racha: <span className="font-bold text-gz-gold">{streak}</span></span>
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">XP Sesion: <span className="font-bold text-gz-gold">+{sessionXP}</span></span>
        </div>

        <h3 className="mb-6 font-cormorant text-[20px] lg:text-[22px] font-semibold text-gz-ink leading-relaxed">{currentMCQ.question}</h3>

        <div className="space-y-3">
          {OPTION_KEYS.map((key) => {
            const optionText = currentMCQ[`option${key}` as keyof MCQData] as string;
            return (
              <button key={key} onClick={() => handleSelectOption(key)} disabled={!!feedback || isSubmitting} className={`${getOptionClasses(key)}${scaleCorrectOption === key ? " animate-scale-correct" : ""}`}>
                <div className="flex items-start gap-3">
                  {getOptionIcon(key)}
                  <span className="mt-0.5 leading-relaxed text-gz-ink">{optionText}</span>
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={`mt-6 ${feedback.isCorrect ? "border-l-[3px] border-gz-sage bg-gz-sage/[0.06] rounded-[3px] p-4" : "border-l-[3px] border-gz-burgundy bg-gz-burgundy/[0.06] rounded-[3px] p-4"}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{feedback.isCorrect ? "✓" : "✗"}</span>
              <span className={`font-semibold ${feedback.isCorrect ? "text-gz-sage" : "text-gz-burgundy"}`}>{feedback.isCorrect ? "Correcto!" : "Incorrecto"}</span>
              <span className={`ml-auto rounded-full px-2.5 py-0.5 font-bold ${feedback.isCorrect ? "bg-gz-sage/[0.15] text-gz-sage font-ibm-mono text-[11px]" : "bg-gz-burgundy/[0.15] text-gz-burgundy font-ibm-mono text-[11px]"}`}>+{feedback.xpGained} XP</span>
              {feedback.streakBonus > 0 && <span className="ml-1 rounded-full bg-gz-gold/15 px-2.5 py-0.5 font-bold text-gz-gold font-ibm-mono text-[11px]">+{feedback.streakBonus} Bonus Racha</span>}
            </div>
            {!feedback.isCorrect && <p className="mt-2 font-archivo text-[13px] text-gz-burgundy">La respuesta correcta es: <span className="font-semibold">{feedback.correctOption}</span></p>}
            {feedback.explanation && <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid mt-3">{feedback.explanation}</p>}
            <ReportButton contentType="MCQ" contentId={currentMCQ.id} />
          </div>
        )}

        <div className="mt-6 flex justify-center">
          {!feedback ? (
            <button onClick={handleConfirm} disabled={!selectedOption || isSubmitting} className="rounded-[3px] bg-gz-navy px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50">{isSubmitting ? "Verificando..." : "Confirmar"}</button>
          ) : (
            <button onClick={handleNext} className="rounded-[3px] bg-gz-navy px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy">{currentIndex + 1 >= totalCards ? "Ver resultados" : "Siguiente"}</button>
          )}
        </div>
      </div>

      {!isPremium && <p className="mt-4 text-center font-ibm-mono text-[11px] text-gz-ink-light">Hoy: {attemptsCount} / {dailyLimit} preguntas</p>}
    </div>
  );
}
