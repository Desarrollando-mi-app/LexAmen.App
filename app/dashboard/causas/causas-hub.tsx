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

interface CausasHubProps {
  causasGanadas: number;
  causasPerdidas: number;
  pending: PendingCausa[];
  active: ActiveCausa[];
  history: HistoryCausa[];
}

export function CausasHub({
  causasGanadas,
  causasPerdidas,
  pending: initialPending,
  active,
  history,
}: CausasHubProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(initialPending);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const winRate =
    causasGanadas + causasPerdidas > 0
      ? Math.round(
          (causasGanadas / (causasGanadas + causasPerdidas)) * 100
        )
      : 0;

  async function handleChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/causas/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentEmail: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess(`Reto enviado a ${data.opponentName}`);
      setEmail("");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className="text-xl font-bold text-navy">Causas</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* ─── Estadísticas ─────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {causasGanadas}
            </p>
            <p className="text-xs text-navy/50">Ganadas</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-red-500">
              {causasPerdidas}
            </p>
            <p className="text-xs text-navy/50">Perdidas</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gold">{winRate}%</p>
            <p className="text-xs text-navy/50">Win Rate</p>
          </div>
        </div>

        {/* ─── Retar ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-lg font-semibold text-navy">Desafiar</h2>
          <p className="mt-1 text-sm text-navy/60">
            Ingresa el email de tu oponente para iniciar una causa
          </p>

          <form
            onSubmit={handleChallenge}
            className="mt-4 flex items-center gap-3"
          >
            <input
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy placeholder:text-navy/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Desafiar"}
            </button>
          </form>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="mt-3 text-sm text-green-600">{success}</p>
          )}
        </div>

        {/* ─── Causas activas ────────────────────────────── */}
        {active.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-navy">
              Causas Activas
            </h2>
            <div className="mt-3 space-y-3">
              {active.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/causas/${c.id}`}
                  className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 p-4 transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="font-medium text-navy">
                      vs {c.opponentName}
                    </p>
                    <p className="text-xs text-navy/50">En curso</p>
                  </div>
                  <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
                    Jugar &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─── Pendientes ────────────────────────────────── */}
        {pending.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-navy">
              Retos Pendientes
            </h2>
            <div className="mt-3 space-y-3">
              {pending.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-white p-4"
                >
                  <div>
                    <p className="font-medium text-navy">
                      {c.challengerName}
                    </p>
                    <p className="text-xs text-navy/50">
                      {new Date(c.createdAt).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(c.id)}
                      disabled={actionLoading === c.id}
                      className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleReject(c.id)}
                      disabled={actionLoading === c.id}
                      className="rounded-lg bg-red-100 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-200 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Historial ─────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold text-navy">Historial</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-navy/50">
              Aún no tienes causas completadas
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {history.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/causas/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 transition-colors hover:bg-paper"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">
                      vs {c.opponentName}
                    </p>
                    <p className="text-xs text-navy/50">
                      {new Date(c.createdAt).toLocaleDateString("es-CL")}
                    </p>
                  </div>
                  {c.status === "COMPLETED" ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        c.won
                          ? "bg-green-100 text-green-700"
                          : c.lost
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.won ? "Victoria" : c.lost ? "Derrota" : "Empate"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
                      Rechazada
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
