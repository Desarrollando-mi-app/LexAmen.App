"use client";

import { useState } from "react";
import Link from "next/link";
import type { NivelLiga } from "@/lib/league";

/* ─── Types ─── */

interface GradoData {
  grado: number;
  nombre: string;
  nivel: NivelLiga;
  emoji: string;
  color: string;
  xpMinimo: number;
}

interface NivelData {
  key: string;
  label: string;
  grados: string;
  color: string;
  description: string;
}

interface HistorialEntry {
  gradoRef: number;
  gradoNombre: string;
  gradoEmoji: string;
  nivelLabel: string;
  weekStart: string;
  weeklyXp: number;
  rank: number | null;
}

interface Props {
  userGrado: number;
  gradoNombre: string;
  gradoEmoji: string;
  gradoColor: string;
  nivelLabel: string;
  userXp: number;
  xpSiguienteGrado: number | null;
  xpGradoActual: number;
  siguienteGradoNombre: string | null;
  siguienteGradoNum: number | null;
  progresoGrado: number;
  grados: GradoData[];
  niveles: NivelData[];
  historial: HistorialEntry[];
  myWeeklyXp: number;
}

/* ─── Helpers ─── */

function formatWeekDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const month = d.toLocaleDateString("es-CL", {
    month: "short",
    timeZone: "UTC",
  });
  return `${day} ${month}`;
}

function toRoman(num: number): string {
  const map: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let result = "";
  let n = num;
  for (const [value, numeral] of map) {
    while (n >= value) {
      result += numeral;
      n -= value;
    }
  }
  return result;
}

/** Convert hex color to a semitransparent color-mix (avoids #XX80 suffix quirk) */
function mix(hex: string, pct: number): string {
  return `color-mix(in srgb, ${hex} ${pct}%, transparent)`;
}

/* ─── Leitmotifs por nivel ─── */

const NIVEL_LEITMOTIF: Record<string, string> = {
  ESCUELA: "El umbral del oficio. Se oye, se estudia, se egresa.",
  PRACTICA: "El taller del abogado. Donde el conocimiento se vuelve oficio.",
  ESTRADO: "La autoridad que decide. La voz del juez en la sala.",
  MAGISTRATURA: "La corte, la fiscalía, el nombramiento. La responsabilidad del juicio.",
  CONSEJO: "Los pocos. Los que dictan la última palabra del derecho.",
};

/* ─── Journey Ruler: 33 grados · regla editorial ─── */

function JourneyRuler({
  grados,
  niveles,
  userGrado,
  userXp,
}: {
  grados: GradoData[];
  niveles: NivelData[];
  userGrado: number;
  userXp: number;
}) {
  return (
    <div
      className="border border-gz-rule rounded-sm p-4 lg:p-5 mb-6"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
          Tu Carrera · 33 Grados
        </h3>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light/80">
          Grado{" "}
          <span className="text-gz-ink tabular-nums">{toRoman(userGrado)}</span>{" "}
          de <span className="text-gz-ink-mid">XXXIII</span>
        </span>
      </div>

      <div className="border-t border-gz-rule pt-3">
        {/* Nivel labels */}
        <div className="flex items-end gap-[2px] mb-2">
          {niveles.map((n, i) => {
            const [startStr, endStr] = n.grados.split("-");
            const start = parseInt(startStr);
            const end = parseInt(endStr);
            const count = end - start + 1;
            const isActive =
              userGrado >= start && userGrado <= end;
            return (
              <div
                key={n.key}
                className="text-center overflow-hidden px-1"
                style={{ flex: count }}
              >
                <p
                  className="font-ibm-mono text-[8px] lg:text-[9px] uppercase tracking-[1.5px] truncate"
                  style={{
                    color: isActive ? n.color : "var(--gz-ink-light)",
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  <span className="hidden lg:inline">{toRoman(i + 1)} · </span>
                  {n.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* 33 grados dots */}
        <div className="flex items-center gap-[2px]">
          {grados.map((g, idx) => {
            const isCurrent = g.grado === userGrado;
            const isUnlocked = userXp >= g.xpMinimo;
            const prev = idx > 0 ? grados[idx - 1] : null;
            const showSep = prev && prev.nivel !== g.nivel;

            return (
              <div key={g.grado} className="flex items-center gap-[2px]">
                {showSep && (
                  <div className="border-r border-gz-rule mx-0.5 h-5" />
                )}
                <div
                  className="rounded-full transition-all duration-300"
                  title={`Grado ${toRoman(g.grado)} · ${g.nombre}`}
                  style={{
                    width: isCurrent ? 14 : 8,
                    height: isCurrent ? 14 : 8,
                    backgroundColor: isCurrent
                      ? g.color
                      : isUnlocked
                        ? mix(g.color, 55)
                        : "var(--gz-cream-dark, #e8dfcd)",
                    boxShadow: isCurrent
                      ? `0 0 0 2px var(--gz-cream), 0 0 0 3px ${g.color}`
                      : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between mt-3 font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">
          <span>
            Oyente
            <span className="mx-1 text-gz-ink-light/50">›</span>
            <span className="text-gz-ink-mid tabular-nums">{toRoman(1)}</span>
          </span>
          <span className="italic normal-case tracking-normal text-gz-ink-light/80">
            Progresión acumulativa · no desciende
          </span>
          <span>
            <span className="text-gz-ink-mid tabular-nums">
              {toRoman(33)}
            </span>
            <span className="mx-1 text-gz-ink-light/50">‹</span>
            Jurisconsulto
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Niveles Timeline ─── */

function NivelesTimeline({
  niveles,
  grados,
  userGrado,
  userXp,
}: {
  niveles: NivelData[];
  grados: GradoData[];
  userGrado: number;
  userXp: number;
}) {
  return (
    <div className="relative">
      {/* Connector line */}
      <div
        className="absolute left-[22px] top-[24px] bottom-6 w-[1px]"
        style={{ backgroundColor: "var(--gz-rule)" }}
        aria-hidden
      />

      <div className="space-y-5">
        {niveles.map((n, i) => {
          const nivelGrados = grados.filter((g) => g.nivel === n.key);
          const unlocked = nivelGrados.filter(
            (g) => userXp >= g.xpMinimo
          ).length;
          const total = nivelGrados.length;
          const isActive = nivelGrados.some((g) => g.grado === userGrado);
          const isPassed =
            !isActive &&
            userGrado > (nivelGrados[nivelGrados.length - 1]?.grado ?? 0);
          const roman = toRoman(i + 1);

          return (
            <div key={n.key} className="relative">
              <div className="flex gap-4">
                {/* Roman numeral marker */}
                <div className="flex-shrink-0 relative z-10">
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center font-cormorant text-[18px] font-bold transition-all"
                    style={{
                      backgroundColor: isActive
                        ? mix(n.color, 14)
                        : isPassed
                          ? mix(n.color, 8)
                          : "var(--gz-cream)",
                      border: `1.5px solid ${isActive ? n.color : isPassed ? mix(n.color, 40) : "var(--gz-rule)"}`,
                      color: isActive
                        ? n.color
                        : isPassed
                          ? mix(n.color, 70)
                          : "var(--gz-ink-light)",
                    }}
                  >
                    {roman}
                  </div>
                </div>

                {/* Content */}
                <div
                  className="flex-1 min-w-0 border rounded-sm overflow-hidden"
                  style={{
                    backgroundColor: "var(--gz-cream)",
                    borderColor: isActive ? n.color : "var(--gz-rule)",
                    boxShadow: isActive
                      ? `0 0 0 1px ${mix(n.color, 30)}`
                      : undefined,
                  }}
                >
                  {/* Header */}
                  <div
                    className="px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap"
                    style={{
                      borderColor: isActive ? n.color : "var(--gz-rule)",
                      backgroundColor: isActive
                        ? mix(n.color, 6)
                        : undefined,
                    }}
                  >
                    <div className="min-w-0">
                      <p
                        className="font-ibm-mono text-[8px] uppercase tracking-[2px] mb-0.5"
                        style={{
                          color: isActive
                            ? n.color
                            : "var(--gz-ink-light)",
                        }}
                      >
                        Capítulo {roman}
                        {isActive && (
                          <span className="ml-1.5 text-gz-gold">
                            · Estás aquí
                          </span>
                        )}
                        {isPassed && (
                          <span className="ml-1.5 text-gz-ink-light/70 normal-case tracking-normal italic">
                            · superado
                          </span>
                        )}
                      </p>
                      <h4
                        className="font-cormorant text-[20px] lg:text-[22px] font-bold leading-tight"
                        style={{ color: n.color }}
                      >
                        {n.label}
                      </h4>
                      <p className="font-cormorant italic text-[13px] text-gz-ink-mid mt-0.5">
                        {NIVEL_LEITMOTIF[n.key] ?? n.description}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-cormorant text-[22px] font-bold text-gz-ink tabular-nums leading-none">
                        {unlocked}
                        <span className="text-gz-ink-light font-normal">
                          /{total}
                        </span>
                      </p>
                      <p className="font-ibm-mono text-[8px] uppercase tracking-[1.5px] text-gz-ink-light mt-1">
                        grados
                      </p>
                    </div>
                  </div>

                  {/* Grados list */}
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {nivelGrados.map((g) => {
                      const isCurrent = g.grado === userGrado;
                      const isUnlocked = userXp >= g.xpMinimo;
                      return (
                        <div
                          key={g.grado}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm transition-colors"
                          style={{
                            backgroundColor: isCurrent
                              ? mix(g.color, 12)
                              : "transparent",
                            border: `1px solid ${isCurrent ? g.color : "transparent"}`,
                            opacity: isUnlocked ? 1 : 0.42,
                          }}
                        >
                          <span
                            className="font-ibm-mono text-[9px] tabular-nums text-gz-ink-light w-7 flex-shrink-0"
                            style={{
                              color: isCurrent ? g.color : undefined,
                              fontWeight: isCurrent ? 600 : 400,
                            }}
                          >
                            {toRoman(g.grado)}
                          </span>
                          <span
                            className="text-[13px] flex-shrink-0"
                            aria-hidden
                          >
                            {g.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-archivo text-[11px] leading-tight truncate"
                              style={{
                                color: isCurrent
                                  ? g.color
                                  : isUnlocked
                                    ? "var(--gz-ink)"
                                    : "var(--gz-ink-light)",
                                fontWeight: isCurrent ? 600 : 500,
                              }}
                            >
                              {g.nombre}
                              {isCurrent && (
                                <span className="ml-1 text-gz-gold font-ibm-mono text-[8px] uppercase tracking-[1px]">
                                  · tú
                                </span>
                              )}
                            </p>
                            <p className="font-ibm-mono text-[8px] text-gz-ink-light tabular-nums mt-0.5">
                              {g.xpMinimo.toLocaleString()} XP
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Component ─── */

export function VidaDelDerechoViewer({
  userGrado,
  gradoNombre,
  gradoEmoji,
  gradoColor,
  nivelLabel,
  userXp,
  xpSiguienteGrado,
  siguienteGradoNombre,
  siguienteGradoNum,
  progresoGrado,
  grados,
  niveles,
  historial,
  myWeeklyXp,
}: Props) {
  const [showHistorial, setShowHistorial] = useState(false);

  // Compute active nivel for hero
  const activeNivel = niveles.find(
    (n) => grados.find((g) => g.grado === userGrado)?.nivel === n.key
  );
  const activeNivelIdx = activeNivel
    ? niveles.findIndex((n) => n.key === activeNivel.key)
    : 0;
  const leitmotif = activeNivel
    ? (NIVEL_LEITMOTIF[activeNivel.key] ?? activeNivel.description)
    : "";

  // Stats
  const unlockedTotal = grados.filter((g) => userXp >= g.xpMinimo).length;
  const xpRemainingToMax =
    Math.max(0, (grados[grados.length - 1]?.xpMinimo ?? 0) - userXp);

  return (
    <main
      className="min-h-screen pb-24"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="px-4 lg:px-10 pt-8 pb-4">
        {/* MASTHEAD */}
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium mb-1">
          Progresión Permanente · V Niveles · XXXIII Grados
        </p>
        <div className="flex items-center gap-3">
          <img
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
          />
          <div>
            <h1 className="font-cormorant text-[28px] lg:text-[36px] font-bold text-gz-ink leading-none">
              La Vida del Derecho
            </h1>
            <p className="font-archivo text-[12px] lg:text-[13px] text-gz-ink-mid italic mt-1">
              Carrera acumulativa de Oyente a Jurisconsulto
            </p>
          </div>
        </div>
      </div>
      <div
        className="h-[2px]"
        style={{ backgroundColor: "var(--gz-rule-dark)" }}
      />

      <div className="mx-auto max-w-5xl px-4 lg:px-10 py-6">
        {/* ═══ HERO: Grado actual editorial ═══ */}
        <div
          className="rounded-sm mb-3 overflow-hidden"
          style={{
            backgroundColor: mix(gradoColor, 5),
            border: `1px solid ${mix(gradoColor, 35)}`,
          }}
        >
          <div className="px-5 lg:px-7 py-5 lg:py-6">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-3">
              Tu grado actual
              {activeNivel && (
                <>
                  {" · "}
                  <span style={{ color: activeNivel.color }}>
                    Capítulo {toRoman(activeNivelIdx + 1)} ·{" "}
                    {activeNivel.label}
                  </span>
                </>
              )}
            </p>

            <div className="flex items-start gap-5 lg:gap-7">
              {/* Left: big roman numeral */}
              <div className="flex-shrink-0 text-center">
                <div
                  className="font-cormorant italic font-bold leading-none"
                  style={{
                    color: gradoColor,
                    fontSize: "clamp(48px, 10vw, 80px)",
                  }}
                >
                  {toRoman(userGrado)}
                </div>
                <p className="font-ibm-mono text-[8px] uppercase tracking-[1.5px] text-gz-ink-light mt-1">
                  Grado
                </p>
              </div>

              {/* Divider */}
              <div
                className="self-stretch w-[1px] flex-shrink-0 hidden sm:block"
                style={{ backgroundColor: mix(gradoColor, 25) }}
              />

              {/* Right: details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-2xl flex-shrink-0"
                    style={{
                      backgroundColor: mix(gradoColor, 15),
                      border: `1px solid ${mix(gradoColor, 40)}`,
                    }}
                    aria-hidden
                  >
                    {gradoEmoji}
                  </span>
                  <h2 className="font-cormorant text-[26px] lg:text-[32px] font-bold text-gz-ink leading-tight">
                    {gradoNombre}
                  </h2>
                </div>

                <p className="font-cormorant italic text-[15px] lg:text-[16px] text-gz-ink-mid leading-snug">
                  &ldquo;{leitmotif}&rdquo;
                </p>

                <div className="flex items-center gap-3 mt-3 flex-wrap font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  <span>{nivelLabel}</span>
                  <span aria-hidden>·</span>
                  <span>
                    XP total:{" "}
                    <span className="text-gz-ink tabular-nums">
                      {userXp.toLocaleString()}
                    </span>
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    <span className="text-gz-ink tabular-nums">
                      {unlockedTotal}
                    </span>
                    {" / 33 desbloqueados"}
                  </span>
                </div>
              </div>
            </div>

            {/* Progreso al siguiente grado */}
            {siguienteGradoNombre && xpSiguienteGrado !== null && (
              <div
                className="mt-5 pt-4 border-t"
                style={{ borderColor: mix(gradoColor, 20) }}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                  <span className="font-archivo text-[11px] text-gz-ink-mid">
                    → Grado{" "}
                    <span className="tabular-nums">
                      {toRoman(siguienteGradoNum ?? 0)}
                    </span>
                    :{" "}
                    <span className="text-gz-ink font-semibold">
                      {siguienteGradoNombre}
                    </span>
                  </span>
                  <span className="font-ibm-mono text-[11px] text-gz-ink-mid tabular-nums">
                    Faltan{" "}
                    {(xpSiguienteGrado - userXp).toLocaleString()}{" "}
                    XP
                    <span className="text-gz-ink-light ml-1.5">
                      ({progresoGrado}%)
                    </span>
                  </span>
                </div>
                <div className="h-[6px] rounded-full bg-gz-rule/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progresoGrado}%`,
                      backgroundColor: gradoColor,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ JOURNEY RULER ═══ */}
        <JourneyRuler
          grados={grados}
          niveles={niveles}
          userGrado={userGrado}
          userXp={userXp}
        />

        {/* ═══ MAIN GRID ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8">
          {/* ─── LEFT: Timeline ─── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                Los V Capítulos · Tu recorrido
              </h3>
              <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light/80 italic normal-case tracking-normal">
                de la Escuela al Consejo
              </span>
            </div>

            <NivelesTimeline
              niveles={niveles}
              grados={grados}
              userGrado={userGrado}
              userXp={userXp}
            />
          </div>

          {/* ─── RIGHT: Sidebar ─── */}
          <aside className="space-y-6">
            {/* Stats card · Tu Carrera */}
            <div
              className="border border-gz-rule rounded-sm p-4"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-3">
                Tu Carrera
              </h3>
              <div className="border-t border-gz-rule pt-3 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-archivo text-[11px] text-gz-ink-mid">
                    Grado actual
                  </span>
                  <span className="font-cormorant text-[17px] font-bold text-gz-ink tabular-nums">
                    {toRoman(userGrado)}
                    <span className="text-gz-ink-light font-normal text-[13px]">
                      {" / "}
                      XXXIII
                    </span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-archivo text-[11px] text-gz-ink-mid">
                    XP acumulado
                  </span>
                  <span className="font-ibm-mono text-[13px] text-gz-ink tabular-nums">
                    {userXp.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-archivo text-[11px] text-gz-ink-mid">
                    Desbloqueados
                  </span>
                  <span className="font-ibm-mono text-[13px] text-gz-ink tabular-nums">
                    {unlockedTotal}
                    <span className="text-gz-ink-light ml-0.5">/33</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-archivo text-[11px] text-gz-ink-mid">
                    XP a Jurisconsulto
                  </span>
                  <span className="font-ibm-mono text-[13px] text-gz-ink tabular-nums">
                    {xpRemainingToMax > 0
                      ? xpRemainingToMax.toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Cross-link a La Toga */}
            <Link
              href="/dashboard/la-toga"
              className="group block border border-gz-rule rounded-sm p-4 hover:border-gz-gold/50 transition-colors"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2">
                La Liga de la Toga
              </p>
              <div className="border-t border-gz-rule pt-3 flex items-center gap-3">
                <span className="text-2xl">🏆</span>
                <div className="flex-1 min-w-0">
                  <p className="font-cormorant text-[15px] font-bold text-gz-ink truncate tabular-nums">
                    {myWeeklyXp.toLocaleString()} XP
                  </p>
                  <p className="font-archivo text-[11px] text-gz-ink-mid truncate">
                    esta semana
                  </p>
                </div>
                <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold group-hover:text-gz-gold-bright">
                  Ver →
                </span>
              </div>
            </Link>

            {/* Historial */}
            {historial.length > 0 && (
              <div
                className="border border-gz-rule rounded-sm"
                style={{ backgroundColor: "var(--gz-cream)" }}
              >
                <button
                  onClick={() => setShowHistorial(!showHistorial)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer"
                >
                  <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                    Crónica · Últimas {historial.length} semanas
                  </h3>
                  <span
                    className={`text-gz-ink-light text-[10px] transition-transform duration-200 ${showHistorial ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>

                {showHistorial && (
                  <div className="border-t border-gz-rule px-4 pb-4 pt-3 space-y-2.5">
                    {historial.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 border-b border-gz-rule/30 last:border-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base flex-shrink-0">
                            {h.gradoEmoji}
                          </span>
                          <div className="min-w-0">
                            <p className="font-archivo text-[11px] text-gz-ink truncate">
                              <span className="font-ibm-mono text-[10px] text-gz-ink-light tabular-nums mr-1">
                                {toRoman(h.gradoRef)}
                              </span>
                              {h.gradoNombre}
                            </p>
                            <p className="font-ibm-mono text-[9px] text-gz-ink-light">
                              {formatWeekDate(h.weekStart)} · {h.nivelLabel}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 pl-2">
                          <p className="font-ibm-mono text-[11px] text-gz-ink tabular-nums">
                            {h.weeklyXp.toLocaleString()}
                          </p>
                          {h.rank && (
                            <p className="font-ibm-mono text-[9px] text-gz-ink-light">
                              #{h.rank}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* FOOTER */}
        <div className="mt-10 relative">
          <div className="border-t-2 border-gz-rule" />
          <div className="border-t border-gz-rule mt-[3px]" />
          <p className="text-center mt-3 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
            La Vida del Derecho · V Niveles · XXXIII Grados · Studio Iuris ·{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </main>
  );
}
