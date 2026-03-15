"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ReportePostExamen } from "./reporte-post-examen";

// ─── Types ─────────────────────────────────────────────────

interface ExamenTema {
  id: string;
  nombre: string;
  descripcion: string | null;
  materiaMapping: string | null;
  libroMapping: string | null;
  tieneContenido: boolean;
  flashcardsDisponibles: number;
  mcqDisponibles: number;
  vfDisponibles: number;
  flashcardsDominadas: number;
  mcqCorrectas: number;
  vfCorrectas: number;
  porcentajeAvance: number;
  peso: number;
  orden: number;
}

interface StudySuggestion {
  temaNombre: string;
  temaId: string;
  tipo: "flashcards" | "mcq" | "vf";
  cantidad: number;
  razon: string;
}

interface ProgresoDashboardProps {
  configId: string;
  universidad: string;
  sede: string | null;
  fechaExamen: string | null;
  initialTemas: ExamenTema[];
  onReconfigure: () => void;
}

// ─── Component ─────────────────────────────────────────────

export function ProgresoDashboard({
  universidad,
  sede,
  fechaExamen,
  initialTemas,
  onReconfigure,
}: ProgresoDashboardProps) {
  const [temas, setTemas] = useState<ExamenTema[]>(initialTemas);
  const [progresoGlobal, setProgresoGlobal] = useState(0);
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
  const [sugerencia, setSugerencia] = useState<StudySuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReporte, setShowReporte] = useState(false);

  // Fetch fresh progress on mount
  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch("/api/mi-examen/progreso");
        if (!res.ok) return;
        const data = await res.json();

        setTemas(data.temas);
        setProgresoGlobal(data.progresoGlobal);
        setDiasRestantes(data.diasRestantes);
        setSugerencia(data.sugerenciaHoy);
      } catch {
        // Use initial data on error
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, []);

  // Calculate initial global progress from initial temas
  useEffect(() => {
    if (!loading) return;
    let totalWeight = 0;
    let weightedProgress = 0;
    for (const tema of initialTemas) {
      if (tema.tieneContenido) {
        totalWeight += tema.peso;
        weightedProgress += tema.porcentajeAvance * tema.peso;
      }
    }
    if (totalWeight > 0) {
      setProgresoGlobal(Math.round((weightedProgress / totalWeight) * 10) / 10);
    }

    if (fechaExamen) {
      const diff = new Date(fechaExamen).getTime() - Date.now();
      setDiasRestantes(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    }
  }, [initialTemas, fechaExamen, loading]);

  const temasConContenido = temas.filter((t) => t.tieneContenido);
  const temasSinContenido = temas.filter((t) => !t.tieneContenido);

  function getStudyLink(tema: ExamenTema): string {
    const params = new URLSearchParams();
    if (tema.materiaMapping) params.set("rama", tema.materiaMapping);
    if (tema.libroMapping) params.set("libro", tema.libroMapping);

    // Prioritize by what has the most content gap
    const flashGap = tema.flashcardsDisponibles - tema.flashcardsDominadas;
    const mcqGap = tema.mcqDisponibles - tema.mcqCorrectas;
    const vfGap = tema.vfDisponibles - tema.vfCorrectas;

    if (flashGap >= mcqGap && flashGap >= vfGap) {
      return `/dashboard/flashcards?${params.toString()}`;
    } else if (mcqGap >= vfGap) {
      return `/dashboard/mcq?${params.toString()}`;
    } else {
      return `/dashboard/truefalse?${params.toString()}`;
    }
  }

  function getSugerenciaLink(): string {
    if (!sugerencia) return "/dashboard/flashcards";
    const tema = temas.find((t) => t.id === sugerencia.temaId);
    if (!tema) return "/dashboard/flashcards";

    const params = new URLSearchParams();
    if (tema.materiaMapping) params.set("rama", tema.materiaMapping);
    if (tema.libroMapping) params.set("libro", tema.libroMapping);

    const base =
      sugerencia.tipo === "flashcards"
        ? "/dashboard/flashcards"
        : sugerencia.tipo === "mcq"
          ? "/dashboard/mcq"
          : "/dashboard/truefalse";

    return `${base}?${params.toString()}`;
  }

  const fechaExamenLabel = fechaExamen
    ? new Date(fechaExamen).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 lg:px-0 py-8 space-y-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="text-center">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
          Mi Examen &middot; Progreso
        </p>
        <h1 className="font-cormorant text-[28px] sm:text-[34px] !font-bold text-gz-ink leading-tight mt-2">
          Mi Plan de Estudio
        </h1>
        <div className="border-b-2 border-gz-rule-dark mt-4 mb-6 mx-auto max-w-xs" />
      </div>

      {/* ─── Summary + Countdown row ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Summary card */}
        <div className="bg-white border border-gz-rule rounded-[4px] p-6">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2">
            Progreso global
          </p>
          <p className="font-cormorant text-[42px] font-bold text-gz-ink leading-none">
            {Math.round(progresoGlobal)}%
          </p>

          {/* Progress bar */}
          <div className="h-3 bg-gz-cream-dark rounded-sm overflow-hidden mt-3">
            <div
              className="h-full bg-gz-gold rounded-sm transition-all duration-700"
              style={{ width: `${Math.min(progresoGlobal, 100)}%` }}
            />
          </div>

          <p className="font-archivo text-[13px] text-gz-ink-mid mt-3">
            {universidad}
            {sede ? ` · ${sede}` : ""}
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-light">
            {temas.length} temas &middot; {temasConContenido.length} con contenido
          </p>

          <button
            onClick={onReconfigure}
            className="font-ibm-mono text-[10px] text-gz-ink-light mt-2 cursor-pointer hover:text-gz-gold transition-colors"
          >
            ⚙ Reconfigurar
          </button>
        </div>

        {/* Countdown card */}
        <div className="bg-gz-navy rounded-[4px] p-6 text-white">
          {diasRestantes !== null ? (
            <>
              <p className="font-cormorant text-[42px] font-bold text-white leading-none">
                {diasRestantes}
              </p>
              <p className="font-ibm-mono text-[12px] text-white/60">
                d&iacute;as restantes
              </p>
              {fechaExamenLabel && (
                <p className="font-ibm-mono text-[11px] text-white/40 mt-1">
                  Meta: {fechaExamenLabel}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-cormorant text-[24px] font-bold text-white/80 leading-tight">
                Sin fecha definida
              </p>
              <p className="font-ibm-mono text-[11px] text-white/40 mt-1">
                Configura tu fecha de examen para ver el countdown
              </p>
            </>
          )}

          {sugerencia && (
            <div className="border-t border-white/10 mt-4 pt-4">
              <p className="font-ibm-mono text-[10px] text-gz-gold uppercase tracking-[1px]">
                📚 Sugerencia de hoy
              </p>
              <p className="font-cormorant text-[15px] text-white/80 mt-1 leading-snug">
                {sugerencia.razon}
              </p>
              <Link
                href={getSugerenciaLink()}
                className="inline-block mt-2 bg-gz-gold text-gz-navy font-archivo text-[12px] font-semibold px-4 py-2 rounded-[3px] hover:bg-white hover:text-gz-navy transition-colors"
              >
                Estudiar ahora &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ─── Section header: Temas ───────────────────────── */}
      <div className="flex items-center gap-3 mt-2">
        <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold whitespace-nowrap">
          Temas de tu cedulario
        </span>
        <div className="flex-1 h-px bg-gz-rule" />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gz-rule rounded-[4px] p-5 animate-pulse">
              <div className="h-5 bg-gz-cream-dark rounded w-1/3 mb-3" />
              <div className="h-2 bg-gz-cream-dark rounded w-full mb-2" />
              <div className="h-3 bg-gz-cream-dark rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* ─── Temas con contenido ─────────────────────────── */}
      {!loading && temasConContenido.map((tema) => (
        <div
          key={tema.id}
          className="bg-white border border-gz-rule rounded-[4px] p-5 transition-colors hover:border-gz-gold/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-cormorant text-[18px] font-bold text-gz-ink">
              {tema.nombre}
            </h3>
            <span className="font-ibm-mono text-[16px] font-bold text-gz-ink">
              {Math.round(tema.porcentajeAvance)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gz-cream-dark rounded-sm overflow-hidden">
            <div
              className={`h-full rounded-sm transition-all duration-500 ${
                tema.porcentajeAvance < 30 ? "bg-gz-burgundy" : "bg-gz-gold"
              }`}
              style={{ width: `${Math.min(tema.porcentajeAvance, 100)}%` }}
            />
          </div>

          {/* Stats */}
          <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-2">
            {tema.flashcardsDisponibles > 0 && (
              <span>
                {tema.flashcardsDominadas}/{tema.flashcardsDisponibles} flashcards
              </span>
            )}
            {tema.mcqDisponibles > 0 && (
              <span>
                {tema.flashcardsDisponibles > 0 ? " · " : ""}
                {tema.mcqCorrectas}/{tema.mcqDisponibles} MCQ
              </span>
            )}
            {tema.vfDisponibles > 0 && (
              <span>
                {(tema.flashcardsDisponibles > 0 || tema.mcqDisponibles > 0) ? " · " : ""}
                {tema.vfCorrectas}/{tema.vfDisponibles} V/F
              </span>
            )}
          </p>

          {/* Weak alert */}
          {tema.porcentajeAvance < 30 && (
            <p className="font-ibm-mono text-[10px] text-gz-burgundy mt-1 flex items-center gap-1">
              ⚠ &Aacute;rea d&eacute;bil &mdash; priorizar
            </p>
          )}

          {/* CTA */}
          <Link
            href={getStudyLink(tema)}
            className="inline-block font-archivo text-[12px] font-semibold text-gz-gold mt-2 border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors"
          >
            Estudiar &rarr;
          </Link>
        </div>
      ))}

      {/* ─── Temas sin contenido ─────────────────────────── */}
      {!loading && temasSinContenido.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-4">
            <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light whitespace-nowrap">
              Sin contenido a&uacute;n
            </span>
            <div className="flex-1 h-px bg-gz-rule" />
          </div>

          {temasSinContenido.map((tema) => (
            <div
              key={tema.id}
              className="border border-gz-rule/50 rounded-[4px] p-5 opacity-70"
              style={{ backgroundColor: "var(--gz-cream-dark, #f0ebe0)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-cormorant text-[18px] font-bold text-gz-ink-light">
                  {tema.nombre}
                </h3>
                <span className="font-ibm-mono text-[16px] text-gz-ink-light">
                  &mdash;
                </span>
              </div>
              <p className="font-cormorant italic text-[14px] text-gz-ink-light mt-2">
                📭 Este tema no tiene material disponible todav&iacute;a.
              </p>
            </div>
          ))}
        </>
      )}

      {/* ─── Reporte post-examen CTA ─────────────────────── */}
      <div className="bg-gz-gold/[0.04] border border-gz-rule rounded-[4px] p-6 mt-8">
        <h3 className="font-cormorant text-[18px] font-bold text-gz-ink mb-1">
          &iquest;Ya rendiste tu examen?
        </h3>
        <p className="font-archivo text-[13px] text-gz-ink-mid mb-3">
          Cu&eacute;ntanos c&oacute;mo te fue y ayuda a futuros estudiantes.
        </p>
        <button
          onClick={() => setShowReporte(true)}
          className="rounded-[3px] bg-gz-gold px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90"
        >
          Completar reporte &rarr;
        </button>
      </div>

      {/* ─── Reporte modal ───────────────────────────────── */}
      {showReporte && (
        <ReportePostExamen
          temas={temas.map((t) => ({ id: t.id, nombre: t.nombre }))}
          onClose={() => setShowReporte(false)}
          onSubmitted={() => setShowReporte(false)}
        />
      )}
    </div>
  );
}
