"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ReportButton } from "@/app/components/report-button";
import {
  CURRICULUM,
  RAMA_LABELS,
  LIBRO_LABELS,
  DIFICULTAD_LABELS,
} from "@/lib/curriculum-data";

// ─── Types ───────────────────────────────────────────────

type FlashcardProgress = {
  nextReviewAt: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
};

type FlashcardData = {
  id: string;
  front: string;
  back: string;
  rama: string;
  codigo: string;
  libro: string;
  titulo: string;
  parrafo: string | null;
  leyAnexa: string | null;
  articuloRef: string | null;
  dificultad: string;
  isFavorite: boolean;
  progress: FlashcardProgress | null;
};

type ViewMode = "ALL" | "FAVORITES" | "PENDING";

type FlashcardViewerProps = {
  flashcards: FlashcardData[];
  favoriteIds: string[];
  reviewsToday: number;
  dailyLimit: number;
  isPremium: boolean;
  initialFilters?: {
    rama?: string;
    libro?: string;
    titulo?: string;
    dificultad?: string;
    mode?: string;
  };
};

// ─── Component ───────────────────────────────────────────

export function FlashcardViewer({
  flashcards,
  favoriteIds,
  reviewsToday,
  dailyLimit,
  isPremium,
  initialFilters,
}: FlashcardViewerProps) {
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
  const [viewMode, setViewMode] = useState<ViewMode>(
    (initialFilters?.mode as ViewMode) || "ALL"
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
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewsCount, setReviewsCount] = useState(reviewsToday);
  const [limitReached, setLimitReached] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(
    () => new Set(favoriteIds)
  );

  // Derive available options based on selections
  const availableRamas = useMemo(
    () => Array.from(new Set(flashcards.map((c) => c.rama))),
    [flashcards]
  );

  const availableLibros = useMemo(() => {
    const cards =
      selectedRama !== "ALL"
        ? flashcards.filter((c) => c.rama === selectedRama)
        : flashcards;
    return Array.from(new Set(cards.map((c) => c.libro)));
  }, [flashcards, selectedRama]);

  const availableTitulos = useMemo(() => {
    let cards = flashcards;
    if (selectedRama !== "ALL")
      cards = cards.filter((c) => c.rama === selectedRama);
    if (selectedLibro !== "ALL")
      cards = cards.filter((c) => c.libro === selectedLibro);
    return Array.from(new Set(cards.map((c) => c.titulo)));
  }, [flashcards, selectedRama, selectedLibro]);

  const availableDificultades = useMemo(() => {
    let cards = flashcards;
    if (selectedRama !== "ALL")
      cards = cards.filter((c) => c.rama === selectedRama);
    if (selectedLibro !== "ALL")
      cards = cards.filter((c) => c.libro === selectedLibro);
    if (selectedTitulo !== "ALL")
      cards = cards.filter((c) => c.titulo === selectedTitulo);
    return Array.from(new Set(cards.map((c) => c.dificultad)));
  }, [flashcards, selectedRama, selectedLibro, selectedTitulo]);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    const now = new Date().toISOString();
    let cards = [...flashcards];

    if (selectedRama !== "ALL")
      cards = cards.filter((c) => c.rama === selectedRama);
    if (selectedLibro !== "ALL")
      cards = cards.filter((c) => c.libro === selectedLibro);
    if (selectedTitulo !== "ALL")
      cards = cards.filter((c) => c.titulo === selectedTitulo);
    if (selectedDificultad !== "ALL")
      cards = cards.filter((c) => c.dificultad === selectedDificultad);

    if (viewMode === "FAVORITES")
      cards = cards.filter((c) => favoriteSet.has(c.id));
    if (viewMode === "PENDING")
      cards = cards.filter(
        (c) => !c.progress || c.progress.nextReviewAt <= now
      );

    return cards.sort((a, b) => {
      const aScore = !a.progress
        ? 0
        : a.progress.nextReviewAt <= now
        ? 1
        : 2;
      const bScore = !b.progress
        ? 0
        : b.progress.nextReviewAt <= now
        ? 1
        : 2;
      return aScore - bScore;
    });
  }, [
    flashcards,
    selectedRama,
    selectedLibro,
    selectedTitulo,
    selectedDificultad,
    viewMode,
    favoriteSet,
  ]);

  const currentCard = filteredCards[currentIndex];
  const totalCards = filteredCards.length;

  const pendingCount = useMemo(() => {
    const now = new Date().toISOString();
    let cards = [...flashcards];
    if (selectedRama !== "ALL")
      cards = cards.filter((c) => c.rama === selectedRama);
    if (selectedLibro !== "ALL")
      cards = cards.filter((c) => c.libro === selectedLibro);
    if (selectedTitulo !== "ALL")
      cards = cards.filter((c) => c.titulo === selectedTitulo);
    if (selectedDificultad !== "ALL")
      cards = cards.filter((c) => c.dificultad === selectedDificultad);
    return cards.filter((c) => !c.progress || c.progress.nextReviewAt <= now)
      .length;
  }, [
    flashcards,
    selectedRama,
    selectedLibro,
    selectedTitulo,
    selectedDificultad,
  ]);

  const favoritesCount = useMemo(() => {
    let cards = [...flashcards];
    if (selectedRama !== "ALL")
      cards = cards.filter((c) => c.rama === selectedRama);
    if (selectedLibro !== "ALL")
      cards = cards.filter((c) => c.libro === selectedLibro);
    if (selectedTitulo !== "ALL")
      cards = cards.filter((c) => c.titulo === selectedTitulo);
    if (selectedDificultad !== "ALL")
      cards = cards.filter((c) => c.dificultad === selectedDificultad);
    return cards.filter((c) => favoriteSet.has(c.id)).length;
  }, [
    flashcards,
    selectedRama,
    selectedLibro,
    selectedTitulo,
    selectedDificultad,
    favoriteSet,
  ]);

  // ─── Handlers ──────────────────────────────────────────

  const handleToggleFavorite = useCallback(
    async (e: React.MouseEvent, cardId: string) => {
      e.stopPropagation();
      const isFav = favoriteSet.has(cardId);
      const action = isFav ? "remove" : "add";

      setFavoriteSet((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(cardId);
        else next.add(cardId);
        return next;
      });

      try {
        await fetch("/api/flashcards/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flashcardId: cardId, action }),
        });
      } catch {
        setFavoriteSet((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(cardId);
          else next.delete(cardId);
          return next;
        });
      }
    },
    [favoriteSet]
  );

  async function handleRate(quality: number) {
    if (!currentCard || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcardId: currentCard.id, quality }),
      });

      const data = await res.json();

      if (data.limit) {
        setLimitReached(true);
        setIsSubmitting(false);
        return;
      }

      setReviewsCount(data.reviewsToday ?? reviewsCount + 1);
      setIsFlipped(false);

      setTimeout(() => {
        if (currentIndex + 1 >= totalCards) setCompleted(true);
        else setCurrentIndex((prev) => prev + 1);
      }, 300);
    } catch (err) {
      console.error("Error al enviar review:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetView() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
  }

  function handleRamaChange(value: string) {
    setSelectedRama(value);
    setSelectedLibro("ALL");
    setSelectedTitulo("ALL");
    setSelectedDificultad("ALL");
    resetView();
    updateUrl({ rama: value });
  }

  function handleLibroChange(value: string) {
    setSelectedLibro(value);
    setSelectedTitulo("ALL");
    setSelectedDificultad("ALL");
    resetView();
    updateUrl({ rama: selectedRama, libro: value });
  }

  function handleTituloChange(value: string) {
    setSelectedTitulo(value);
    setSelectedDificultad("ALL");
    resetView();
    updateUrl({
      rama: selectedRama,
      libro: selectedLibro,
      titulo: value,
    });
  }

  function handleDificultadChange(value: string) {
    setSelectedDificultad(value);
    resetView();
    updateUrl({
      rama: selectedRama,
      libro: selectedLibro,
      titulo: selectedTitulo,
      dificultad: value,
    });
  }

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    resetView();
    updateUrl({
      rama: selectedRama,
      libro: selectedLibro,
      titulo: selectedTitulo,
      dificultad: selectedDificultad,
      mode,
    });
  }

  // ─── Filters UI ──────────────────────────────────────────

  function FiltersUI() {
    return (
      <>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <select
            value={selectedRama}
            onChange={(e) => handleRamaChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20 sm:w-auto"
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
            className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20 sm:w-auto"
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
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20 sm:w-auto"
            >
              <option value="ALL">Todos los titulos</option>
              {availableTitulos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          {availableDificultades.length > 1 && (
            <select
              value={selectedDificultad}
              onChange={(e) => handleDificultadChange(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-navy outline-none transition-colors focus:border-gold focus:ring-2 focus:ring-gold/20 sm:w-auto"
            >
              <option value="ALL">Toda dificultad</option>
              {availableDificultades.map((d) => (
                <option key={d} value={d}>
                  {DIFICULTAD_LABELS[d] ?? d}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {(["ALL", "FAVORITES", "PENDING"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === mode
                  ? "bg-gold text-white"
                  : "bg-border/30 text-navy/60 hover:bg-border/50"
              }`}
            >
              {mode === "ALL" && "Todas"}
              {mode === "FAVORITES" && `Favoritas (${favoritesCount})`}
              {mode === "PENDING" && `Pendientes (${pendingCount})`}
            </button>
          ))}
        </div>
      </>
    );
  }

  // ─── Screens ───────────────────────────────────────────

  if (limitReached && !isPremium) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/10">
          <svg className="h-10 w-10 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-navy font-display">Limite diario alcanzado</h2>
        <p className="mt-2 max-w-sm text-navy/60">Has completado {dailyLimit} revisiones hoy. Actualiza a Premium para revisiones ilimitadas.</p>
        <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90">Volver al Dashboard</Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-navy font-display">Sesion completada!</h2>
        <p className="mt-2 text-navy/60">Has revisado {reviewsCount} tarjeta{reviewsCount !== 1 ? "s" : ""} hoy.</p>
        <Link href="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-navy/90">Volver al Dashboard</Link>
      </div>
    );
  }

  if (totalCards === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/70 transition-colors hover:text-navy">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            Volver
          </Link>
        </div>
        <FiltersUI />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg text-navy/60">
            {viewMode === "FAVORITES" ? "No tienes tarjetas favoritas en esta seleccion." : viewMode === "PENDING" ? "No tienes tarjetas pendientes de revision." : "No hay tarjetas disponibles para esta seleccion."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Main view ─────────────────────────────────────────

  const cardLabel = (() => {
    const ramaNode = CURRICULUM[currentCard.rama];
    if (!ramaNode) return currentCard.titulo;
    for (const sec of ramaNode.secciones) {
      const found = sec.titulos.find((t) => t.label === currentCard.titulo);
      if (found) return found.label;
    }
    return currentCard.titulo;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/70 transition-colors hover:text-navy">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Volver
        </Link>
        <span className="text-sm font-medium text-navy/60">Tarjeta {currentIndex + 1} de {totalCards}</span>
      </div>

      <FiltersUI />

      {/* Tarjeta flip */}
      <div className="relative">
        <div className="perspective cursor-pointer" onClick={() => !isSubmitting && setIsFlipped((prev) => !prev)}>
          <div className={`flip-card-inner min-h-[300px] sm:min-h-[350px] ${isFlipped ? "flipped" : ""}`}>
            <div className="flip-card-front flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-8 shadow-sm">
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-gold">{cardLabel}</div>
              <p className="text-center text-lg font-semibold leading-relaxed text-navy sm:text-xl">{currentCard.front}</p>
              <p className="mt-6 text-sm text-navy/40">Toca para ver la respuesta</p>
            </div>
            <div className="flip-card-back flex flex-col items-center justify-center rounded-2xl border-2 border-gold/30 p-8 shadow-sm" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-gold/70">Respuesta</div>
              <p className="text-center text-base leading-relaxed sm:text-lg" style={{ color: "var(--text-primary)" }}>{currentCard.back}</p>
            </div>
          </div>
        </div>
        <button onClick={(e) => handleToggleFavorite(e, currentCard.id)} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-colors hover:bg-white" title={favoriteSet.has(currentCard.id) ? "Quitar de favoritas" : "Agregar a favoritas"}>
          {favoriteSet.has(currentCard.id) ? (
            <svg className="h-5 w-5 text-gold" viewBox="0 0 24 24" fill="currentColor"><path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" /></svg>
          ) : (
            <svg className="h-5 w-5 text-navy/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
          )}
        </button>
      </div>

      <div className={`grid grid-cols-3 gap-3 transition-all duration-300 ${isFlipped ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}>
        <button onClick={() => handleRate(0)} disabled={isSubmitting || !isFlipped} className="flex flex-col items-center gap-1 rounded-xl border border-red-300 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/20 disabled:opacity-50"><span className="text-lg">&#10007;</span><span>No lo sabia</span></button>
        <button onClick={() => handleRate(3)} disabled={isSubmitting || !isFlipped} className="flex flex-col items-center gap-1 rounded-xl border border-gold bg-gold/10 px-4 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:opacity-50"><span className="text-lg">~</span><span>Con dificultad</span></button>
        <button onClick={() => handleRate(5)} disabled={isSubmitting || !isFlipped} className="flex flex-col items-center gap-1 rounded-xl border border-green-400 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/20 disabled:opacity-50"><span className="text-lg">&#10003;</span><span>Lo sabia</span></button>
      </div>

      {isFlipped && (
        <div className="flex justify-end">
          <ReportButton contentType="FLASHCARD" contentId={currentCard.id} />
        </div>
      )}

      <div className="border-t border-border pt-4 text-center text-sm text-navy/50">
        Hoy: {reviewsCount}{!isPremium ? ` / ${dailyLimit}` : ""} revisiones
      </div>
    </div>
  );
}
