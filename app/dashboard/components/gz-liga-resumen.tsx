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

/* ─── Types ─── */

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
  topMembers: LigaMember[]; // top 5 for mini-table
}

/* ─── Component ─── */

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
  const isReleg = (pos: number) => pos > totalMembers - RELEGATION_SPOTS && totalMembers > RELEGATION_SPOTS;

  return (
    <section
      className="border border-gz-rule rounded-sm overflow-hidden"
      style={{
        backgroundColor: "var(--gz-cream)",
        animationDelay: "0.35s",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gz-rule">
        <div className="flex items-center gap-2">
          <span className="text-lg">{gradoInfo.emoji}</span>
          <div>
            <p className="font-ibm-mono text-[8px] uppercase tracking-[2px] text-gz-ink-light">
              Grado {userGrado} · {nivelInfo?.label ?? gradoInfo.nivel}
            </p>
            <p className="font-cormorant text-lg font-bold italic text-gz-ink leading-tight flex items-center gap-2">
              {gradoInfo.nombre}
              <InfoTooltip title={FEATURE_INFO.liga.title} description={FEATURE_INFO.liga.description} />
            </p>
          </div>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-gold bg-gz-gold/10 px-2.5 py-1 rounded-full">
          {daysRemaining}d restante{daysRemaining !== 1 ? "s" : ""}
        </span>
      </div>

      {/* My position summary */}
      {myPosition && (
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b border-gz-rule/50"
          style={{ backgroundColor: "color-mix(in srgb, var(--gz-gold) 6%, var(--gz-cream))" }}
        >
          <div className="flex items-center gap-2">
            <span className="font-cormorant text-xl font-bold text-gz-gold">#{myPosition}</span>
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
          <span className="font-ibm-mono text-[11px] text-gz-ink tabular-nums">
            {myWeeklyXp.toLocaleString()} XP
          </span>
        </div>
      )}

      {/* Mini leaderboard */}
      <div className="px-4 py-2">
        {topMembers.map((m) => {
          const me = m.userId === userId;
          return (
            <div
              key={m.userId}
              className={`flex items-center justify-between py-1.5 ${me ? "text-gz-gold" : "text-gz-ink-mid"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`font-ibm-mono text-[10px] w-5 text-right tabular-nums ${
                  m.position <= 3 ? "font-bold text-gz-gold" : ""
                }`}>
                  {m.position}
                </span>
                <span className={`font-archivo text-[12px] truncate ${me ? "font-semibold" : ""}`}>
                  {m.firstName}{me ? " (tú)" : ""}
                </span>
              </div>
              <span className="font-ibm-mono text-[10px] tabular-nums">
                {m.weeklyXp.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="px-4 pb-3 pt-1">
        <Link
          href="/dashboard/liga"
          className="block text-center font-archivo text-[11px] font-semibold uppercase tracking-[1px] text-gz-gold hover:text-gz-gold-bright transition-colors py-2 border border-gz-gold/30 rounded-sm hover:bg-gz-gold/5"
        >
          Ver Liga Completa →
        </Link>
      </div>
    </section>
  );
}
