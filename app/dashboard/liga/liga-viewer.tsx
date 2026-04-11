"use client";

import { useState } from "react";
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
}

interface Member {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  weeklyXp: number;
  grado: number;
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

interface LigaViewerProps {
  // User grado info
  userGrado: number;
  gradoNombre: string;
  gradoEmoji: string;
  gradoColor: string;
  nivelLabel: string;
  nivelKey: NivelLiga;
  userXp: number;
  xpSiguienteGrado: number | null;
  xpGradoActual: number;
  siguienteGradoNombre: string | null;
  siguienteGradoNum: number | null;
  progresoGrado: number;
  grados: GradoData[];
  niveles: NivelData[];
  // Liga semanal
  daysRemaining: number;
  userId: string;
  members: Member[];
  maxXp: number;
  desglose: Record<string, number>;
  totalXpSemanal: number;
  myPosition: number | null;
  promotionSpots: number;
  relegationSpots: number;
  historial: HistorialEntry[];
  visibleEnLiga: boolean;
}

/* ─── Category labels & colors ─── */

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  estudio: { label: "Estudio", color: "var(--gz-navy, #12203a)" },
  simulacro: { label: "Simulacro", color: "var(--gz-burgundy, #6b1d2a)" },
  causas: { label: "Causas", color: "var(--gz-gold, #9a7230)" },
  publicaciones: { label: "Publicaciones", color: "var(--gz-sage, #3a5a35)" },
  bonus: { label: "Bonus", color: "var(--gz-ink-light, #8a8073)" },
};

/* ─── Helpers ─── */

function formatWeekDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  const month = d.toLocaleDateString("es-CL", { month: "short", timeZone: "UTC" });
  return `${day} ${month}`;
}

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

/* ─── Barra visual de La Vida del Derecho ─── */

function GradoBar({ grados, niveles, userGrado, userXp }: {
  grados: GradoData[];
  niveles: NivelData[];
  userGrado: number;
  userXp: number;
}) {
  // Group grados by nivel for separators
  const nivelBoundaries = new Set<number>();
  let prevNivel = grados[0]?.nivel;
  for (const g of grados) {
    if (g.nivel !== prevNivel) {
      nivelBoundaries.add(g.grado);
      prevNivel = g.nivel;
    }
  }

  return (
    <div className="mt-4">
      {/* Nivel labels */}
      <div className="flex items-end gap-0 mb-1.5 overflow-hidden">
        {niveles.map((n) => {
          const [startStr, endStr] = n.grados.split("-");
          const start = parseInt(startStr);
          const end = parseInt(endStr);
          const count = end - start + 1;
          const fraction = count / 33;
          return (
            <div
              key={n.key}
              className="text-center overflow-hidden"
              style={{ flex: `${fraction}` }}
            >
              <p className="font-ibm-mono text-[7px] lg:text-[8px] uppercase tracking-[1px] truncate" style={{ color: n.color }}>
                {n.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex items-center gap-[2px]">
        {grados.map((g) => {
          const isCurrent = g.grado === userGrado;
          const isUnlocked = userXp >= g.xpMinimo;
          const showSeparator = nivelBoundaries.has(g.grado);

          return (
            <div key={g.grado} className="flex items-center gap-[2px]">
              {showSeparator && (
                <div className="border-r border-gz-rule mx-0.5 h-4" />
              )}
              <div
                className={`rounded-full transition-all duration-300 ${
                  isCurrent
                    ? "w-3 h-3 ring-2 ring-gz-gold ring-offset-1 ring-offset-[var(--gz-cream)]"
                    : "w-[7px] h-[7px] lg:w-2 lg:h-2"
                }`}
                style={{
                  backgroundColor: isCurrent
                    ? g.color
                    : isUnlocked
                    ? `${g.color}80`
                    : "var(--gz-cream-dark)",
                }}
                title={`Grado ${g.grado}: ${g.nombre}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Component ─── */

export function LigaViewer({
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
  daysRemaining,
  userId,
  members,
  maxXp,
  desglose,
  totalXpSemanal,
  myPosition,
  promotionSpots,
  relegationSpots,
  historial,
  visibleEnLiga,
}: LigaViewerProps) {
  const [showHistorial, setShowHistorial] = useState(false);
  const total = members.length;

  const isPromoZone = (pos: number) => pos <= promotionSpots;
  const isRelegationZone = (pos: number) =>
    pos > total - relegationSpots && total > relegationSpots;
  const isCurrentUser = (id: string) => id === userId;

  // My member data
  const myMember = members.find((m) => m.userId === userId);

  // Zone text for current user
  const getZoneText = () => {
    if (!myPosition) return null;
    if (isPromoZone(myPosition)) return { text: "Zona de Ascenso", color: "text-gz-sage" };
    if (isRelegationZone(myPosition)) return { text: "Zona de Descenso", color: "text-gz-burgundy" };
    return { text: "Zona Segura", color: "text-gz-ink-mid" };
  };
  const zone = getZoneText();

  // Find the grado info helper
  const findGrado = (num: number) => grados.find(g => g.grado === num);

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="px-4 lg:px-10 pt-8 pb-4">

        {/* ═══ MASTHEAD — full bleed ═══ */}
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium mb-1">
            Liga Semanal · {daysRemaining} día{daysRemaining !== 1 ? "s" : ""} restante{daysRemaining !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-3">
            <img src="/brand/logo-sello.svg" alt="Studio Iuris" className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
            <h1 className="font-cormorant text-[28px] lg:text-[36px] font-bold text-gz-ink">
              La Vida del Derecho
            </h1>
          </div>
      </div>
      <div className="h-[2px]" style={{ backgroundColor: "var(--gz-rule-dark)" }} />
      <div className="mx-auto max-w-5xl px-4 lg:px-10 py-6">

        {/* Visibility notice */}
        {!visibleEnLiga && (
          <div className="mb-4 flex items-center gap-2 rounded-sm border border-gz-gold/30 bg-gz-gold/[0.06] px-4 py-2.5">
            <span className="text-sm">👁️‍🗨️</span>
            <p className="font-archivo text-[12px] text-gz-ink-mid">
              Apareces como &quot;Estudiante anónimo&quot; para los demás.{" "}
              <a href="/dashboard/perfil" className="text-gz-gold underline underline-offset-2 hover:text-gz-gold-bright">
                Cambiar en Preferencias
              </a>
            </p>
          </div>
        )}

        {/* ═══ TU GRADO — Card ═══ */}
        <div className="border border-gz-rule rounded-sm p-5 lg:p-6 mb-6" style={{ backgroundColor: "var(--gz-cream)" }}>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-3">
            Tu Grado
          </p>

          <div className="flex items-start gap-4">
            {/* Grado icon + name */}
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                style={{ backgroundColor: `${gradoColor}20`, color: gradoColor }}
              >
                {gradoEmoji}
              </span>
              <div>
                <h2 className="font-cormorant text-[24px] lg:text-[28px] font-bold text-gz-ink leading-tight">
                  <span className="text-gz-ink-mid font-normal">Grado {userGrado} ·</span>{" "}
                  {gradoNombre}
                </h2>
                <p className="font-archivo text-[13px] text-gz-ink-mid mt-0.5">
                  {nivelLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Progress to next grado */}
          {siguienteGradoNombre && xpSiguienteGrado !== null && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-archivo text-[11px] text-gz-ink-mid">
                  Progreso al siguiente grado
                </span>
                <span className="font-ibm-mono text-[11px] text-gz-ink tabular-nums">
                  {userXp.toLocaleString()} / {xpSiguienteGrado.toLocaleString()} XP
                  <span className="text-gz-ink-light ml-1">({progresoGrado}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-gz-rule/30 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progresoGrado}%`,
                    backgroundColor: gradoColor,
                  }}
                />
              </div>
              <p className="font-archivo text-[11px] text-gz-ink-light mt-1.5">
                → Grado {siguienteGradoNum}: {siguienteGradoNombre}
              </p>
            </div>
          )}

          {/* 33 grado bar */}
          <GradoBar
            grados={grados}
            niveles={niveles}
            userGrado={userGrado}
            userXp={userXp}
          />
        </div>

        {/* ═══ MAIN LAYOUT: Table + Sidebar ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8">

          {/* ─── LEFT: Liga Table ─── */}
          <div>
            {/* Liga header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                Liga Semanal · {total} competidores
              </h3>
            </div>

            {/* My position summary */}
            {myMember && myPosition && (
              <div
                className="flex items-center justify-between mb-4 px-4 py-3 rounded-sm border border-gz-gold/30"
                style={{ backgroundColor: "color-mix(in srgb, var(--gz-gold) 8%, var(--gz-cream))" }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-cormorant text-2xl font-bold text-gz-gold">
                    #{myPosition}
                  </span>
                  <div>
                    <p className="font-archivo text-sm font-semibold text-gz-ink">
                      {myMember.firstName} {myMember.lastName}
                    </p>
                    {zone && (
                      <p className={`font-ibm-mono text-[10px] uppercase tracking-[1px] ${zone.color}`}>
                        {zone.text}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-cormorant text-xl font-bold text-gz-ink">
                    {myMember.weeklyXp.toLocaleString()}
                  </p>
                  <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                    XP semanal
                  </p>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
              {/* Table header */}
              <div className="flex items-center px-4 py-2.5 border-b-2 border-gz-rule">
                <span className="w-10 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">#</span>
                <span className="flex-1 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">Participante</span>
                <span className="w-20 text-center font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light hidden sm:block">Grado</span>
                <span className="w-24 text-right font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">XP</span>
                <span className="w-[120px] lg:w-[140px] text-right font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light hidden sm:block">Progreso</span>
                <span className="w-8"></span>
              </div>

              {/* Rows */}
              {members.map((member) => {
                const promo = isPromoZone(member.position);
                const releg = isRelegationZone(member.position);
                const me = isCurrentUser(member.userId);
                const barWidth = maxXp > 0 ? (member.weeklyXp / maxXp) * 100 : 0;
                const memberGrado = findGrado(member.grado);

                return (
                  <div
                    key={member.userId}
                    className={`
                      flex items-center px-4 py-3 border-b border-gz-rule/50 transition-colors
                      ${promo ? "border-l-2 border-l-gz-sage bg-gz-sage/[0.06]" : ""}
                      ${releg ? "border-l-2 border-l-gz-burgundy bg-gz-burgundy/[0.06]" : ""}
                      ${me ? "ring-1 ring-inset ring-gz-gold/40 bg-gz-gold/[0.08]" : ""}
                      ${!promo && !releg && !me ? "border-l-2 border-l-transparent" : ""}
                    `}
                  >
                    {/* Position */}
                    <span className="w-10">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-archivo text-[11px] font-bold ${
                          member.position <= 3
                            ? "bg-gz-gold/20 text-gz-gold"
                            : "text-gz-ink-light"
                        }`}
                      >
                        {member.position}
                      </span>
                    </span>

                    {/* Name + Avatar */}
                    <div className="flex-1 flex items-center gap-2.5 min-w-0">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover border border-gz-rule flex-shrink-0"
                        />
                      ) : (
                        <span className="h-7 w-7 rounded-full bg-gz-cream-dark flex items-center justify-center text-[10px] font-bold text-gz-ink-light flex-shrink-0">
                          {getInitials(member.firstName, member.lastName)}
                        </span>
                      )}
                      <span className={`font-archivo text-[13px] truncate ${me ? "font-semibold text-gz-gold" : "text-gz-ink"}`}>
                        {member.firstName} {member.lastName}
                        {me && <span className="ml-1 text-[10px] text-gz-ink-light">(tú)</span>}
                      </span>
                    </div>

                    {/* Grado badge */}
                    <span className="w-20 hidden sm:flex items-center justify-center gap-1">
                      <span className="text-[12px]">{memberGrado?.emoji}</span>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-mid">{member.grado}</span>
                    </span>

                    {/* XP */}
                    <span className="w-24 text-right font-ibm-mono text-[12px] font-medium text-gz-ink tabular-nums">
                      {member.weeklyXp.toLocaleString()}
                    </span>

                    {/* Progress bar */}
                    <div className="w-[120px] lg:w-[140px] hidden sm:flex items-center justify-end pl-3">
                      <div className="w-full h-[6px] rounded-full bg-gz-rule/30 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: promo
                              ? "var(--gz-sage)"
                              : releg
                              ? "var(--gz-burgundy)"
                              : me
                              ? "var(--gz-gold)"
                              : "var(--gz-ink-light)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Zone indicator */}
                    <span className="w-8 text-center text-sm">
                      {promo && <span className="text-gz-sage" title="Asciende">▲</span>}
                      {releg && <span className="text-gz-burgundy" title="Desciende">▼</span>}
                      {me && !promo && !releg && <span className="text-gz-gold">★</span>}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] font-ibm-mono uppercase tracking-[1px] text-gz-ink-light">
              {userGrado < 33 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gz-sage/30 border border-gz-sage/50" />
                  Top {promotionSpots} ascienden
                </span>
              )}
              {userGrado > 1 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gz-burgundy/30 border border-gz-burgundy/50" />
                  Bottom {relegationSpots} descienden
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gz-gold/30 border border-gz-gold/50" />
                Tú
              </span>
            </div>
          </div>

          {/* ─── RIGHT: Sidebar ─── */}
          <aside className="space-y-6">

            {/* ─ Desglose XP ─ */}
            <div className="border border-gz-rule rounded-sm p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                  Desglose XP
                </h3>
                <span className="font-cormorant text-lg font-bold text-gz-ink">
                  {totalXpSemanal.toLocaleString()}
                </span>
              </div>

              <div className="border-t border-gz-rule pt-3 space-y-2.5">
                {Object.entries(CATEGORY_META).map(([key, meta]) => {
                  const amount = desglose[key] ?? 0;
                  const pct = totalXpSemanal > 0 ? (amount / totalXpSemanal) * 100 : 0;

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-archivo text-[11px] text-gz-ink-mid">{meta.label}</span>
                        <span className="font-ibm-mono text-[11px] text-gz-ink tabular-nums">
                          {amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-[4px] rounded-full bg-gz-rule/30 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: meta.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─ Grado Progress ─ */}
            <div className="border border-gz-rule rounded-sm p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
              <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-3">
                Progreso de Grado
              </h3>
              <div className="border-t border-gz-rule pt-3">
                <div className="text-center">
                  <span className="text-2xl">{gradoEmoji}</span>
                  <p className="font-cormorant text-[16px] font-bold text-gz-ink mt-1">
                    Grado {userGrado}
                  </p>
                  <p className="font-archivo text-[11px] text-gz-ink-mid">{gradoNombre}</p>
                </div>

                {/* Position bar */}
                {myPosition && (
                  <div className="mt-4">
                    <div className="relative h-3 rounded-full bg-gz-rule/20 overflow-hidden">
                      {/* Promo zone */}
                      <div
                        className="absolute left-0 top-0 h-full bg-gz-sage/20"
                        style={{ width: `${(promotionSpots / total) * 100}%` }}
                      />
                      {/* Releg zone */}
                      {total > relegationSpots && (
                        <div
                          className="absolute right-0 top-0 h-full bg-gz-burgundy/20"
                          style={{ width: `${(relegationSpots / total) * 100}%` }}
                        />
                      )}
                      {/* My position marker */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-gz-gold bg-gz-cream"
                        style={{ left: `${Math.max(2, Math.min(98, ((myPosition - 1) / Math.max(total - 1, 1)) * 100))}%`, transform: "translate(-50%, -50%)" }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 font-ibm-mono text-[8px] text-gz-ink-light">
                      <span>1°</span>
                      <span>#{myPosition} de {total}</span>
                      <span>{total}°</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─ Historial ─ */}
            {historial.length > 0 && (
              <div className="border border-gz-rule rounded-sm p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
                <button
                  onClick={() => setShowHistorial(!showHistorial)}
                  className="w-full flex items-center justify-between"
                >
                  <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                    Historial
                  </h3>
                  <span className={`text-gz-ink-light text-[10px] transition-transform duration-200 ${showHistorial ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>

                {showHistorial && (
                  <div className="border-t border-gz-rule mt-3 pt-3 space-y-2">
                    {historial.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 border-b border-gz-rule/30 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{h.gradoEmoji}</span>
                          <div>
                            <p className="font-archivo text-[11px] text-gz-ink">
                              Grado {h.gradoRef} · {h.gradoNombre}
                            </p>
                            <p className="font-ibm-mono text-[9px] text-gz-ink-light">
                              {formatWeekDate(h.weekStart)} · {h.nivelLabel}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-ibm-mono text-[11px] text-gz-ink tabular-nums">
                            {h.weeklyXp.toLocaleString()} XP
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

        {/* ═══ FOOTER RULE ═══ */}
        <div className="mt-10 relative">
          <div className="border-t-2 border-gz-rule" />
          <div className="border-t border-gz-rule mt-[3px]" />
          <p className="text-center mt-3 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
            Tu Causa · La Vida del Derecho · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </main>
  );
}
