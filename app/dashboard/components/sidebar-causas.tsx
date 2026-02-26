"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PendingCausa {
  id: string;
  challengerName: string;
  createdAt: string;
}

interface ActiveCausa {
  id: string;
  opponentName: string;
  startedAt: string;
}

interface HistoryCausa {
  id: string;
  opponentName: string;
  status: string;
  won: boolean;
  lost: boolean;
  createdAt: string;
}

interface SidebarCausasProps {
  pending: PendingCausa[];
  active: ActiveCausa[];
  history: HistoryCausa[];
}

export function SidebarCausas({
  pending: initialPending,
  active,
  history,
}: SidebarCausasProps) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isEmpty = pending.length === 0 && active.length === 0 && history.length === 0;

  async function handleAccept(causaId: string) {
    setActionLoading(causaId);
    try {
      const res = await fetch(`/api/causas/${causaId}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        setPending((prev) => prev.filter((c) => c.id !== causaId));
        router.push(`/dashboard/causas/${causaId}`);
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(causaId: string) {
    setActionLoading(causaId);
    try {
      const res = await fetch(`/api/causas/${causaId}/reject`, {
        method: "POST",
      });
      if (res.ok) {
        setPending((prev) => prev.filter((c) => c.id !== causaId));
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-navy">⚔️ Causas</h3>
        {pending.length > 0 && (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {pending.length}
          </span>
        )}
      </div>

      {/* Estado vacío */}
      {isEmpty && (
        <div className="mt-4 text-center">
          <p className="text-xs text-navy/50">No tienes causas activas</p>
          <Link
            href="/dashboard/causas"
            className="mt-2 inline-block rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy/90 transition-colors"
          >
            Reta a alguien
          </Link>
        </div>
      )}

      {/* Pendientes */}
      {pending.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/40">
            Pendientes
          </p>
          <div className="mt-1.5 space-y-2">
            {pending.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border bg-paper p-2.5"
              >
                <p className="text-xs font-medium text-navy truncate">
                  {c.challengerName}
                </p>
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    onClick={() => handleAccept(c.id)}
                    disabled={actionLoading === c.id}
                    className="flex-1 rounded bg-green-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleReject(c.id)}
                    disabled={actionLoading === c.id}
                    className="flex-1 rounded bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activas */}
      {active.length > 0 && (
        <div className={`${pending.length > 0 ? "mt-3 border-t border-border pt-3" : "mt-3"}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/40">
            Activas
          </p>
          <div className="mt-1.5 space-y-1.5">
            {active.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/causas/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-2 transition-colors hover:bg-gold/10"
              >
                <span className="text-xs font-medium text-navy truncate">
                  vs {c.opponentName}
                </span>
                <span className="text-[10px] font-semibold text-gold">
                  Jugar &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div className={`${(pending.length > 0 || active.length > 0) ? "mt-3 border-t border-border pt-3" : "mt-3"}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/40">
            Historial
          </p>
          <div className="mt-1.5 space-y-1">
            {history.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/causas/${c.id}`}
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-paper transition-colors"
              >
                <span className="text-navy/70 truncate">
                  vs {c.opponentName}
                </span>
                {c.status === "COMPLETED" ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      c.won
                        ? "bg-green-100 text-green-700"
                        : c.lost
                        ? "bg-red-100 text-red-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.won ? "W" : c.lost ? "L" : "="}
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                    ✗
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      {!isEmpty && (
        <div className="mt-3 border-t border-border pt-3">
          <Link
            href="/dashboard/causas"
            className="block text-center text-xs font-semibold text-gold hover:text-gold/80 transition-colors"
          >
            Ver todas las causas &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
