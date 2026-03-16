"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────

interface TituloData {
  id: string;
  label: string;
  articulosRef: string | null;
  parrafos: string[];
  fcTotal: number;
  fcDom: number;
  mcqTotal: number;
  mcqOk: number;
  tfTotal: number;
  tfOk: number;
  percent: number;
}

interface LibroData {
  id: string;
  libro: string;
  label: string;
  titulos: TituloData[];
  fcTotal: number;
  mcqTotal: number;
  tfTotal: number;
  percent: number;
}

interface MateriaData {
  id: string;
  label: string;
  libros: LibroData[];
  fcTotal: number;
  mcqTotal: number;
  tfTotal: number;
  percent: number;
}

interface Props {
  materias: MateriaData[];
}

// ─── Constants ──────────────────────────────────────────────

const MATERIA_META: Record<string, { sigla: string; color: string; icono: string }> = {
  DERECHO_CIVIL: { sigla: "D. Civil", color: "gz-gold", icono: "⚖️" },
  DERECHO_PROCESAL_CIVIL: { sigla: "D. Procesal", color: "gz-navy", icono: "📋" },
};

const MATERIAS_PROXIMAMENTE = [
  { id: "DERECHO_PENAL", nombre: "Derecho Penal", sigla: "D. Penal", icono: "🔒" },
  { id: "DERECHO_LABORAL", nombre: "Derecho Laboral", sigla: "D. Laboral", icono: "👷" },
  { id: "DERECHO_CONSTITUCIONAL", nombre: "Derecho Constitucional", sigla: "D. Const.", icono: "📜" },
];

// ─── Progress Bar ───────────────────────────────────────────

function MiniBar({
  percent,
  color = "bg-gz-gold",
  className = "",
}: {
  percent: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={`h-1.5 rounded-sm overflow-hidden ${className}`} style={{ backgroundColor: "var(--gz-cream-dark)" }}>
      <div
        className={`h-full rounded-sm transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// ─── Study Buttons ──────────────────────────────────────────

function StudyButtons({
  rama,
  libro,
  titulo,
  fcTotal,
  mcqTotal,
  tfTotal,
}: {
  rama: string;
  libro: string;
  titulo: string;
  fcTotal: number;
  mcqTotal: number;
  tfTotal: number;
}) {
  const encodedTitulo = encodeURIComponent(titulo);

  const buttons = [
    {
      label: "Flashcards",
      count: fcTotal,
      href: `/dashboard/flashcards?rama=${rama}&libro=${libro}&titulo=${encodedTitulo}`,
    },
    {
      label: "MCQ",
      count: mcqTotal,
      href: `/dashboard/mcq?rama=${rama}&libro=${libro}&titulo=${encodedTitulo}`,
    },
    {
      label: "V/F",
      count: tfTotal,
      href: `/dashboard/truefalse?rama=${rama}&libro=${libro}&titulo=${encodedTitulo}`,
    },
    {
      label: "Simulacro",
      count: null,
      href: `/dashboard/simulacro`,
    },
  ];

  return (
    <div className="pl-12 mt-2 mb-3">
      <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
        Estudiar este tema:
      </p>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => {
          const disabled = b.count === 0;
          const label = b.count !== null ? `${b.label} (${b.count})` : b.label;

          if (disabled) {
            return (
              <span
                key={b.label}
                className="font-archivo text-[11px] font-semibold px-3 py-1.5 rounded-[3px] border border-gz-rule text-gz-ink-light opacity-40 cursor-not-allowed"
                title="Sin contenido aún"
              >
                {label}
              </span>
            );
          }

          return (
            <Link
              key={b.label}
              href={b.href}
              className="font-archivo text-[11px] font-semibold px-3 py-1.5 rounded-[3px] border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors"
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
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
        {materia.fcTotal} flashcards · {materia.mcqTotal} MCQ · {materia.tfTotal} V/F · {materia.percent}% completado
      </p>
      <div className="h-[2px] mb-6" style={{ backgroundColor: "var(--gz-rule-dark)" }} />

      {/* Tree */}
      <div className="space-y-1">
        {materia.libros.map((libro) => {
          const libroOpen = expandedLibros.has(libro.id);
          const hasContent = libro.fcTotal + libro.mcqTotal + libro.tfTotal > 0;

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
                    const totalContent = titulo.fcTotal + titulo.mcqTotal + titulo.tfTotal;
                    const hasTituloContent = totalContent > 0;

                    return (
                      <div key={titulo.id}>
                        {/* Titulo row */}
                        <button
                          onClick={() => hasTituloContent && toggleTitulo(titulo.id)}
                          className={`w-full flex items-center gap-2 py-2 pl-4 pr-2 rounded-[3px] transition-colors ${
                            hasTituloContent
                              ? "hover:bg-[var(--gz-gold)]/[0.04] cursor-pointer"
                              : "opacity-40 cursor-default"
                          }`}
                        >
                          {hasTituloContent && (
                            <span className="text-gz-ink-light text-[10px] w-3 flex-shrink-0">
                              {tituloOpen ? "▾" : "▸"}
                            </span>
                          )}
                          {!hasTituloContent && <span className="w-3 flex-shrink-0" />}
                          <span className="font-archivo text-[13px] text-gz-ink-mid text-left flex-1 min-w-0">
                            {titulo.label}
                          </span>
                          {hasTituloContent && (
                            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                              <MiniBar percent={titulo.percent} className="w-16 h-1" />
                              <span className="font-ibm-mono text-[10px] text-gz-ink-light w-8 text-right">
                                {titulo.percent}%
                              </span>
                            </div>
                          )}
                        </button>

                        {/* Parrafos + study buttons (level 3) */}
                        {tituloOpen && hasTituloContent && (
                          <div className="ml-4 border-l-2 pl-0" style={{ borderColor: "var(--gz-cream-dark)" }}>
                            {/* Parrafos */}
                            {titulo.parrafos.length > 0 && (
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
                            {titulo.parrafos.length === 0 && titulo.articulosRef && (
                              <div className="pl-4 py-2">
                                <p className="font-ibm-mono text-[10px] text-gz-ink-light/60">
                                  {titulo.articulosRef}
                                </p>
                              </div>
                            )}

                            {/* Stats mini */}
                            <div className="pl-4 pb-1">
                              <p className="font-ibm-mono text-[9px] text-gz-ink-light">
                                {titulo.fcDom}/{titulo.fcTotal} flashcards · {titulo.mcqOk}/{titulo.mcqTotal} MCQ · {titulo.tfOk}/{titulo.tfTotal} V/F
                              </p>
                            </div>

                            {/* Study buttons */}
                            <StudyButtons
                              rama={materia.id}
                              libro={libro.libro}
                              titulo={titulo.id}
                              fcTotal={titulo.fcTotal}
                              mcqTotal={titulo.mcqTotal}
                              tfTotal={titulo.tfTotal}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
      <div className="flex items-center gap-3 mb-1">
        <Image
          src="/brand/logo-sello.svg"
          alt="Studio Iuris"
          width={56}
          height={48}
          className="h-[48px] w-[48px] lg:h-[56px] lg:w-[56px]"
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
            const barColor = meta?.color === "gz-navy" ? "bg-gz-navy" : "bg-gz-gold";

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
                  ...(isSelected ? {} : {}),
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
