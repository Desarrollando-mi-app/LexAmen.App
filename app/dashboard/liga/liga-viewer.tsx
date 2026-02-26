"use client";

import Link from "next/link";

interface Member {
  position: number;
  userId: string;
  firstName: string;
  lastName: string;
  weeklyXp: number;
}

interface LigaViewerProps {
  tier: string;
  tierLabel: string;
  tierEmoji: string;
  weekStart: string;
  weekEnd: string;
  daysRemaining: number;
  userId: string;
  members: Member[];
}

export function LigaViewer({
  tierLabel,
  tierEmoji,
  daysRemaining,
  userId,
  members,
}: LigaViewerProps) {
  const total = members.length;

  // Zonas: top 5 ascienden (verde), bottom 5 descienden (rojo)
  const isPromoZone = (pos: number) => pos <= 5;
  const isRelegationZone = (pos: number) => pos > total - 5 && total > 5;
  const isCurrentUser = (id: string) => id === userId;

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-navy/60 hover:text-navy"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold text-navy">
            {tierEmoji} Liga {tierLabel}
          </h1>
          <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
            {daysRemaining} día{daysRemaining !== 1 ? "s" : ""} restante
            {daysRemaining !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* Tabla de ranking */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-navy/5">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-navy/60">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-navy/60">
                  Nombre
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-navy/60">
                  XP Semanal
                </th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const promo = isPromoZone(member.position);
                const releg = isRelegationZone(member.position);
                const me = isCurrentUser(member.userId);

                return (
                  <tr
                    key={member.userId}
                    className={`border-b border-border/50 transition-colors ${
                      me
                        ? "bg-gold/10 ring-2 ring-inset ring-gold/30"
                        : promo
                        ? "bg-green-50"
                        : releg
                        ? "bg-red-50"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                          member.position <= 3
                            ? "bg-gold/20 text-gold"
                            : "text-navy/60"
                        }`}
                      >
                        {member.position}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-medium ${
                          me ? "text-gold" : "text-navy"
                        }`}
                      >
                        {member.firstName} {member.lastName}
                        {me && (
                          <span className="ml-2 text-xs text-navy/50">
                            (tú)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-navy">
                        {member.weeklyXp.toLocaleString()}
                      </span>
                      <span className="ml-1 text-xs text-navy/50">XP</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {promo && (
                        <span className="text-green-600" title="Zona de ascenso">
                          ↑
                        </span>
                      )}
                      {releg && (
                        <span className="text-red-500" title="Zona de descenso">
                          ↓
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-navy/50">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-100 border border-green-300"></span>
            Top 5 — Ascienden
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-100 border border-red-300"></span>
            Bottom 5 — Descienden
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-gold/20 border border-gold/40"></span>
            Tú
          </span>
        </div>
      </div>
    </main>
  );
}
