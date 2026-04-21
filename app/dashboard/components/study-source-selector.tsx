"use client";

import { useState, useMemo } from "react";
import {
  CURRICULUM,
  RAMA_LABELS,
  getTitulosForLibro,
  getParrafosForTitulo,
} from "@/lib/curriculum-data";

/* ─── Types ─── */

export type ContentType = "flashcards" | "mcq" | "vf" | "definiciones";

/** Minimal item shape — every study item has at least these fields */
export interface FilterableItem {
  rama: string | null;
  libro?: string | null;
  titulo?: string | null;
  parrafo?: string | null;
}

export interface SourceSelection {
  rama: string; // "ALL" or a specific rama key
  libro: string; // "ALL" or a specific libro key
  titulo: string; // "ALL" or a specific titulo key
  parrafo: string; // "ALL" or a specific parrafo id
}

interface Props {
  items: FilterableItem[];
  contentType: ContentType;
  onStart: (selection: SourceSelection) => void;
  onStudyAll: () => void;
}

/* ─── Content labels ─── */

const CONTENT_LABELS: Record<ContentType, { singular: string; plural: string }> = {
  flashcards: { singular: "flashcard", plural: "flashcards" },
  mcq: { singular: "pregunta", plural: "preguntas" },
  vf: { singular: "enunciado", plural: "enunciados" },
  definiciones: { singular: "definición", plural: "definiciones" },
};

/* ─── Component ─── */

export function StudySourceSelector({
  items,
  contentType,
  onStart,
  onStudyAll,
}: Props) {
  const [selectedRama, setSelectedRama] = useState("ALL");
  const [selectedLibro, setSelectedLibro] = useState("ALL");
  const [selectedTitulo, setSelectedTitulo] = useState("ALL");
  const [selectedParrafo, setSelectedParrafo] = useState("ALL");

  const labels = CONTENT_LABELS[contentType];

  // Available ramas from actual content
  const availableRamas = useMemo(
    () => Array.from(new Set(items.filter((i) => i.rama).map((i) => i.rama as string))),
    [items]
  );

  // Available libros — from curriculum structure filtered by rama + actual content
  const availableLibros = useMemo(() => {
    if (selectedRama === "ALL") return [];
    const rama = CURRICULUM[selectedRama];
    if (!rama) return [];
    const contentLibros = new Set(
      items
        .filter((i) => i.rama === selectedRama && i.libro)
        .map((i) => i.libro as string)
    );
    return rama.secciones
      .filter((s) => contentLibros.has(s.libro))
      .map((s) => ({ key: s.libro, label: s.label }));
  }, [items, selectedRama]);

  // Available titulos — from curriculum structure
  const availableTitulos = useMemo(() => {
    if (selectedRama === "ALL" || selectedLibro === "ALL") return [];
    const titulos = getTitulosForLibro(selectedRama, selectedLibro);
    const contentTitulos = new Set(
      items
        .filter(
          (i) =>
            i.rama === selectedRama &&
            i.libro === selectedLibro &&
            i.titulo
        )
        .map((i) => i.titulo as string)
    );
    return titulos
      .filter((t) => contentTitulos.has(t.id))
      .map((t) => ({ key: t.id, label: t.label }));
  }, [items, selectedRama, selectedLibro]);

  // Available párrafos — from curriculum filtered by actual content in the selected título
  const availableParrafos = useMemo(() => {
    if (
      selectedRama === "ALL" ||
      selectedLibro === "ALL" ||
      selectedTitulo === "ALL"
    ) {
      return [];
    }
    const parrafos = getParrafosForTitulo(
      selectedRama,
      selectedLibro,
      selectedTitulo
    );
    const contentParrafos = new Set(
      items
        .filter(
          (i) =>
            i.rama === selectedRama &&
            i.libro === selectedLibro &&
            i.titulo === selectedTitulo &&
            i.parrafo
        )
        .map((i) => i.parrafo as string)
    );
    return parrafos
      .filter((p) => contentParrafos.has(p.id))
      .map((p) => ({ key: p.id, label: p.label }));
  }, [items, selectedRama, selectedLibro, selectedTitulo]);

  // Count matching items
  const matchingCount = useMemo(() => {
    let filtered = items;
    if (selectedRama !== "ALL")
      filtered = filtered.filter((i) => i.rama === selectedRama);
    if (selectedLibro !== "ALL")
      filtered = filtered.filter((i) => i.libro === selectedLibro);
    if (selectedTitulo !== "ALL")
      filtered = filtered.filter((i) => i.titulo === selectedTitulo);
    if (selectedParrafo !== "ALL")
      filtered = filtered.filter((i) => i.parrafo === selectedParrafo);
    return filtered.length;
  }, [items, selectedRama, selectedLibro, selectedTitulo, selectedParrafo]);

  const hasSelection = selectedRama !== "ALL";
  const canStart = hasSelection && matchingCount > 0;

  function handleRamaChange(value: string) {
    setSelectedRama(value);
    setSelectedLibro("ALL");
    setSelectedTitulo("ALL");
    setSelectedParrafo("ALL");
  }

  function handleLibroChange(value: string) {
    setSelectedLibro(value);
    setSelectedTitulo("ALL");
    setSelectedParrafo("ALL");
  }

  function handleTituloChange(value: string) {
    setSelectedTitulo(value);
    setSelectedParrafo("ALL");
  }

  function handleStart() {
    if (!canStart) return;
    onStart({
      rama: selectedRama,
      libro: selectedLibro,
      titulo: selectedTitulo,
      parrafo: selectedParrafo,
    });
  }

  return (
    <div className="space-y-8">
      {/* Main selection card */}
      <div className="rounded-sm border border-gz-rule bg-white/60 p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="font-cormorant text-2xl sm:text-[28px] font-bold text-gz-ink">
            &iquest;Qu&eacute; quieres estudiar?
          </h2>
          <p className="mt-1 font-archivo text-sm text-gz-ink-mid">
            Selecciona la materia que quieres practicar
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-gz-rule/50 mb-6" />

        {/* Selects */}
        <div className="space-y-4">
          {/* Rama */}
          <div>
            <label className="block font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1.5">
              Rama
            </label>
            <select
              value={selectedRama}
              onChange={(e) => handleRamaChange(e.target.value)}
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors"
            >
              <option value="ALL">Seleccionar rama...</option>
              {availableRamas.map((r) => (
                <option key={r} value={r}>
                  {RAMA_LABELS[r] ?? r}
                </option>
              ))}
            </select>
          </div>

          {/* Libro */}
          {availableLibros.length > 0 && (
            <div>
              <label className="block font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1.5">
                Libro
              </label>
              <select
                value={selectedLibro}
                onChange={(e) => handleLibroChange(e.target.value)}
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors"
              >
                <option value="ALL">Todos los libros</option>
                {availableLibros.map((l) => (
                  <option key={l.key} value={l.key}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Titulo */}
          {availableTitulos.length > 0 && (
            <div>
              <label className="block font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1.5">
                T&iacute;tulo
              </label>
              <select
                value={selectedTitulo}
                onChange={(e) => handleTituloChange(e.target.value)}
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors"
              >
                <option value="ALL">Todos los t&iacute;tulos</option>
                {availableTitulos.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Párrafo */}
          {availableParrafos.length > 0 && (
            <div>
              <label className="block font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1.5">
                P&aacute;rrafo
              </label>
              <select
                value={selectedParrafo}
                onChange={(e) => setSelectedParrafo(e.target.value)}
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20 transition-colors"
              >
                <option value="ALL">Todos los p&aacute;rrafos</option>
                {availableParrafos.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content count */}
        <div className="mt-5 flex items-center gap-2">
          <span className="font-ibm-mono text-[11px] text-gz-ink-light">
            Contenido disponible:
          </span>
          <span
            className={`font-ibm-mono text-[12px] font-semibold ${
              matchingCount > 0 ? "text-gz-gold" : "text-gz-burgundy"
            }`}
          >
            {matchingCount} {matchingCount === 1 ? labels.singular : labels.plural}
          </span>
        </div>

        {/* No content warning */}
        {hasSelection && matchingCount === 0 && (
          <p className="mt-2 font-archivo text-[13px] text-gz-burgundy/80 italic">
            No hay contenido disponible para esta selecci&oacute;n.
          </p>
        )}

        {/* Start button */}
        <div className="mt-6">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`
              w-full rounded-[3px] px-5 py-3 font-archivo text-[14px] font-semibold transition-colors
              ${
                canStart
                  ? "bg-gz-navy text-white hover:bg-gz-gold hover:text-gz-navy cursor-pointer"
                  : "bg-gz-rule/30 text-gz-ink-light cursor-not-allowed"
              }
            `}
          >
            Comenzar estudio &rarr;
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gz-rule/40" />
        <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
          o
        </span>
        <div className="flex-1 h-px bg-gz-rule/40" />
      </div>

      {/* Study all button */}
      <button
        onClick={onStudyAll}
        className="w-full rounded-[3px] border border-gz-rule bg-white/60 px-5 py-3 font-archivo text-[14px] text-gz-ink-mid hover:border-gz-gold hover:text-gz-ink transition-colors"
      >
        Estudiar todo el contenido disponible ({items.length}{" "}
        {items.length === 1 ? labels.singular : labels.plural})
      </button>
    </div>
  );
}
