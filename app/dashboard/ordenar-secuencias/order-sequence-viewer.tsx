"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RAMA_LABELS, TITULO_LABELS } from "@/lib/curriculum-data";
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

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

type SequenceItem = {
  id: number;
  texto: string;
};

type OrderSequenceExercise = {
  id: string;
  titulo: string;
  instruccion: string | null;
  items: SequenceItem[];
  rama: string;
  libro: string | null;
  tituloMateria: string | null;
  materia: string | null;
  dificultad: number;
};

type OrderSequenceViewerProps = {
  items: OrderSequenceExercise[];
  attemptsToday: number;
  dailyLimit: number;
  isPremium: boolean;
  initialFilters?: {
    rama?: string;
  };
};

type ItemResult = {
  itemId: number;
  texto: string;
  ordenCorrecto: number;
  ordenUsuario: number;
  esCorrecta: boolean;
};

// ----------------------------------------------------------------
// SortableItem sub-component
// ----------------------------------------------------------------

function SortableItem({
  item,
  index,
  feedback,
  result,
}: {
  item: SequenceItem;
  index: number;
  feedback: boolean;
  result?: ItemResult;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: feedback });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  let bgClass = "bg-white";
  let borderClass = "border-gz-rule";
  let extraContent: React.ReactNode = null;

  if (feedback && result) {
    if (result.esCorrecta) {
      bgClass = "bg-gz-sage/[0.06]";
      borderClass = "border-gz-sage/30";
      extraContent = (
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-gz-sage text-[10px] font-bold text-white flex-shrink-0">
          &#10003;
        </span>
      );
    } else {
      bgClass = "bg-gz-burgundy/[0.06]";
      borderClass = "border-gz-burgundy/30";
      extraContent = (
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gz-burgundy text-[10px] font-bold text-white">
            &#10007;
          </span>
          <span className="font-archivo text-[11px] text-gz-burgundy">
            &rarr; deberia ser: {result.ordenCorrecto}. {result.texto}
          </span>
        </div>
      );
    }
  }

  if (isDragging) {
    bgClass = "bg-gz-gold/[0.05]";
    borderClass = "border-gz-gold";
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 border-b ${borderClass} ${bgClass} py-3 px-3 ${
        isDragging ? "shadow-md" : ""
      } ${feedback ? "" : "touch-none"}`}
    >
      {/* Drag handle */}
      {!feedback && (
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gz-ink-light hover:text-gz-ink transition-colors"
          aria-label="Arrastrar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
      )}

      {/* Position number */}
      <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-gz-gold/10 font-ibm-mono text-[11px] font-semibold text-gz-gold">
        {index + 1}
      </span>

      {/* Text content */}
      <span className="font-archivo text-[14px] text-gz-ink leading-snug flex-1">
        {item.texto}
      </span>

      {/* Feedback icon */}
      {extraContent}
    </div>
  );
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------

export function OrderSequenceViewer({
  items,
  attemptsToday,
  dailyLimit,
  isPremium,
  initialFilters,
}: OrderSequenceViewerProps) {
  const router = useRouter();
  const pathname = usePathname();

  // ─── Filter state ──────────────────────────────────────
  const [selectedRama, setSelectedRama] = useState<string>(
    initialFilters?.rama || "ALL",
  );

  // ─── Question state ─────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sortedItems, setSortedItems] = useState<SequenceItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    resultados: ItemResult[];
    perfecto: boolean;
    correctCount: number;
    totalItems: number;
    explicacion: string | null;
    xpGained: number;
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

  // ─── DnD sensors ────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  // ─── Filtered items ────────────────────────────────────
  const filteredItems = useMemo(() => {
    let cards = [...items];
    if (selectedRama !== "ALL") cards = cards.filter((m) => m.rama === selectedRama);
    // Shuffle for variety
    return cards.sort(() => Math.random() - 0.5);
  }, [items, selectedRama]);

  const totalCards = filteredItems.length;
  const currentItem = filteredItems[currentIndex];

  // Initialize sortedItems when current exercise changes
  if (currentItem && (!initialized || sortedItems.length === 0)) {
    const shuffled = [...currentItem.items].sort(() => Math.random() - 0.5);
    setSortedItems(shuffled);
    setInitialized(true);
  }

  // ─── Filter handlers ────────────────────────────────────
  function resetQuestionState() {
    setCurrentIndex(0);
    setSortedItems([]);
    setInitialized(false);
    setFeedback(null);
    setCompleted(false);
  }

  function handleRamaChange(value: string) {
    setSelectedRama(value);
    resetQuestionState();
    updateUrl({ rama: value });
  }

  // ─── Drag end handler ──────────────────────────────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSortedItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  // ─── Submit answer ──────────────────────────────────────
  async function handleConfirm() {
    if (isSubmitting || feedback || !currentItem) return;
    setIsSubmitting(true);

    try {
      const ordenUsuario = sortedItems.map((item, idx) => ({
        itemId: item.id,
        posicion: idx + 1,
      }));

      const res = await fetch("/api/order-sequence/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderSequenceId: currentItem.id, ordenUsuario }),
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
        totalItems: data.totalItems,
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
    setSortedItems([]);
    setInitialized(false);
    if (currentIndex + 1 >= totalCards) setCompleted(true);
    else setCurrentIndex((prev) => prev + 1);
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
      </div>
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
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Dashboard
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
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Dashboard
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
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // ─── Build result map for feedback ─────────────────────
  const resultMap: Record<number, ItemResult> = {};
  if (feedback) {
    for (const r of feedback.resultados) {
      resultMap[r.itemId] = r;
    }
  }

  // ─── Main exercise view ─────────────────────────────────

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
          {TITULO_LABELS[currentItem.titulo] ?? currentItem.titulo}
        </h2>

        {/* Instruction */}
        {currentItem.instruccion && (
          <p className="font-archivo text-[14px] text-gz-ink-mid mb-5 leading-relaxed">
            {currentItem.instruccion}
          </p>
        )}

        {!currentItem.instruccion && (
          <p className="font-archivo text-[14px] text-gz-ink-mid mb-5">
            Arrastra los elementos para ordenarlos en la secuencia correcta.
          </p>
        )}

        {/* ─── Sortable list ──────────────────────────── */}
        <div className="rounded-[4px] border border-gz-rule overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedItems.map((item, index) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={index}
                  feedback={!!feedback}
                  result={resultMap[item.id]}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* ─── Feedback panel ────────────────────────────── */}
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
                  ? "Orden perfecto!"
                  : `${feedback.correctCount}/${feedback.totalItems} en posicion correcta`}
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

            <ReportButton contentType="OrderSequence" contentId={currentItem.id} />
          </div>
        )}

        {/* ─── Action buttons ────────────────────────────── */}
        <div className="mt-6 flex justify-center">
          {!feedback ? (
            <button
              onClick={handleConfirm}
              disabled={isSubmitting || sortedItems.length === 0}
              className="rounded-[3px] bg-gz-navy px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
            >
              {isSubmitting ? "Verificando..." : "Verificar orden"}
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
