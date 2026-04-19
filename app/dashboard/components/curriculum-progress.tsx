"use client";

import { useState } from "react";
import {
  CURRICULUM,
  RAMA_LABELS,
  type SeccionNode,
} from "@/lib/curriculum-data";
import { progressKey } from "@/lib/progress-utils";

// Re-export for any other client imports
export { progressKey };

// ─── Tipos ──────────────────────────────────────────────────

/** Progreso por titulo (keyed "RAMA|LIBRO|TITULO_ID") */
export type TituloProgress = {
  completions: number;
  flashcardTotal: number;
  flashcardDominated: number;
  mcqTotal: number;
  mcqCorrect: number;
  tfTotal: number;
  tfCorrect: number;
};

export type ProgressData = Record<string, TituloProgress>;

function getFlashcardPercent(p: TituloProgress | undefined): number {
  if (!p || p.flashcardTotal === 0) return 0;
  return Math.round((p.flashcardDominated / p.flashcardTotal) * 100);
}

function getMcqPercent(p: TituloProgress | undefined): number {
  if (!p || p.mcqTotal === 0) return 0;
  return Math.round((p.mcqCorrect / p.mcqTotal) * 100);
}

function getTfPercent(p: TituloProgress | undefined): number {
  if (!p || p.tfTotal === 0) return 0;
  return Math.round((p.tfCorrect / p.tfTotal) * 100);
}

function getOverallPercent(p: TituloProgress | undefined): number {
  if (!p) return 0;
  const parts: number[] = [];
  if (p.flashcardTotal > 0) parts.push(getFlashcardPercent(p));
  if (p.mcqTotal > 0) parts.push(getMcqPercent(p));
  if (p.tfTotal > 0) parts.push(getTfPercent(p));
  if (parts.length === 0) return 0;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function getLibroPercent(
  data: ProgressData,
  ramaKey: string,
  seccion: SeccionNode
): number {
  if (seccion.titulos.length === 0) return 0;
  const percents = seccion.titulos.map((t) =>
    getOverallPercent(data[progressKey(ramaKey, seccion.libro, t.id)])
  );
  const withContent = percents.filter((_, i) => {
    const p = data[progressKey(ramaKey, seccion.libro, seccion.titulos[i].id)];
    return p && (p.flashcardTotal > 0 || p.mcqTotal > 0 || p.tfTotal > 0);
  });
  if (withContent.length === 0) return 0;
  return Math.round(
    withContent.reduce((a, b) => a + b, 0) / withContent.length
  );
}

function getRamaPercent(data: ProgressData, ramaKey: string): number {
  const rama = CURRICULUM[ramaKey];
  if (!rama) return 0;
  const libroPercents = rama.secciones.map((s) =>
    getLibroPercent(data, ramaKey, s)
  );
  const withContent = libroPercents.filter((p) => p > 0);
  if (withContent.length === 0) return 0;
  return Math.round(
    withContent.reduce((a, b) => a + b, 0) / withContent.length
  );
}

function hasTituloContent(
  data: ProgressData,
  ramaKey: string,
  libro: string,
  tituloId: string
): boolean {
  const p = data[progressKey(ramaKey, libro, tituloId)];
  return !!p && (p.flashcardTotal > 0 || p.mcqTotal > 0 || p.tfTotal > 0);
}

// ─── Chevron icon ──────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-navy/40 transition-transform duration-200 ${
        open ? "rotate-90" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

// ─── Barra de progreso ─────────────────────────────────────

function ProgressBar({
  percent,
  size = "md",
}: {
  percent: number;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className={`${h} w-full overflow-hidden rounded-full bg-border/30`}>
      <div
        className={`${h} rounded-full transition-all duration-500 ${
          percent >= 100 ? "bg-gz-sage" : "bg-gold"
        }`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// ─── Progress pills ────────────────────────────────────────

function ProgressPills({ progress }: { progress: TituloProgress | undefined }) {
  if (!progress) return null;
  const { flashcardTotal, mcqTotal, tfTotal } = progress;
  if (flashcardTotal === 0 && mcqTotal === 0 && tfTotal === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {flashcardTotal > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
          Flashcards {getFlashcardPercent(progress)}%
        </span>
      )}
      {mcqTotal > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-gz-sage/20 px-2 py-0.5 text-[10px] font-medium text-gz-sage">
          MCQ {getMcqPercent(progress)}%
        </span>
      )}
      {tfTotal > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-gz-navy/10 px-2 py-0.5 text-[10px] font-medium text-gz-navy">
          V/F {getTfPercent(progress)}%
        </span>
      )}
    </div>
  );
}

// ─── Vuelta badge ──────────────────────────────────────────

function VueltaBadge({ completions }: { completions: number }) {
  if (completions < 1) return null;
  return (
    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
      Vuelta {completions + 1}
    </span>
  );
}

// ─── Status icon ───────────────────────────────────────────

function StatusIcon({ percent }: { percent: number }) {
  if (percent >= 100) {
    return <span className="text-gz-sage text-sm shrink-0">&#10003;</span>;
  }
  if (percent > 0) {
    return <span className="text-gold text-sm shrink-0">&#9679;</span>;
  }
  return <span className="text-navy/20 text-sm shrink-0">&#9675;</span>;
}

// ─── Componente principal ──────────────────────────────────

export function CurriculumProgress({
  progressData,
}: {
  progressData: ProgressData;
}) {
  const [openRama, setOpenRama] = useState<string | null>("DERECHO_CIVIL");
  const [openLibro, setOpenLibro] = useState<string | null>(null);
  const [openTitulo, setOpenTitulo] = useState<string | null>(null);

  const ramaKeys = Object.keys(CURRICULUM);

  return (
    <div className="space-y-3">
      {ramaKeys.map((ramaKey) => {
        const rama = CURRICULUM[ramaKey];
        const isRamaOpen = openRama === ramaKey;
        const ramaPercent = getRamaPercent(progressData, ramaKey);

        return (
          <div
            key={ramaKey}
            className="overflow-hidden rounded-[4px] border border-gz-rule bg-white"
          >
            {/* Header rama */}
            <button
              onClick={() => setOpenRama(isRamaOpen ? null : ramaKey)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gz-cream-dark/50"
            >
              <Chevron open={isRamaOpen} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy">
                    {RAMA_LABELS[ramaKey] ?? rama.label}
                  </span>
                  {ramaPercent > 0 && (
                    <span className="text-xs text-navy/40">
                      {ramaPercent}%
                    </span>
                  )}
                </div>
                <div className="mt-1.5">
                  <ProgressBar percent={ramaPercent} size="sm" />
                </div>
              </div>
            </button>

            {/* Contenido rama — libros */}
            {isRamaOpen && (
              <div className="border-t border-gz-rule/50 px-5 pb-4">
                <div className="mt-2 space-y-2">
                  {rama.secciones.map((seccion) => {
                    const libroKey = `${ramaKey}:${seccion.libro}`;
                    const isLibroOpen = openLibro === libroKey;
                    const libroPercent = getLibroPercent(
                      progressData,
                      ramaKey,
                      seccion
                    );
                    const titulosWithContent = seccion.titulos.filter((t) =>
                      hasTituloContent(
                        progressData,
                        ramaKey,
                        seccion.libro,
                        t.id
                      )
                    );

                    return (
                      <div
                        key={libroKey}
                        className="rounded-[4px] border border-gz-rule/40 bg-gz-cream-dark/30"
                      >
                        {/* Header libro */}
                        <button
                          onClick={() =>
                            setOpenLibro(isLibroOpen ? null : libroKey)
                          }
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gz-cream-dark/60"
                        >
                          <Chevron open={isLibroOpen} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-navy/80">
                                {seccion.label}
                              </span>
                              <span className="text-xs text-navy/40">
                                {titulosWithContent.length}/
                                {seccion.titulos.length}
                              </span>
                            </div>
                            <div className="mt-1">
                              <ProgressBar percent={libroPercent} size="sm" />
                            </div>
                          </div>
                        </button>

                        {/* Contenido libro — titulos */}
                        {isLibroOpen && (
                          <div className="border-t border-gz-rule/30 px-4 pb-3">
                            <div className="mt-2 space-y-1.5">
                              {seccion.titulos.map((titulo) => {
                                const tKey = `${libroKey}:${titulo.id}`;
                                const pKey = progressKey(
                                  ramaKey,
                                  seccion.libro,
                                  titulo.id
                                );
                                const p = progressData[pKey];
                                const overallPct = getOverallPercent(p);
                                const hasParrafos =
                                  titulo.parrafos && titulo.parrafos.length > 0;
                                const isTituloOpen = openTitulo === tKey;
                                const hasContent = hasTituloContent(
                                  progressData,
                                  ramaKey,
                                  seccion.libro,
                                  titulo.id
                                );

                                return (
                                  <div
                                    key={tKey}
                                    className="rounded-md border border-gz-rule/20 bg-white/60"
                                  >
                                    <button
                                      onClick={() =>
                                        hasParrafos
                                          ? setOpenTitulo(
                                              isTituloOpen ? null : tKey
                                            )
                                          : undefined
                                      }
                                      className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                                        hasParrafos
                                          ? "cursor-pointer hover:bg-gz-cream-dark/40"
                                          : "cursor-default"
                                      } transition-colors`}
                                    >
                                      <StatusIcon percent={overallPct} />
                                      {hasParrafos && (
                                        <Chevron open={isTituloOpen} />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span
                                            className={`text-xs font-medium ${
                                              hasContent
                                                ? overallPct >= 100
                                                  ? "text-gz-sage"
                                                  : "text-navy/70"
                                                : "text-navy/35"
                                            }`}
                                          >
                                            {titulo.label}
                                          </span>
                                          {titulo.leyesAnexas &&
                                            titulo.leyesAnexas.length > 0 && (
                                              <span className="text-[9px] text-navy/30">
                                                +{titulo.leyesAnexas.length} ley
                                                {titulo.leyesAnexas.length > 1
                                                  ? "es"
                                                  : ""}
                                              </span>
                                            )}
                                          {p && p.completions >= 1 && (
                                            <VueltaBadge
                                              completions={p.completions}
                                            />
                                          )}
                                        </div>
                                        {hasContent && (
                                          <div className="mt-1">
                                            <ProgressPills progress={p} />
                                          </div>
                                        )}
                                      </div>
                                    </button>

                                    {/* Parrafos expandidos */}
                                    {isTituloOpen &&
                                      hasParrafos &&
                                      titulo.parrafos && (
                                        <div className="border-t border-gz-rule/15 px-3 pb-2">
                                          <div className="mt-1.5 space-y-1 pl-6">
                                            {titulo.parrafos.map((par) => (
                                              <div
                                                key={par.id}
                                                className="flex items-center gap-2 py-0.5"
                                              >
                                                <span className="text-navy/20 text-[10px]">
                                                  &#8226;
                                                </span>
                                                <span className="text-[11px] text-navy/50">
                                                  {par.label}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                          {titulo.leyesAnexas &&
                                            titulo.leyesAnexas.length > 0 && (
                                              <div className="mt-1.5 pl-6 space-y-0.5">
                                                {titulo.leyesAnexas.map(
                                                  (la) => (
                                                    <div
                                                      key={la.ley}
                                                      className="flex items-center gap-1.5"
                                                    >
                                                      <span className="text-[10px] text-navy/25">
                                                        &#128206;
                                                      </span>
                                                      <span className="text-[10px] text-navy/40">
                                                        {la.ley} — {la.label}
                                                      </span>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            )}
                                        </div>
                                      )}
                                  </div>
                                );
                              })}

                              {/* Leyes anexas de la seccion */}
                              {seccion.leyesAnexas &&
                                seccion.leyesAnexas.length > 0 && (
                                  <div className="mt-2 pl-2 space-y-0.5">
                                    {seccion.leyesAnexas.map((la) => (
                                      <div
                                        key={la.ley}
                                        className="flex items-center gap-1.5"
                                      >
                                        <span className="text-[10px] text-navy/25">
                                          &#128206;
                                        </span>
                                        <span className="text-[10px] text-navy/40">
                                          {la.ley} — {la.label}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
