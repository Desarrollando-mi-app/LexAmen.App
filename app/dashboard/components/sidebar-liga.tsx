import Link from "next/link";

interface LeagueMember {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  weeklyXp: number;
}

interface SidebarLigaProps {
  tierLabel: string;
  tierEmoji: string;
  daysRemaining: number;
  userId: string;
  members: LeagueMember[];
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function SidebarLiga({
  tierLabel,
  tierEmoji,
  daysRemaining,
  userId,
  members,
}: SidebarLigaProps) {
  const top10 = members.slice(0, 10);
  const userInTop10 = top10.some((m) => m.userId === userId);
  const userMember = members.find((m) => m.userId === userId);

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-navy">
          {tierEmoji} Liga {tierLabel}
        </h3>
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
          {daysRemaining}d
        </span>
      </div>

      {/* Ranking */}
      <div className="mt-3 space-y-1">
        {top10.map((m) => {
          const isMe = m.userId === userId;
          return (
            <div
              key={m.userId}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${
                isMe
                  ? "border-2 border-gold/30 bg-gold/5"
                  : "hover:bg-paper"
              }`}
            >
              <span className="w-5 text-center font-bold text-navy/50">
                {MEDAL[m.position] ?? m.position}
              </span>
              <span
                className={`flex-1 truncate ${
                  isMe ? "font-semibold text-gold" : "text-navy"
                }`}
              >
                {m.firstName} {m.lastName?.charAt(0)}.
                {isMe && (
                  <span className="ml-1 text-[10px] text-navy/40">(tú)</span>
                )}
              </span>
              <span className="font-mono text-[11px] font-semibold text-navy/60">
                {m.weeklyXp}
              </span>
            </div>
          );
        })}

        {/* Si el usuario está fuera del top 10 */}
        {!userInTop10 && userMember && (
          <>
            <div className="py-1 text-center text-xs text-navy/30">···</div>
            <div className="flex items-center gap-2 rounded-lg border-2 border-gold/30 bg-gold/5 px-2 py-1.5 text-xs">
              <span className="w-5 text-center font-bold text-navy/50">
                {userMember.position}
              </span>
              <span className="flex-1 truncate font-semibold text-gold">
                {userMember.firstName} {userMember.lastName?.charAt(0)}.
                <span className="ml-1 text-[10px] text-navy/40">(tú)</span>
              </span>
              <span className="font-mono text-[11px] font-semibold text-navy/60">
                {userMember.weeklyXp}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 border-t border-border pt-3">
        <Link
          href="/dashboard/liga"
          className="block text-center text-xs font-semibold text-gold hover:text-gold/80 transition-colors"
        >
          Ver liga completa &rarr;
        </Link>
      </div>
    </div>
  );
}
