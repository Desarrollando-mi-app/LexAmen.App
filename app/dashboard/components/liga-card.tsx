import Link from "next/link";

interface LeagueMember {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  weeklyXp: number;
}

interface LigaCardProps {
  tierLabel: string;
  tierEmoji: string;
  tierKey: string;
  daysRemaining: number;
  userId: string;
  members: LeagueMember[];
}

// XP thresholds per tier for the progress bar toward next tier
const TIER_XP_THRESHOLDS: Record<string, number> = {
  CARTON: 50,
  HIERRO: 100,
  BRONCE: 200,
  COBRE: 350,
  PLATA: 500,
  ORO: 750,
  DIAMANTE: 1000,
  PLATINO: 1500,
  JURISCONSULTO: 9999,
};

const NEXT_TIER_LABEL: Record<string, string> = {
  CARTON: "Hierro",
  HIERRO: "Bronce",
  BRONCE: "Cobre",
  COBRE: "Plata",
  PLATA: "Oro",
  ORO: "Diamante",
  DIAMANTE: "Platino",
  PLATINO: "Jurisconsulto",
  JURISCONSULTO: "",
};

export function LigaCard({
  tierLabel,
  tierEmoji,
  tierKey,
  daysRemaining,
  userId,
  members,
}: LigaCardProps) {
  const userMember = members.find((m) => m.userId === userId);
  const userPosition = userMember
    ? members.indexOf(userMember) + 1
    : members.length;
  const userXp = userMember?.weeklyXp ?? 0;

  const threshold = TIER_XP_THRESHOLDS[tierKey] ?? 100;
  const nextTier = NEXT_TIER_LABEL[tierKey] ?? "";
  const isMaxTier = tierKey === "JURISCONSULTO";
  const progressPercent = isMaxTier
    ? 100
    : Math.min(100, Math.round((userXp / threshold) * 100));

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-navy font-cormorant flex items-center gap-1.5">
          <span>{tierEmoji}</span> Liga {tierLabel}
        </h3>
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold text-gold">
          {daysRemaining}d restantes
        </span>
      </div>

      {/* Position */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-navy/50">Tu posición</p>
          <p className="text-2xl font-bold text-navy font-cormorant">
            #{userPosition}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-navy/50">XP semanal</p>
          <p className="text-2xl font-bold text-gold font-cormorant">
            {new Intl.NumberFormat("es-CL").format(userXp)}
          </p>
        </div>
      </div>

      {/* Progress bar toward next tier */}
      {!isMaxTier && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-navy/40">
              Progreso a Liga {nextTier}
            </p>
            <p className="text-[10px] font-semibold text-navy/50">
              {progressPercent}%
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/30">
            <div
              className="h-2 rounded-full bg-gold transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-[9px] text-navy/30">
            {new Intl.NumberFormat("es-CL").format(userXp)} /{" "}
            {new Intl.NumberFormat("es-CL").format(threshold)} XP
          </p>
        </div>
      )}

      {isMaxTier && (
        <p className="mb-4 text-xs text-gold font-semibold text-center">
          ⚖️ Máximo rango alcanzado
        </p>
      )}

      {/* CTA */}
      <Link
        href="/dashboard/liga"
        className="block text-center rounded-[3px] bg-navy/5 px-3 py-2 text-xs font-semibold text-navy hover:bg-navy/10 transition-colors"
      >
        Ver mi liga →
      </Link>
    </div>
  );
}
