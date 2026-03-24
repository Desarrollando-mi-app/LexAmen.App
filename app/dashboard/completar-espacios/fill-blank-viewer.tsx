"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ReportButton } from "@/app/components/report-button";
import {
  RAMA_LABELS,
  LIBRO_LABELS,
  TITULO_LABELS,
} from "@/lib/curriculum-data";
import {
  StudySourceSelector,
  type SourceSelection,
} from "@/app/dashboard/components/study-source-selector";
import {
  playCorrect,
  playIncorrect,
  playXpGained,
  getAnimationsEnabled,
} from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { Confetti } from "@/app/dashboard/components/confetti";
import { ShareSession } from "@/app/components/share-session";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type BlankOption = {
  id: number;
  opciones: string[];
};

type FillBlankItem = {
  id: string;
  textoConBlancos: string;
  blancos: string; // JSON string
  explicacion: string | null;
  rama: string;
  libro: string | null;
  titulo: string | null;
  materia: string | null;
  dificultad: number;
};

type FillBlankViewerProps = {
  items: FillBlankItem[];
  attemptsToday: number;
  dailyLimit: number;
  isPremium: boolean;
  initialFilters?: {
    rama?: string;
    libro?: string;
    titulo?: string;
  };
};

type BlankResult = {
  blancoId: number;
  respuesta: string;
  correcta: string;
  esCorrecta: boolean;
};

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function FillBlankViewer({
  items,
  attemptsToday,
  dailyLimit,
  isPremium,
  initialFilters,
}: FillBlankViewerProps) {
  const router = useRouter();
  const pathname = usePathname();

  // ─── Source selector state ──────────────────────────────
  const [showSelector, setShowSelector] = useState(
    !initialFilters?.rama && !initialFilters?.libro && !initialFilters?.titulo,
  );

  // ─── Filter state ──────────────────────────────────────
  const [selectedRama, setSelectedRama] = useState<string>(
    initialFilters?.rama || "ALL",
  );
  const [selectedLibro, setSelectedLibro] = useState<string>(
    initialFilters?.libro || "ALL",
  );
  const [selectedTitulo, setSelectedTitulo] = useState<string>(
    initialFilters?.titulo || "ALL",
  );

  // ─── Question state ─────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    resultados: BlankResult[];
    todosCorrectos: boolean;
    correctCount: number;
    totalBlancos: number;
    explicacion: string | null;
    xpGained: number;
  } | null>(null);
  const [attemptsCount, setAttemptsCount] = useState(attemptsToday);
  const [limitReached, setLimitReached] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [shakeCard, setShakeCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();

  // ─── URL sync ──────────────────────────────────────────
  function updateUrl(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v && v !== "ALL") sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // ─── Derived filter options ─────────────────────────────
  const availableRamas = useMemo(
    () => Array.from(new Set(items.map((m) => m.rama))),
    [items],
  );

  const availableLibros = useMemo(() => {
    const cards =
      selectedRama !== "ALL"
        ? items.filter((m) => m.rama === selectedRama)
        : items;
    return Array.from(new Set(cards.map((m) => m.libro).filter(Boolean))) as string[];
  }, [items, selectedRama]);

  const availableTitulos = useMemo(() => {
    let cards = items as FillBlankItem[];
    if (selectedRama !== "ALL") cards = cards.filter((m) => m.rama === selectedRama);
    if (selectedLibro !== "ALL") cards = cards.filter((m) => m.libro === selectedLibro);
    return Array.from(new Set(cards.map((m) => m.titulo).filter(Boolean))) as string[];
  }, [items, selectedRama, selectedLibro]);

  // ─── Filtered items ────────────────────────────────────
  const filteredItems = useMemo(() => {
    let cards = [...items];
    if (selectedRama !== "ALL") cards = cards.filter((m) => m.rama === selectedRama);
    if (selectedLibro !== "ALL") cards = cards.filter((m) => m.libro === selectedLibro);
    if (selectedTitulo !== "ALL") cards = cards.filter((m) => m.titulo === selectedTitulo);
    // Shuffle for variety
    return cards.sort(() => Math.random() - 0.5);
  }, [items, selectedRama, selectedLibro, selectedTitulo]);

  const totalCards = filteredItems.length;
  const currentItem = filteredItems[currentIndex];

  // Parse blancos for current item
  const currentBlancos: BlankOption[] = useMemo(() => {
    if (!currentItem) return [];
    try {
      const parsed = JSON.parse(currentItem.blancos);
      // Shuffle options per blank
      return parsed.map((b: { id: number; opciones?: string[]; correcta?: string }) => ({
        id: b.id,
        opciones: [...(b.opciones || [])].sort(() => Math.random() - 0.5),
      }));
    } catch {
      return [];
    }
  }, [currentItem]);

  // ─── Parse text with blanks ─────────────────────────────
  // Splits "El articulo {1} del CC establece que {2}..." into segments
  function parseTextWithBlanks(text: string): { type: "text" | "blank"; value: string; blankId?: number }[] {
    const segments: { type: "text" | "blank"; value: string; blankId?: number }[] = [];
    const regex = /\{(\d+)\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      segments.push({ type: "blank", value: `Espacio ${match[1]}`, blankId: parseInt(match[1]) });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push({ type: "text", value: text.slice(lastIndex) });
    }

    return segments;
  }

  // ─── Filter handlers ────────────────────────────────────
  function resetQuestionState() {
    setCurrentIndex(0);
    setSelections({});
    setFeedback(null);
    setCompleted(false);
  }

  function handleRamaChange(value: string) {
    setSelectedRama(value);
    setSelectedLibro("ALL");
    setSelectedTitulo("ALL");
    resetQuestionState();
    updateUrl({ rama: value });
  }

  function handleLibroChange(value: string) {
    setSelectedLibro(value);
    setSelectedTitulo("ALL");
    resetQuestionState();
    updateUrl({ rama: selectedRama, libro: value });
  }

  function handleTituloChange(value: string) {
    setSelectedTitulo(value);
    resetQuestionState();
    updateUrl({ rama: selectedRama, libro: selectedLibro, titulo: value });
  }

  // ─── Selection handlers ─────────────────────────────────
  function handleSelectOption(blancoId: number, value: string) {
    if (feedback || isSubmitting) return;
    setSelections((prev) => ({ ...prev, [blancoId]: value }));
  }

  const allBlanksAnswered = currentBlancos.every((b) => selections[b.id] !== undefined);

  // ─── Submit answer ──────────────────────────────────────
  async function handleConfirm() {
    if (!allBlanksAnswered || isSubmitting || feedback || !currentItem) return;
    setIsSubmitting(true);

    try {
      const respuestas = currentBlancos.map((b) => ({
        blancoId: b.id,
        respuesta: selections[b.id] || "",
      }));

      const res = await fetch("/api/fill-blank/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fillBlankId: currentItem.id, respuestas }),
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

      if (data.todosCorrectos) {
        setSessionCorrect((prev) => prev + 1);
      }

      setFeedback({
        resultados: data.resultados,
        todosCorrectos: data.todosCorrectos,
        correctCount: data.correctCount,
        totalBlancos: data.totalBlancos,
        explicacion: data.explicacion,
        xpGained: data.xpGained,
      });

      // Sound & animation effects
      if (data.todosCorrectos) {
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
    setSelections({});
    setFeedback(null);
    if (currentIndex + 1 >= totalCards) setCompleted(true);
    else setCurrentIndex((prev) => prev + 1);
  }

  // ─── Option styles ──────────────────────────────────────
  function getOptionClasses(blancoId: number, option: string): string {
    const base =
      "rounded-[4px] border px-3 py-2 text-left transition-all font-archivo text-[13px]";

    if (feedback) {
      const result = feedback.resultados.find((r) => r.blancoId === blancoId);
      if (!result) return `${base} border-gz-rule bg-white opacity-50`;

      if (option === result.correcta) {
        return `${base} border-gz-sage bg-gz-sage/[0.06] ring-2 ring-gz-sage/20`;
      }
      if (option === result.respuesta && !result.esCorrecta) {
        return `${base} border-gz-burgundy bg-gz-burgundy/[0.06] ring-2 ring-gz-burgundy/20`;
      }
      return `${base} border-gz-rule bg-white opacity-50`;
    }

    if (selections[blancoId] === option) {
      return `${base} border-gz-gold bg-gz-gold/[0.06] ring-2 ring-gz-gold/20 cursor-pointer`;
    }
    return `${base} border-gz-rule bg-white hover:border-gz-gold hover:bg-gz-gold/[0.04] cursor-pointer`;
  }

  function getOptionIcon(blancoId: number, option: string): React.ReactNode {
    if (feedback) {
      const result = feedback.resultados.find((r) => r.blancoId === blancoId);
      if (result) {
        if (option === result.correcta) {
          return (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gz-sage text-[10px] font-bold text-white">
              &#10003;
            </span>
          );
        }
        if (option === result.respuesta && !result.esCorrecta) {
          return (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gz-burgundy text-[10px] font-bold text-white">
              &#10007;
            </span>
          );
        }
      }
    }

    if (selections[blancoId] === option && !feedback) {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gz-gold">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      );
    }

    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gz-rule bg-white" />
    );
  }

  // ─── Filters UI ─────────────────────────────────────────
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

        <select
          value={selectedLibro}
          onChange={(e) => handleLibroChange(e.target.value)}
          className="rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors"
        >
          <option value="ALL">Todos los libros</option>
          {availableLibros.map((l) => (
            <option key={l} value={l}>
              {LIBRO_LABELS[l] ?? l}
            </option>
          ))}
        </select>

        {availableTitulos.length > 0 && (
          <select
            value={selectedTitulo}
            onChange={(e) => handleTituloChange(e.target.value)}
            className="rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors"
          >
            <option value="ALL">Todos los titulos</option>
            {availableTitulos.map((t) => (
              <option key={t} value={t}>
                {TITULO_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  // ─── Source selector screen ─────────────────────────────

  if (showSelector) {
    return (
      <StudySourceSelector
        items={items as { rama: string; libro?: string | null; titulo?: string | null }[]}
        contentType="mcq"
        onStart={(sel: SourceSelection) => {
          setSelectedRama(sel.rama);
          setSelectedLibro(sel.libro);
          setSelectedTitulo(sel.titulo);
          resetQuestionState();
          updateUrl({ rama: sel.rama, libro: sel.libro, titulo: sel.titulo });
          setShowSelector(false);
        }}
        onStudyAll={() => {
          setSelectedRama("ALL");
          setSelectedLibro("ALL");
          setSelectedTitulo("ALL");
          resetQuestionState();
          setShowSelector(false);
        }}
      />
    );
  }

  // ─── Limit reached screen ──────────────────────────────

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

  // ─── Completion screen ─────────────────────────────────

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
              {sessionCorrect}/{sessionTotal}
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
          modulo="Completar Espacios"
          materia={RAMA_LABELS[selectedRama] ?? undefined}
          total={sessionTotal}
          correctas={sessionCorrect}
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

  // ─── Empty state ────────────────────────────────────────

  if (totalCards === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FiltersUI />
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

  // ─── Main question view ─────────────────────────────────

  const textSegments = parseTextWithBlanks(currentItem.textoConBlancos);

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

      <FiltersUI />

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
            <span className="font-bold text-gz-gold">{sessionCorrect}</span>
          </span>
          <span className="font-ibm-mono text-[12px] text-gz-ink-mid">
            XP Sesion:{" "}
            <span className="font-bold text-gz-gold">+{sessionXP}</span>
          </span>
        </div>

        {/* ─── Text with blank placeholders ──────────────── */}
        <div className="mb-6 font-cormorant text-[18px] lg:text-[20px] leading-relaxed text-gz-ink">
          {textSegments.map((seg, i) =>
            seg.type === "text" ? (
              <Fragment key={i}>{seg.value}</Fragment>
            ) : (
              <span
                key={i}
                className={`inline-block mx-1 px-2 py-0.5 rounded font-ibm-mono text-[13px] font-semibold ${
                  feedback
                    ? (() => {
                        const result = feedback.resultados.find(
                          (r) => r.blancoId === seg.blankId,
                        );
                        if (!result) return "bg-gz-gold/10 text-gz-gold";
                        if (result.esCorrecta)
                          return "bg-gz-sage/10 text-gz-sage border border-gz-sage/30";
                        return "bg-gz-burgundy/10 text-gz-burgundy border border-gz-burgundy/30";
                      })()
                    : selections[seg.blankId!]
                      ? "bg-gz-gold/10 text-gz-gold border border-gz-gold/30"
                      : "bg-gz-cream text-gz-ink-mid border border-gz-rule border-dashed"
                }`}
              >
                {feedback
                  ? (() => {
                      const result = feedback.resultados.find(
                        (r) => r.blancoId === seg.blankId,
                      );
                      if (!result) return `[ ___ ]`;
                      if (result.esCorrecta) return result.correcta;
                      return selections[seg.blankId!] || `[ ___ ]`;
                    })()
                  : selections[seg.blankId!] || `[ ___ ]`}
              </span>
            ),
          )}
        </div>

        {/* ─── Radio buttons per blank ────────────────────── */}
        <div className="space-y-5">
          {currentBlancos.map((blanco) => (
            <div key={blanco.id}>
              <p className="mb-2 font-ibm-mono text-[11px] uppercase tracking-[1px] text-gz-ink-light">
                Espacio {blanco.id}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {blanco.opciones.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(blanco.id, option)}
                    disabled={!!feedback || isSubmitting}
                    className={getOptionClasses(blanco.id, option)}
                  >
                    <div className="flex items-center gap-2">
                      {getOptionIcon(blanco.id, option)}
                      <span className="leading-snug text-gz-ink">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Feedback panel ────────────────────────────── */}
        {feedback && (
          <div
            className={`mt-6 ${
              feedback.todosCorrectos
                ? "border-l-[3px] border-gz-sage bg-gz-sage/[0.06] rounded-[3px] p-4"
                : "border-l-[3px] border-gz-burgundy bg-gz-burgundy/[0.06] rounded-[3px] p-4"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {feedback.todosCorrectos ? "\u2713" : "\u2717"}
              </span>
              <span
                className={`font-semibold ${
                  feedback.todosCorrectos ? "text-gz-sage" : "text-gz-burgundy"
                }`}
              >
                {feedback.todosCorrectos
                  ? "Todos correctos!"
                  : `${feedback.correctCount}/${feedback.totalBlancos} correctos`}
              </span>
              <span
                className={`ml-auto rounded-full px-2.5 py-0.5 font-bold ${
                  feedback.todosCorrectos
                    ? "bg-gz-sage/[0.15] text-gz-sage font-ibm-mono text-[11px]"
                    : "bg-gz-burgundy/[0.15] text-gz-burgundy font-ibm-mono text-[11px]"
                }`}
              >
                +{feedback.xpGained} XP
              </span>
            </div>

            {/* Per-blank results */}
            {!feedback.todosCorrectos && (
              <div className="mt-3 space-y-1">
                {feedback.resultados
                  .filter((r) => !r.esCorrecta)
                  .map((r) => (
                    <p
                      key={r.blancoId}
                      className="font-archivo text-[13px] text-gz-burgundy"
                    >
                      Espacio {r.blancoId}: la respuesta correcta es{" "}
                      <span className="font-semibold">{r.correcta}</span>
                    </p>
                  ))}
              </div>
            )}

            {feedback.explicacion && (
              <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid mt-3">
                {feedback.explicacion}
              </p>
            )}

            <ReportButton contentType="FillBlank" contentId={currentItem.id} />
          </div>
        )}

        {/* ─── Action buttons ────────────────────────────── */}
        <div className="mt-6 flex justify-center">
          {!feedback ? (
            <button
              onClick={handleConfirm}
              disabled={!allBlanksAnswered || isSubmitting}
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
