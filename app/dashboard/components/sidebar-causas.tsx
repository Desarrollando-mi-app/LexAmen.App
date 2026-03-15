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
  // Entrenamiento
  pendingFlashcards: number;
  mcqCount: number;
  tfCount: number;
  // Causas
  pending: PendingCausa[];
  active: ActiveCausa[];
  history: HistoryCausa[];
  // Salas grupales
  activeRooms: number;
}

export function SidebarCausas({
  pendingFlashcards,
  mcqCount,
  tfCount,
  pending: initialPending,
  active,
  history,
  activeRooms,
}: SidebarCausasProps) {
  const router = useRouter();
  const [pending, setPending] = useState(initialPending);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const causasEmpty =
    pending.length === 0 && active.length === 0 && history.length === 0 && activeRooms === 0;

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
    <div className="rounded-[4px] border border-gz-rule bg-white p-4">
      {/* ── Entrenamiento ────────────────────────────── */}
      <h3 className="text-sm font-bold text-navy">📚 Entrenamiento</h3>
      <div className="mt-2.5 space-y-1.5">
        <Link
          href="/dashboard/flashcards"
          className="flex items-center justify-between rounded-[3px] px-2.5 py-2 transition-colors hover:bg-gz-cream-dark"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-navy">
            <span>📇</span> Flashcards
          </span>
          {pendingFlashcards > 0 && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
              {pendingFlashcards}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/mcq"
          className="flex items-center justify-between rounded-[3px] px-2.5 py-2 transition-colors hover:bg-gz-cream-dark"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-navy">
            <span>✅</span> Selección Múltiple
          </span>
          {mcqCount > 0 && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
              {mcqCount}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/truefalse"
          className="flex items-center justify-between rounded-[3px] px-2.5 py-2 transition-colors hover:bg-gz-cream-dark"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-navy">
            <span>⚖️</span> Verdadero / Falso
          </span>
          {tfCount > 0 && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
              {tfCount}
            </span>
          )}
        </Link>
      </div>

      {/* ── Separador ────────────────────────────────── */}
      <div className="my-4 border-t border-gz-rule" />

      {/* ── Causas ───────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-navy">⚔️ Causas</h3>
        {pending.length > 0 && (
          <span className="rounded-full bg-gz-burgundy px-1.5 py-0.5 text-[10px] font-bold text-white">
            {pending.length}
          </span>
        )}
      </div>

      {/* Estado vacío */}
      {causasEmpty && (
        <div className="mt-3 text-center">
          <p className="text-xs text-navy/50">No tienes causas activas</p>
          <Link
            href="/dashboard/causas"
            className="mt-2 inline-block rounded-[3px] bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy/90 transition-colors"
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
                className="rounded-[3px] border border-gz-rule p-2.5" style={{ backgroundColor: "var(--gz-cream)" }}
              >
                <p className="text-xs font-medium text-navy truncate">
                  {c.challengerName}
                </p>
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    onClick={() => handleAccept(c.id)}
                    disabled={actionLoading === c.id}
                    className="flex-1 rounded bg-gz-sage px-2 py-1 text-[10px] font-semibold text-white hover:bg-gz-sage/90 disabled:opacity-50 transition-colors"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleReject(c.id)}
                    disabled={actionLoading === c.id}
                    className="flex-1 rounded bg-gz-burgundy/10 px-2 py-1 text-[10px] font-semibold text-gz-burgundy hover:bg-gz-burgundy/20 disabled:opacity-50 transition-colors"
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
        <div
          className={`${
            pending.length > 0
              ? "mt-3 border-t border-gz-rule pt-3"
              : "mt-3"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/40">
            Activas
          </p>
          <div className="mt-1.5 space-y-1.5">
            {active.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/causas/${c.id}`}
                className="flex items-center justify-between rounded-[3px] border border-gold/30 bg-gold/5 px-2.5 py-2 transition-colors hover:bg-gold/10"
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
        <div
          className={`${
            pending.length > 0 || active.length > 0
              ? "mt-3 border-t border-gz-rule pt-3"
              : "mt-3"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-navy/40">
            Historial
          </p>
          <div className="mt-1.5 space-y-1">
            {history.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/causas/${c.id}`}
                className="flex items-center justify-between rounded-[3px] px-2.5 py-1.5 text-xs hover:bg-gz-cream-dark transition-colors"
              >
                <span className="text-navy/70 truncate">
                  vs {c.opponentName}
                </span>
                {c.status === "COMPLETED" ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      c.won
                        ? "bg-gz-sage/10 text-gz-sage"
                        : c.lost
                        ? "bg-gz-burgundy/10 text-gz-burgundy"
                        : "bg-gz-cream-dark text-gz-ink-mid"
                    }`}
                  >
                    {c.won ? "W" : c.lost ? "L" : "="}
                  </span>
                ) : (
                  <span className="rounded-full bg-gz-cream-dark px-2 py-0.5 text-[10px] font-semibold text-gz-ink-light">
                    ✗
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Salas grupales */}
      {activeRooms > 0 && (
        <div
          className={`${
            pending.length > 0 || active.length > 0 || history.length > 0
              ? "mt-3 border-t border-gz-rule pt-3"
              : "mt-3"
          }`}
        >
          <Link
            href="/dashboard/causas"
            className="flex items-center justify-between rounded-[3px] border border-gold/30 bg-gold/5 px-2.5 py-2 transition-colors hover:bg-gold/10"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-navy">
              <span>🏟️</span> Salas Grupales
            </span>
            <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeRooms}
            </span>
          </Link>
        </div>
      )}

      {/* Footer causas */}
      {!causasEmpty && (
        <div className="mt-3 border-t border-gz-rule pt-3">
          <Link
            href="/dashboard/causas"
            className="block text-center text-xs font-semibold text-gold hover:text-gold/80 transition-colors"
          >
            Ver todas las causas &rarr;
          </Link>
        </div>
      )}

      {/* ── Separador ────────────────────────────────── */}
      <div className="my-4 border-t border-gz-rule" />

      {/* ── La Sala ────────────────────────────────────── */}
      <h3 className="text-sm font-bold text-navy">🏛️ La Sala</h3>
      <div className="mt-2.5">
        <Link
          href="/dashboard/sala"
          className="flex items-center justify-between rounded-[3px] px-2.5 py-2 transition-colors hover:bg-gz-cream-dark"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-navy">
            <span>📋</span> Ayudantias
          </span>
          <span className="text-[10px] font-semibold text-gold">
            Ver &rarr;
          </span>
        </Link>
      </div>

      {/* ── Separador ────────────────────────────────── */}
      <div className="my-4 border-t border-gz-rule" />

      {/* ── Calendario ─────────────────────────────────── */}
      <Link
        href="/dashboard/calendario"
        className="flex items-center gap-2 rounded-[3px] px-2.5 py-2 text-xs font-medium text-navy transition-colors hover:bg-gz-cream-dark"
      >
        <span>📅</span> Calendario
      </Link>
    </div>
  );
}
