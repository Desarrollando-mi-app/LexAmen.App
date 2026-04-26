import Link from "next/link";
import {
  getGradoInfo,
  NIVELES,
  PROMOTION_SPOTS,
  RELEGATION_SPOTS,
} from "@/lib/league";
import type { NivelLiga } from "@/lib/league";
import { InfoTooltip } from "@/app/components/info-tooltip";
import { FEATURE_INFO } from "@/lib/feature-info";

interface LigaMember {
  position: number;
  userId: string;
  firstName: string;
  weeklyXp: number;
}

interface GzLigaResumenProps {
  tier: string;
  userGrado: number;
  daysRemaining: number;
  userId: string;
  myPosition: number | null;
  myWeeklyXp: number;
  totalMembers: number;
  topMembers: LigaMember[];
}

export function GzLigaResumen({
  userGrado,
  daysRemaining,
  userId,
  myPosition,
  myWeeklyXp,
  totalMembers,
  topMembers,
}: GzLigaResumenProps) {
  const gradoInfo = getGradoInfo(userGrado);
  const nivelInfo = NIVELES[gradoInfo.nivel as NivelLiga];

  const isPromo = (pos: number) => pos <= PROMOTION_SPOTS;
  const isReleg = (pos: number) =>
    pos > totalMembers - RELEGATION_SPOTS && totalMembers > RELEGATION_SPOTS;

  return (
    <section
      className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)] animate-gz-slide-up"
      style={{ animationDelay: "0.4s" }}
    >
      {/* Rail superior con color del grado */}
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, ${gradoInfo.color}, ${gradoInfo.color}aa)`,
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: gradoInfo.color }}
          />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light truncate flex items-center gap-2">
            Liga · Grado {userGrado}
            <InfoTooltip
              title={FEATURE_INFO.liga.title}
              description={FEATURE_INFO.liga.description}
            />
          </p>
        </div>
        <span
          className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] px-2 py-0.5 rounded-full shrink-0"
          style={{
            color: gradoInfo.color,
            backgroundColor: `color-mix(in srgb, ${gradoInfo.color} 12%, transparent)`,
          }}
        >
          T-{daysRemaining}d
        </span>
      </div>

      {/* Grado banner */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-gz-rule/40">
        <span className="text-[28px]">{gradoInfo.emoji}</span>
        <div className="min-w-0">
          <p className="font-cormorant text-[18px] font-bold italic text-gz-ink leading-tight">
            {gradoInfo.nombre}
          </p>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mt-0.5">
            {nivelInfo?.label ?? gradoInfo.nivel}
          </p>
        </div>
      </div>

      {/* Mi posición */}
      {myPosition && (
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b border-gz-rule/40"
          style={{
            backgroundColor: `color-mix(in srgb, ${gradoInfo.color} 5%, transparent)`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="font-cormorant text-[24px] font-bold leading-none"
              style={{ color: gradoInfo.color }}
            >
              #{myPosition}
            </span>
            <span className="font-archivo text-[11px] text-gz-ink-mid">
              de {totalMembers}
              {isPromo(myPosition) && (
                <span className="ml-1.5 text-gz-sage font-medium">▲ Ascenso</span>
              )}
              {isReleg(myPosition) && (
                <span className="ml-1.5 text-gz-burgundy font-medium">▼ Descenso</span>
              )}
            </span>
          </div>
          <span className="font-ibm-mono text-[12px] font-semibold text-gz-ink tabular-nums">
            {myWeeklyXp.toLocaleString("es-CL")} XP
          </span>
        </div>
      )}

      {/* Mini leaderboard */}
      <div className="px-4 py-2 space-y-0.5">
        {topMembers.map((m) => {
          const me = m.userId === userId;
          return (
            <div
              key={m.userId}
              className={`flex items-center justify-between py-1.5 ${
                me ? "text-gz-gold" : "text-gz-ink-mid"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`font-ibm-mono text-[10px] w-5 text-right tabular-nums ${
                    m.position <= 3 ? "font-bold" : ""
                  }`}
                  style={
                    m.position <= 3
                      ? { color: m.position === 1 ? "var(--gz-gold)" : m.position === 2 ? "var(--gz-ink-mid)" : "#a0673a" }
                      : undefined
                  }
                >
                  {m.position}
                </span>
                <span
                  className={`font-archivo text-[12px] truncate ${
                    me ? "font-semibold" : ""
                  }`}
                >
                  {m.firstName}
                  {me ? " (tú)" : ""}
                </span>
              </div>
              <span className="font-ibm-mono text-[11px] tabular-nums">
                {m.weeklyXp.toLocaleString("es-CL")}
              </span>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="px-4 pb-3 pt-1 border-t border-gz-rule/40">
        <Link
          href="/dashboard/liga"
          className="block text-center font-archivo text-[11px] font-semibold uppercase tracking-[1px] text-gz-gold hover:bg-gz-gold/[0.08] hover:text-gz-burgundy transition-colors py-2 border border-gz-gold/40 rounded-full hover:border-gz-burgundy/40"
        >
          Ver Liga Completa →
        </Link>
      </div>
    </section>
  );
}
