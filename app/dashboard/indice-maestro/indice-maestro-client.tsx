"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────

interface LeyAnexaData {
  ley: string;
  label: string;
  nombreCorto: string | null;
}

interface ModuleStats {
  total: number;
  done: number;
}

interface TituloData {
  id: string;
  label: string;
  articulosRef: string | null;
  parrafos: string[];
  leyesAnexas: LeyAnexaData[];
  fc: ModuleStats;
  mcq: ModuleStats;
  tf: ModuleStats;
  def: ModuleStats;
  fill: ModuleStats;
  error: ModuleStats;
  order: ModuleStats;
  match: ModuleStats;
  caso: ModuleStats;
  dictado: ModuleStats;
  timeline: ModuleStats;
  totalExercicios: number;
  totalDone: number;
  cycles: number;
  percent: number;
}

interface LibroData {
  id: string;
  libro: string;
  label: string;
  titulos: TituloData[];
  leyesAnexas: LeyAnexaData[];
  percent: number;
}

interface MateriaData {
  id: string;
  label: string;
  libros: LibroData[];
  leyesAnexasRama: LeyAnexaData[];
  percent: number;
}

interface Props {
  materias: MateriaData[];
}

// ─── Constants ──────────────────────────────────────────────

const MATERIA_META: Record<string, { sigla: string; color: string; icono: string }> = {
  DERECHO_CIVIL: { sigla: "D. Civil", color: "gz-gold", icono: "⚖️" },
  DERECHO_PROCESAL_CIVIL: { sigla: "D. Procesal", color: "gz-navy", icono: "📋" },
  DERECHO_ORGANICO: { sigla: "D. Orgánico", color: "gz-burgundy", icono: "🏛️" },
};

const MATERIAS_PROXIMAMENTE = [
  { id: "DERECHO_PENAL", nombre: "Derecho Penal", sigla: "D. Penal", icono: "🔒" },
  { id: "DERECHO_LABORAL", nombre: "Derecho Laboral", sigla: "D. Laboral", icono: "👷" },
  { id: "DERECHO_CONSTITUCIONAL", nombre: "Derecho Constitucional", sigla: "D. Const.", icono: "📜" },
];

const MODULE_LABELS: Array<{ key: keyof Pick<TituloData, "fc"|"mcq"|"tf"|"def"|"fill"|"error"|"order"|"match"|"caso"|"dictado"|"timeline">; label: string; shortLabel: string }> = [
  { key: "fc", label: "Flashcards", shortLabel: "flashcards" },
  { key: "mcq", label: "MCQ", shortLabel: "MCQ" },
  { key: "tf", label: "V/F", shortLabel: "V/F" },
  { key: "def", label: "Definiciones", shortLabel: "definiciones" },
  { key: "fill", label: "Completar", shortLabel: "completar" },
  { key: "error", label: "Errores", shortLabel: "errores" },
  { key: "order", label: "Ordenar", shortLabel: "ordenar" },
  { key: "match", label: "Relacionar", shortLabel: "relacionar" },
  { key: "caso", label: "Casos", shortLabel: "casos" },
  { key: "dictado", label: "Dictado", shortLabel: "dictado" },
  { key: "timeline", label: "Timeline", shortLabel: "timeline" },
];

const MODULE_HREFS: Record<string, string> = {
  fc: "/dashboard/flashcards",
  mcq: "/dashboard/mcq",
  tf: "/dashboard/truefalse",
  def: "/dashboard/definiciones",
  fill: "/dashboard/completar-espacios",
  error: "/dashboard/identificar-errores",
  order: "/dashboard/ordenar-secuencias",
  match: "/dashboard/relacionar-columnas",
  caso: "/dashboard/casos-practicos",
  dictado: "/dashboard/dictado-juridico",
  timeline: "/dashboard/linea-de-tiempo",
};

// ─── Progress Bar ───────────────────────────────────────────

function MiniBar({
  percent,
  cycles = 0,
  color = "bg-gz-gold",
  className = "",
}: {
  percent: number;
  cycles?: number;
  color?: string;
  className?: string;
}) {
  const barColor =
    cycles >= 3
      ? "bg-gradient-to-r from-gz-gold to-amber-600"
      : cycles >= 2
      ? "bg-gz-gold ring-1 ring-gz-gold/40"
      : color;

  return (
    <div className={`h-1.5 rounded-sm overflow-hidden ${className}`} style={{ backgroundColor: "var(--gz-cream-dark)" }}>
      <div
        className={`h-full rounded-sm transition-all duration-500 ${barColor}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// ─── Leyes Complementarias Section ──────────────────────────

function LeyesSection({
  leyes,
  title = "Leyes Complementarias",
}: {
  leyes: LeyAnexaData[];
  title?: string;
}) {
  if (leyes.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--gz-cream-dark)" }}>
      <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-burgundy mb-2 flex items-center gap-2">
        <span>📜</span> {title}
      </p>
      <div className="space-y-1">
        {leyes.map((la, idx) => (
          <div key={idx} className="pl-6 py-1 font-archivo text-[12px] text-gz-ink-mid" title={`${la.ley}: ${la.label}`}>
            <span className="text-gz-ink-light mr-1.5">├──</span>
            {la.nombreCorto ?? `${la.ley}: ${la.label}`}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Study Buttons ──────────────────────────────────────────

function StudyButtons({
  rama,
  libro,
  titulo,
  stats,
}: {
  rama: string;
  libro: string;
  titulo: string;
  stats: TituloData;
}) {
  const enc = encodeURIComponent(titulo);
  const qs = `rama=${rama}&libro=${libro}&titulo=${enc}`;

  // Only show buttons for modules with content
  const activeModules = MODULE_LABELS.filter((m) => {
    const s = stats[m.key] as ModuleStats;
    return s.total > 0;
  });

  return (
    <div className="pl-12 mt-2 mb-3">
      <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
        Estudiar este tema:
      </p>
      <div className="flex flex-wrap gap-2">
        {activeModules.map((m) => {
          const isTokenModule = m.key === "dictado";
          return (
            <Link
              key={m.key}
              href={`${MODULE_HREFS[m.key]}?${qs}`}
              className={`font-archivo text-[11px] font-semibold px-3 py-1.5 rounded-[3px] border transition-colors ${
                isTokenModule
                  ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold"
              }`}
            >
              {m.label}
            </Link>
          );
        })}
        {/* Simulacro — always shown, blue (token consumer) */}
        <Link
          href="/dashboard/simulacro"
          className="font-archivo text-[11px] font-semibold px-3 py-1.5 rounded-[3px] border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          Simulacro
        </Link>
      </div>
    </div>
  );
}

// ─── Stats Line ─────────────────────────────────────────────

function StatsLine({ stats }: { stats: TituloData }) {
  const parts: string[] = [];
  for (const m of MODULE_LABELS) {
    const s = stats[m.key] as ModuleStats;
    if (s.total > 0) {
      parts.push(`${s.done}/${s.total} ${m.shortLabel}`);
    }
  }
  if (parts.length === 0) return null;
  return (
    <p className="font-ibm-mono text-[9px] text-gz-ink-light">
      {parts.join(" · ")}
    </p>
  );
}

// ─── Content Panel ──────────────────────────────────────────

function ContentPanel({ materia }: { materia: MateriaData }) {
  const [expandedLibros, setExpandedLibros] = useState<Set<string>>(new Set());
  const [expandedTitulos, setExpandedTitulos] = useState<Set<string>>(new Set());

  const toggleLibro = (id: string) => {
    setExpandedLibros((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTitulo = (id: string) => {
    setExpandedTitulos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex-1 min-w-0 lg:pl-8">
      {/* Materia Title */}
      <h2 className="font-cormorant text-[28px] font-bold text-gz-ink mb-1">
        {materia.label}
      </h2>
      <p className="font-ibm-mono text-[11px] text-gz-ink-light mb-4">
        {materia.percent}% completado
      </p>
      <div className="h-[2px] mb-6" style={{ backgroundColor: "var(--gz-rule-dark)" }} />

      {/* Tree */}
      <div className="space-y-1">
        {materia.libros.map((libro) => {
          const libroOpen = expandedLibros.has(libro.id);
          const hasContent = libro.titulos.some((t) => t.totalExercicios > 0);

          return (
            <div key={libro.id}>
              {/* Libro header */}
              <button
                onClick={() => toggleLibro(libro.id)}
                className="w-full flex items-center gap-2 py-3 px-2 -mx-2 rounded-[3px] transition-colors hover:bg-[var(--gz-gold)]/[0.04] cursor-pointer"
              >
                <span className="text-gz-ink-light text-[12px] w-4 flex-shrink-0">
                  {libroOpen ? "▾" : "▸"}
                </span>
                <span className="text-[16px] flex-shrink-0">📖</span>
                <span className="font-archivo text-[14px] font-semibold text-gz-ink text-left flex-1 min-w-0 truncate">
                  {libro.label}
                </span>
                {hasContent && (
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <MiniBar percent={libro.percent} className="w-20" />
                    <span className="font-ibm-mono text-[10px] text-gz-ink-light w-8 text-right">
                      {libro.percent}%
                    </span>
                  </div>
                )}
              </button>

              {/* Titulos (level 2) */}
              {libroOpen && (
                <div className="ml-4 border-l-2 pl-0" style={{ borderColor: "var(--gz-cream-dark)" }}>
                  {libro.titulos.map((titulo) => {
                    const tituloOpen = expandedTitulos.has(titulo.id);
                    const hasTituloContent = titulo.totalExercicios > 0;
                    const hasParrafos = titulo.parrafos.length > 0;
                    const hasLeyesTitulo = titulo.leyesAnexas.length > 0;
                    const isExpandable = hasTituloContent || hasParrafos || hasLeyesTitulo;

                    return (
                      <div key={titulo.id}>
                        {/* Titulo row */}
                        <button
                          onClick={() => isExpandable && toggleTitulo(titulo.id)}
                          className={`w-full flex items-center gap-2 py-2 pl-4 pr-2 rounded-[3px] transition-colors ${
                            isExpandable
                              ? "hover:bg-[var(--gz-gold)]/[0.04] cursor-pointer"
                              : "opacity-40 cursor-default"
                          }`}
                        >
                          {isExpandable && (
                            <span className="text-gz-ink-light text-[10px] w-3 flex-shrink-0">
                              {tituloOpen ? "▾" : "▸"}
                            </span>
                          )}
                          {!isExpandable && <span className="w-3 flex-shrink-0" />}
                          <span className="font-archivo text-[13px] text-gz-ink-mid text-left flex-1 min-w-0">
                            {titulo.label}
                          </span>
                          {/* Cycles badge */}
                          {titulo.cycles > 0 && (
                            <span
                              className={`font-ibm-mono text-[12px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                                titulo.cycles >= 10
                                  ? "bg-gz-navy/20 text-gz-navy border-gz-navy/40"
                                  : titulo.cycles >= 5
                                  ? "bg-gz-burgundy/20 text-gz-burgundy border-gz-burgundy/40"
                                  : "bg-gz-gold/20 text-gz-gold border-gz-gold"
                              }`}
                            >
                              {titulo.cycles >= 10 ? "⭐ " : ""}×{titulo.cycles}
                            </span>
                          )}
                          {hasTituloContent && (
                            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                              <MiniBar percent={titulo.percent} cycles={titulo.cycles} className="w-16 h-1" />
                              <span className="font-ibm-mono text-[10px] text-gz-ink-light w-8 text-right">
                                {titulo.percent}%
                              </span>
                            </div>
                          )}
                        </button>

                        {/* Parrafos + study buttons + leyes (level 3) */}
                        {tituloOpen && isExpandable && (
                          <div className="ml-4 border-l-2 pl-0" style={{ borderColor: "var(--gz-cream-dark)" }}>
                            {/* Parrafos */}
                            {hasParrafos && (
                              <div className="pl-4 py-2 space-y-1">
                                {titulo.parrafos.map((p, idx) => (
                                  <div key={idx} className="flex items-baseline gap-2">
                                    <span className="font-archivo text-[12px] text-gz-ink-light">
                                      § {p}
                                    </span>
                                  </div>
                                ))}
                                {titulo.articulosRef && (
                                  <p className="font-ibm-mono text-[10px] text-gz-ink-light/60 mt-1">
                                    {titulo.articulosRef}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Article ref when no parrafos */}
                            {!hasParrafos && titulo.articulosRef && (
                              <div className="pl-4 py-2">
                                <p className="font-ibm-mono text-[10px] text-gz-ink-light/60">
                                  {titulo.articulosRef}
                                </p>
                              </div>
                            )}

                            {/* Stats per module */}
                            {hasTituloContent && (
                              <div className="pl-4 pb-1">
                                <StatsLine stats={titulo} />
                              </div>
                            )}

                            {/* Study buttons */}
                            {hasTituloContent && (
                              <StudyButtons
                                rama={materia.id}
                                libro={libro.libro}
                                titulo={titulo.id}
                                stats={titulo}
                              />
                            )}

                            {/* Leyes complementarias del título */}
                            {hasLeyesTitulo && (
                              <div className="pl-4 pb-2">
                                <LeyesSection leyes={titulo.leyesAnexas} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Leyes complementarias del libro */}
                  {libro.leyesAnexas.length > 0 && (
                    <div className="pl-4 pb-2">
                      <LeyesSection leyes={libro.leyesAnexas} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyes complementarias a nivel de rama */}
      {materia.leyesAnexasRama.length > 0 && (
        <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--gz-rule-dark)" }}>
          <LeyesSection
            leyes={materia.leyesAnexasRama}
            title="Leyes y Autos Acordados Complementarios"
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function IndiceMaestroClient({ materias }: Props) {
  const [selectedRama, setSelectedRama] = useState(materias[0]?.id ?? "");

  const activeMaterias = materias;
  const selectedMateria = activeMaterias.find((m) => m.id === selectedRama);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8">
      {/* ── Page Header ──────────────────────────────── */}
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium mb-1">
        Índice Maestro
      </p>
      <div className="flex items-center gap-4 mb-1">
        <Image
          src="/brand/logo-sello.svg"
          alt="Studio Iuris"
          width={120}
          height={120}
          className="h-[80px] w-[80px] lg:h-[120px] lg:w-[120px]"
        />
        <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
          Materias
        </h1>
      </div>
      <div className="h-[2px] mt-2 mb-6" style={{ backgroundColor: "var(--gz-rule-dark)" }} />

      {/* ── Mobile: Select dropdown ──────────────────── */}
      <div className="lg:hidden mb-4">
        <select
          value={selectedRama}
          onChange={(e) => setSelectedRama(e.target.value)}
          className="w-full border rounded-[3px] p-3 font-archivo text-[14px]"
          style={{
            borderColor: "var(--gz-rule)",
            backgroundColor: "var(--gz-cream)",
            color: "var(--gz-ink)",
          }}
        >
          {activeMaterias.map((m) => {
            const meta = MATERIA_META[m.id];
            return (
              <option key={m.id} value={m.id}>
                {meta?.icono} {m.label} ({m.percent}%)
              </option>
            );
          })}
          <option disabled>──────────</option>
          {MATERIAS_PROXIMAMENTE.map((m) => (
            <option key={m.id} disabled>
              {m.icono} {m.nombre} (Próximamente)
            </option>
          ))}
        </select>
      </div>

      {/* ── Desktop Layout: Tabs + Panel ─────────────── */}
      <div className="flex gap-0">
        {/* Vertical Tabs (desktop only) */}
        <div
          className="hidden lg:block w-[200px] flex-shrink-0 border-r"
          style={{ borderColor: "var(--gz-rule)" }}
        >
          {/* Active materias */}
          {activeMaterias.map((m) => {
            const meta = MATERIA_META[m.id];
            const isSelected = m.id === selectedRama;
            const barColor = meta?.color === "gz-navy" ? "bg-gz-navy" : meta?.color === "gz-burgundy" ? "bg-gz-burgundy" : "bg-gz-gold";

            return (
              <button
                key={m.id}
                onClick={() => setSelectedRama(m.id)}
                className={`w-full text-left px-4 py-5 border-b transition-all ${
                  isSelected
                    ? "bg-white border-r-2 border-r-gz-gold -mr-px"
                    : "hover:bg-[var(--gz-gold)]/[0.04]"
                }`}
                style={{
                  borderBottomColor: "var(--gz-cream-dark)",
                }}
              >
                <span className="text-[18px] block mb-1">{meta?.icono}</span>
                <span
                  className={`font-archivo text-[13px] block ${
                    isSelected ? "font-bold text-gz-ink" : "font-semibold text-gz-ink-mid"
                  }`}
                >
                  {meta?.sigla ?? m.label}
                </span>
                <MiniBar percent={m.percent} color={barColor} className="mt-2" />
                <span className="font-ibm-mono text-[10px] text-gz-ink-light mt-1 block">
                  {m.percent}%
                </span>
              </button>
            );
          })}

          {/* Próximamente */}
          {MATERIAS_PROXIMAMENTE.map((m) => (
            <div
              key={m.id}
              className="px-4 py-4 border-b opacity-50 cursor-default"
              style={{ borderBottomColor: "var(--gz-cream-dark)" }}
            >
              <span className="text-[18px] block mb-1">{m.icono}</span>
              <span className="font-archivo text-[13px] font-semibold text-gz-ink-mid block">
                {m.sigla}
              </span>
              <span className="inline-block font-ibm-mono text-[8px] uppercase tracking-[1px] px-2 py-0.5 rounded-sm mt-1 text-gz-ink-light" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
                Próximo
              </span>
            </div>
          ))}
        </div>

        {/* Content Panel */}
        {selectedMateria && <ContentPanel materia={selectedMateria} />}
      </div>
    </div>
  );
}
