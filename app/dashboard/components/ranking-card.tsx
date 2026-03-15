import Link from "next/link";

interface RankingUser {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  xp: number;
}

interface RankingCardProps {
  topUsers: RankingUser[];
  currentUser: RankingUser | null;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function RankingCard({ topUsers, currentUser }: RankingCardProps) {
  const top5 = topUsers.slice(0, 5);
  const userInTop5 = top5.some((u) => u.userId === currentUser?.userId);

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-navy font-cormorant flex items-center gap-1.5">
          <span>🏆</span> Ranking
        </h3>
        <Link href="/dashboard/ranking"
          className="text-[10px] font-semibold text-gold hover:text-gold/80 transition-colors">
          Ver completo &rarr;
        </Link>
      </div>

      <div className="space-y-1">
        {top5.map((u) => {
          const isMe = u.userId === currentUser?.userId;
          return (
            <div key={u.userId}
              className={`flex items-center gap-2 rounded-[3px] px-2.5 py-1.5 text-xs ${
                isMe ? "border border-gold/30 bg-gold/5" : "hover:bg-gz-cream-dark"
              }`}>
              <span className="w-5 text-center font-bold text-navy/50">
                {MEDAL[u.position] ?? u.position}
              </span>
              <span className={`flex-1 truncate ${isMe ? "font-semibold text-gold" : "text-navy"}`}>
                {u.firstName} {u.lastName?.charAt(0)}.
                {isMe && <span className="ml-1 text-[10px] text-navy/40">(tú)</span>}
              </span>
              <span className="font-mono text-[10px] font-semibold text-navy/50">
                {new Intl.NumberFormat("es-CL").format(u.xp)} XP
              </span>
            </div>
          );
        })}

        {/* Current user outside top 5 */}
        {!userInTop5 && currentUser && (
          <>
            <div className="py-0.5 text-center text-[10px] text-navy/20">···</div>
            <div className="flex items-center gap-2 rounded-[3px] border border-gold/30 bg-gold/5 px-2.5 py-1.5 text-xs">
              <span className="w-5 text-center font-bold text-navy/50">{currentUser.position}</span>
              <span className="flex-1 truncate font-semibold text-gold">
                {currentUser.firstName} {currentUser.lastName?.charAt(0)}.
                <span className="ml-1 text-[10px] text-navy/40">(tú)</span>
              </span>
              <span className="font-mono text-[10px] font-semibold text-navy/50">
                {new Intl.NumberFormat("es-CL").format(currentUser.xp)} XP
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
