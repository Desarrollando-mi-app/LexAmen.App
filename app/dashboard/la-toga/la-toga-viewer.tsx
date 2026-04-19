"use client";

import Link from "next/link";
import type { TogaTier } from "@/lib/la-toga";

/* ─── Types ─── */

interface Member {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  weeklyXp: number;
  grado: number;
  togaTierId: number;
  togaTierName: string;
  togaTierEmoji: string;
}

interface LaTogaViewerProps {
  daysRemaining: number;
  userId: string;
  members: Member[];
  maxXp: number;
  desglose: Record<string, number>;
  totalXpSemanal: number;
  myPosition: number | null;
  promotionSpots: number;
  relegationSpots: number;
  visibleEnLiga: boolean;
  togaTiers: TogaTier[];
  myTogaTier: TogaTier;
  myPercentile: number;
  nextTogaTier: TogaTier | null;
  xpToNextTier: number | null;
  totalActiveUsers: number;
  userGradoEmoji: string;
  userGradoNombre: string;
  userGradoNum: number;
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

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function tokenToColor(token: string): string {
  const [name, opacityStr] = token.split("/");
  const base = `var(--${name})`;
  if (!opacityStr) return base;
  const pct = Math.max(0, Math.min(100, parseInt(opacityStr)));
  return `color-mix(in srgb, ${base} ${pct}%, transparent)`;
}

/* ─── Component ─── */

export function LaTogaViewer({
  daysRemaining,
  userId,
  members,
  maxXp,
  desglose,
  totalXpSemanal,
  myPosition,
  promotionSpots,
  relegationSpots,
  visibleEnLiga,
  togaTiers,
  myTogaTier,
  myPercentile,
  nextTogaTier,
  xpToNextTier,
  totalActiveUsers,
  userGradoEmoji,
  userGradoNombre,
  userGradoNum,
}: LaTogaViewerProps) {
  const total = members.length;
  const isPromoZone = (pos: number) => pos <= promotionSpots;
  const isRelegationZone = (pos: number) =>
    pos > total - relegationSpots && total > relegationSpots;
  const isCurrentUser = (id: string) => id === userId;
  const myMember = members.find((m) => m.userId === userId);

  const getZoneText = () => {
    if (!myPosition) return null;
    if (isPromoZone(myPosition))
      return { text: "Zona de Ascenso", color: "text-gz-sage" };
    if (isRelegationZone(myPosition))
      return { text: "Zona de Descenso", color: "text-gz-burgundy" };
    return { text: "Zona Segura", color: "text-gz-ink-mid" };
  };
  const zone = getZoneText();

  return (
    <main
      className="min-h-screen pb-24"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="px-4 lg:px-10 pt-8 pb-4">
        {/* ═══ MASTHEAD ═══ */}
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium mb-1">
          Escalafón Semanal · {daysRemaining} día
          {daysRemaining !== 1 ? "s" : ""} restante
          {daysRemaining !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-3">
          <img
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
          />
          <div>
            <h1 className="font-cormorant text-[28px] lg:text-[36px] font-bold text-gz-ink leading-none">
              La Liga de la Toga
            </h1>
            <p className="font-archivo text-[12px] lg:text-[13px] text-gz-ink-mid italic mt-1">
              Escalafón semanal de competencia jurídica
            </p>
          </div>
        </div>
      </div>
      <div
        className="h-[2px]"
        style={{ backgroundColor: "var(--gz-rule-dark)" }}
      />

      <div className="mx-auto max-w-5xl px-4 lg:px-10 py-6">
        {!visibleEnLiga && (
          <div className="mb-4 flex items-center gap-2 rounded-sm border border-gz-gold/30 bg-gz-gold/[0.06] px-4 py-2.5">
            <span className="text-sm">👁️‍🗨️</span>
            <p className="font-archivo text-[12px] text-gz-ink-mid">
              Apareces como &quot;Estudiante anónimo&quot; para los demás.{" "}
              <a
                href="/dashboard/perfil/configuracion"
                className="text-gz-gold underline underline-offset-2 hover:text-gz-gold-bright"
              >
                Cambiar en Preferencias
              </a>
            </p>
          </div>
        )}

        {/* Tarjeta principal de tier */}
        <TogaTierCard
          myTier={myTogaTier}
          myPercentile={myPercentile}
          myWeeklyXp={myMember?.weeklyXp ?? 0}
          nextTier={nextTogaTier}
          xpToNext={xpToNextTier}
          totalActive={totalActiveUsers}
        />

        {/* Ladder vertical */}
        <TogaLadder tiers={togaTiers} currentTierId={myTogaTier.id} />

        {/* ═══ MAIN LAYOUT: Table + Sidebar ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8">
          {/* ─── LEFT: Tabla ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                Tu sala · {total} competidores
              </h3>
            </div>

            {myMember && myPosition && (
              <div
                className="flex items-center justify-between mb-4 px-4 py-3 rounded-sm border border-gz-gold/30"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--gz-gold) 8%, var(--gz-cream))",
                }}
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
                      <p
                        className={`font-ibm-mono text-[10px] uppercase tracking-[1px] ${zone.color}`}
                      >
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

            <div
              className="border border-gz-rule rounded-sm overflow-hidden"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <div className="flex items-center px-4 py-2.5 border-b-2 border-gz-rule">
                <span className="w-10 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                  #
                </span>
                <span className="flex-1 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                  Participante
                </span>
                <span className="w-20 text-center font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light hidden sm:block">
                  Tier
                </span>
                <span className="w-24 text-right font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                  XP
                </span>
                <span className="w-[120px] lg:w-[140px] text-right font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light hidden sm:block">
                  Progreso
                </span>
                <span className="w-8"></span>
              </div>

              {members.map((member) => {
                const promo = isPromoZone(member.position);
                const releg = isRelegationZone(member.position);
                const me = isCurrentUser(member.userId);
                const barWidth =
                  maxXp > 0 ? (member.weeklyXp / maxXp) * 100 : 0;

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
                      <span
                        className={`font-archivo text-[13px] truncate ${me ? "font-semibold text-gz-gold" : "text-gz-ink"}`}
                      >
                        {member.firstName} {member.lastName}
                        {me && (
                          <span className="ml-1 text-[10px] text-gz-ink-light">
                            (tú)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Tier badge */}
                    <span
                      className="w-20 hidden sm:flex items-center justify-center gap-1"
                      title={`La Liga de la Toga · ${member.togaTierName}`}
                    >
                      <span className="text-[14px]" aria-hidden>
                        {member.togaTierEmoji}
                      </span>
                      <span className="font-ibm-mono text-[9px] uppercase tracking-[0.5px] text-gz-ink-mid truncate max-w-[60px]">
                        {member.togaTierName}
                      </span>
                    </span>

                    <span className="w-24 text-right font-ibm-mono text-[12px] font-medium text-gz-ink tabular-nums">
                      {member.weeklyXp.toLocaleString()}
                    </span>

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

                    <span className="w-8 text-center text-sm">
                      {promo && (
                        <span className="text-gz-sage" title="Asciende">
                          ▲
                        </span>
                      )}
                      {releg && (
                        <span className="text-gz-burgundy" title="Desciende">
                          ▼
                        </span>
                      )}
                      {me && !promo && !releg && (
                        <span className="text-gz-gold">★</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[10px] font-ibm-mono uppercase tracking-[1px] text-gz-ink-light">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gz-sage/30 border border-gz-sage/50" />
                Top {promotionSpots} ascienden
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gz-burgundy/30 border border-gz-burgundy/50" />
                Bottom {relegationSpots} descienden
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gz-gold/30 border border-gz-gold/50" />
                Tú
              </span>
            </div>
          </div>

          {/* ─── RIGHT: Sidebar ─── */}
          <aside className="space-y-6">
            <div
              className="border border-gz-rule rounded-sm p-4"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
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
                  const pct =
                    totalXpSemanal > 0 ? (amount / totalXpSemanal) * 100 : 0;

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-archivo text-[11px] text-gz-ink-mid">
                          {meta.label}
                        </span>
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

            {/* Cross-link a La Vida del Derecho */}
            <Link
              href="/dashboard/vida-del-derecho"
              className="group block border border-gz-rule rounded-sm p-4 hover:border-gz-gold/50 transition-colors"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2">
                La Vida del Derecho
              </p>
              <div className="border-t border-gz-rule pt-3 flex items-center gap-3">
                <span className="text-2xl">{userGradoEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-cormorant text-[15px] font-bold text-gz-ink truncate">
                    Grado {userGradoNum}
                  </p>
                  <p className="font-archivo text-[11px] text-gz-ink-mid truncate">
                    {userGradoNombre}
                  </p>
                </div>
                <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold group-hover:text-gz-gold-bright">
                  Ver →
                </span>
              </div>
            </Link>
          </aside>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="mt-10 relative">
          <div className="border-t-2 border-gz-rule" />
          <div className="border-t border-gz-rule mt-[3px]" />
          <p className="text-center mt-3 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
            La Liga de la Toga · Escalafón Semanal · Studio Iuris · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </main>
  );
}

// ─── La Toga sub-components ─────────────────────────────────

function TogaTierCard({
  myTier,
  myPercentile,
  myWeeklyXp,
  nextTier,
  xpToNext,
  totalActive,
}: {
  myTier: TogaTier;
  myPercentile: number;
  myWeeklyXp: number;
  nextTier: TogaTier | null;
  xpToNext: number | null;
  totalActive: number;
}) {
  const color = tokenToColor(myTier.color);
  const border = tokenToColor(myTier.borderColor);
  const bg = tokenToColor(myTier.bgColor);
  const progressPct =
    nextTier && xpToNext !== null && myWeeklyXp > 0
      ? Math.round(
          (myWeeklyXp / (myWeeklyXp + Math.max(1, xpToNext))) * 100
        )
      : myTier.id === 11
        ? 100
        : 0;

  return (
    <div
      className="rounded-sm p-5 lg:p-6 mb-3"
      style={{ backgroundColor: bg, border: `1px solid ${border}` }}
    >
      <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-3">
        Tu posición en La Liga de la Toga esta semana
      </p>

      <div className="flex items-start gap-4">
        <span
          className="inline-flex h-14 w-14 items-center justify-center rounded-full text-3xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
            border: `1px solid ${border}`,
          }}
          aria-hidden
        >
          {myTier.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2
              className="font-cormorant text-[26px] lg:text-[30px] font-bold leading-tight"
              style={{ color }}
            >
              {myTier.nombre}
            </h2>
            {myTier.badge && (
              <span className="text-lg" aria-hidden>
                {myTier.badge}
              </span>
            )}
          </div>
          <p className="font-cormorant italic text-[14px] text-gz-ink-mid mt-0.5">
            &ldquo;{myTier.descripcion}&rdquo;
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            <span>{myTier.topLabel}</span>
            <span aria-hidden>·</span>
            <span>
              XP semana:{" "}
              <span className="text-gz-ink tabular-nums">
                {myWeeklyXp.toLocaleString()}
              </span>
            </span>
            {totalActive >= 5 && (
              <>
                <span aria-hidden>·</span>
                <span>
                  Percentil{" "}
                  <span className="text-gz-ink tabular-nums">
                    {myPercentile}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {nextTier && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-archivo text-[11px] text-gz-ink-mid">
              → {nextTier.emoji} {nextTier.nombre}
            </span>
            {xpToNext !== null && xpToNext > 0 && (
              <span className="font-ibm-mono text-[11px] text-gz-ink-mid tabular-nums">
                Faltan {xpToNext.toLocaleString()} XP
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-gz-rule/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}

      {totalActive < 5 && (
        <p className="mt-3 font-archivo text-[11px] italic text-gz-ink-light">
          Tier provisional — se necesitan al menos 5 competidores activos esta
          semana para calcular percentil.
        </p>
      )}
    </div>
  );
}

function TogaLadder({
  tiers,
  currentTierId,
}: {
  tiers: TogaTier[];
  currentTierId: number;
}) {
  const sorted = [...tiers].sort((a, b) => b.id - a.id);

  return (
    <div
      className="border border-gz-rule rounded-sm p-4 lg:p-5 mb-6"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
          Los 11 Tiers · La Liga de la Toga
        </h3>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light/80">
          Se recalcula cada lunes
        </span>
      </div>

      <div className="border-t border-gz-rule pt-2 divide-y divide-gz-rule/40">
        {sorted.map((t) => {
          const isCurrent = t.id === currentTierId;
          const color = tokenToColor(t.color);
          const border = tokenToColor(t.borderColor);
          const bg = tokenToColor(t.bgColor);
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-sm transition-colors"
              style={
                isCurrent
                  ? {
                      backgroundColor: bg,
                      boxShadow: `inset 0 0 0 1px ${border}`,
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
                <span className="text-[18px]" aria-hidden>
                  {t.emoji}
                </span>
                {t.badge && (
                  <span
                    className="text-[12px] text-gz-ink-light"
                    aria-hidden
                  >
                    {t.badge}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="font-cormorant text-[16px] font-bold leading-tight truncate"
                  style={{ color: isCurrent ? color : undefined }}
                >
                  {t.nombre}
                  {isCurrent && (
                    <span className="ml-2 font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold">
                      · Tú
                    </span>
                  )}
                </p>
                <p className="font-archivo text-[11px] text-gz-ink-mid truncate hidden sm:block">
                  {t.descripcion}
                </p>
              </div>

              <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light tabular-nums w-16 text-right flex-shrink-0">
                {t.topLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
