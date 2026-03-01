"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BADGE_RULES } from "@/lib/badge-constants";

// ─── Types ───────────────────────────────────────────────

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

interface ActiveRoom {
  id: string;
  code: string;
  mode: string;
  status: string;
  maxPlayers: number;
  participantCount: number;
  creatorName: string;
  createdAt: string;
}

interface RoomHistory {
  id: string;
  participantCount: number;
  position: number | null;
  score: number;
  createdAt: string;
}

interface CausasHubProps {
  causasGanadas: number;
  causasPerdidas: number;
  pending: PendingCausa[];
  active: ActiveCausa[];
  history: HistoryCausa[];
  activeRooms: ActiveRoom[];
  roomHistory: RoomHistory[];
  earnedBadges: string[];
}

// ─── Component ───────────────────────────────────────────

export function CausasHub({
  causasGanadas,
  causasPerdidas,
  pending: initialPending,
  active,
  history,
  activeRooms,
  roomHistory,
  earnedBadges,
}: CausasHubProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"individual" | "grupal">("individual");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(initialPending);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal crear sala
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomMateria, setRoomMateria] = useState("");
  const [roomDifficulty, setRoomDifficulty] = useState("");
  const [roomMaxPlayers, setRoomMaxPlayers] = useState(10);
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Unirse por código
  const [joinCode, setJoinCode] = useState("");
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const winRate =
    causasGanadas + causasPerdidas > 0
      ? Math.round(
          (causasGanadas / (causasGanadas + causasPerdidas)) * 100
        )
      : 0;

  // ─── Handlers 1v1 ─────────────────────────────────────

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
      const res = await fetch(`/api/causas/${causaId}/accept`, { method: "POST" });
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
      const res = await fetch(`/api/causas/${causaId}/reject`, { method: "POST" });
      if (res.ok) {
        setPending((prev) => prev.filter((c) => c.id !== causaId));
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Handlers Grupal ──────────────────────────────────

  async function handleCreateRoom() {
    setCreatingRoom(true);
    try {
      const res = await fetch("/api/causa-rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "individual",
          materia: roomMateria || undefined,
          difficulty: roomDifficulty || undefined,
          maxPlayers: roomMaxPlayers,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/causas/sala/${data.roomId}`);
      } else {
        setError(data.error);
        setShowCreateModal(false);
      }
    } catch {
      setError("Error de conexión");
      setShowCreateModal(false);
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoiningRoom(true);
    setJoinError(null);

    try {
      const res = await fetch("/api/causa-rooms/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/causas/sala/${data.roomId}`);
      } else {
        setJoinError(data.error);
      }
    } catch {
      setJoinError("Error de conexión");
    } finally {
      setJoiningRoom(false);
    }
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/dashboard" className="text-sm text-navy/60 hover:text-navy">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold text-navy">Causas</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* ─── Insignias ──────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-sm font-semibold text-navy/70 uppercase tracking-wider">
            Insignias
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {BADGE_RULES.map((badge) => {
              const earned = earnedBadges.includes(badge.slug);
              return (
                <div
                  key={badge.slug}
                  className={`text-center transition-opacity ${
                    earned ? "" : "opacity-25 grayscale"
                  }`}
                  title={badge.description}
                >
                  <span className="text-3xl">{badge.emoji}</span>
                  <p className="mt-1 text-[11px] font-medium text-navy leading-tight">
                    {badge.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Tabs ───────────────────────────────────────── */}
        <div className="flex gap-2 rounded-lg bg-border/20 p-1">
          <button
            onClick={() => setTab("individual")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "individual"
                ? "bg-white text-navy shadow-sm"
                : "text-navy/50 hover:text-navy"
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setTab("grupal")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "grupal"
                ? "bg-white text-navy shadow-sm"
                : "text-navy/50 hover:text-navy"
            }`}
          >
            Grupal
            {activeRooms.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-white">
                {activeRooms.length}
              </span>
            )}
          </button>
        </div>

        {/* ─── Estadísticas ──────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{causasGanadas}</p>
            <p className="text-xs text-navy/50">Ganadas</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{causasPerdidas}</p>
            <p className="text-xs text-navy/50">Perdidas</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gold">{winRate}%</p>
            <p className="text-xs text-navy/50">Win Rate</p>
          </div>
        </div>

        {/* ─── TAB: Individual ───────────────────────────── */}
        {tab === "individual" && (
          <>
            {/* Retar */}
            <div className="rounded-xl border border-border bg-white p-6">
              <h2 className="text-lg font-semibold text-navy">Desafiar</h2>
              <p className="mt-1 text-sm text-navy/60">
                Ingresa el email de tu oponente para iniciar una causa
              </p>
              <form onSubmit={handleChallenge} className="mt-4 flex items-center gap-3">
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
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
            </div>

            {/* Activas */}
            {active.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-navy">Causas Activas</h2>
                <div className="mt-3 space-y-3">
                  {active.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/causas/${c.id}`}
                      className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 p-4 transition-shadow hover:shadow-md"
                    >
                      <div>
                        <p className="font-medium text-navy">vs {c.opponentName}</p>
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

            {/* Pendientes */}
            {pending.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-navy">Retos Pendientes</h2>
                <div className="mt-3 space-y-3">
                  {pending.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-white p-4"
                    >
                      <div>
                        <p className="font-medium text-navy">{c.challengerName}</p>
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

            {/* Historial */}
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
                        <p className="text-sm font-medium text-navy">vs {c.opponentName}</p>
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
          </>
        )}

        {/* ─── TAB: Grupal ───────────────────────────────── */}
        {tab === "grupal" && (
          <>
            {/* Crear / Unirse */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Crear sala */}
              <div className="rounded-xl border border-border bg-white p-6">
                <h2 className="text-lg font-semibold text-navy">Crear Sala</h2>
                <p className="mt-1 text-sm text-navy/60">
                  Crea una sala y comparte el código
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 w-full rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
                >
                  Crear Sala
                </button>
              </div>

              {/* Unirse por código */}
              <div className="rounded-xl border border-border bg-white p-6">
                <h2 className="text-lg font-semibold text-navy">Unirse</h2>
                <p className="mt-1 text-sm text-navy/60">
                  Ingresa el código de la sala
                </p>
                <form onSubmit={handleJoinByCode} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="CÓDIGO"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="flex-1 rounded-lg border border-border bg-paper px-4 py-2.5 text-sm font-mono text-navy uppercase placeholder:text-navy/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  <button
                    type="submit"
                    disabled={joiningRoom || joinCode.length < 4}
                    className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90 disabled:opacity-50"
                  >
                    {joiningRoom ? "..." : "Unirse"}
                  </button>
                </form>
                {joinError && (
                  <p className="mt-2 text-sm text-red-600">{joinError}</p>
                )}
              </div>
            </div>

            {/* Salas activas */}
            {activeRooms.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-navy">Salas Activas</h2>
                <div className="mt-3 space-y-3">
                  {activeRooms.map((r) => (
                    <Link
                      key={r.id}
                      href={`/dashboard/causas/sala/${r.id}`}
                      className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 p-4 transition-shadow hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-navy">
                            Sala de {r.creatorName}
                          </p>
                          <span className="rounded-full bg-border/40 px-2 py-0.5 text-[10px] font-mono text-navy/50">
                            {r.code}
                          </span>
                        </div>
                        <p className="text-xs text-navy/50">
                          {r.participantCount}/{r.maxPlayers} jugadores ·{" "}
                          {r.status === "lobby" ? "En espera" : "En curso"}
                        </p>
                      </div>
                      <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
                        {r.status === "lobby" ? "Entrar" : "Jugar"} &rarr;
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Historial salas */}
            <div>
              <h2 className="text-lg font-semibold text-navy">Historial Grupal</h2>
              {roomHistory.length === 0 ? (
                <p className="mt-3 text-sm text-navy/50">
                  Aún no has participado en causas grupales
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {roomHistory.map((r) => (
                    <Link
                      key={r.id}
                      href={`/dashboard/causas/sala/${r.id}`}
                      className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 transition-colors hover:bg-paper"
                    >
                      <div>
                        <p className="text-sm font-medium text-navy">
                          {r.participantCount} jugadores · {r.score} pts
                        </p>
                        <p className="text-xs text-navy/50">
                          {new Date(r.createdAt).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          r.position === 1
                            ? "bg-green-100 text-green-700"
                            : r.position === 2
                            ? "bg-blue-100 text-blue-700"
                            : r.position === 3
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.position === 1
                          ? "🥇 1°"
                          : r.position === 2
                          ? "🥈 2°"
                          : r.position === 3
                          ? "🥉 3°"
                          : `${r.position}°`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Modal Crear Sala ──────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy">Crear Causa Grupal</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-navy/70">Materia</label>
                <select
                  value={roomMateria}
                  onChange={(e) => setRoomMateria(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy focus:border-gold focus:outline-none"
                >
                  <option value="">Todas</option>
                  <option value="TEORIA_DE_LA_LEY">Teoría de la Ley</option>
                  <option value="JURISDICCION_Y_COMPETENCIA">
                    Jurisdicción y Competencia
                  </option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-navy/70">
                  Dificultad
                </label>
                <select
                  value={roomDifficulty}
                  onChange={(e) => setRoomDifficulty(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy focus:border-gold focus:outline-none"
                >
                  <option value="">Mixto</option>
                  <option value="BASICO">Básico</option>
                  <option value="INTERMEDIO">Intermedio</option>
                  <option value="AVANZADO">Avanzado</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-navy/70">
                  Max. jugadores (2-10)
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={roomMaxPlayers}
                  onChange={(e) => setRoomMaxPlayers(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-navy/70 transition-colors hover:bg-paper"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={creatingRoom}
                className="flex-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
              >
                {creatingRoom ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
