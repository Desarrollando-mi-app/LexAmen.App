"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BADGE_RULES } from "@/lib/badge-constants";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";

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

interface ColegaForChallenge {
  id: string;
  firstName: string;
  lastName: string;
  tier: string | null;
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
  colegas?: ColegaForChallenge[];
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
  colegas = [],
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
  const [roomRama, setRoomRama] = useState("");
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
      toast.success(`Reto enviado a ${data.opponentName}`);
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
        toast.success("Causa aceptada ⚔️");
        router.push(`/dashboard/causas/${causaId}`);
      }
    } catch {
      toast.error("Ocurrió un error, intenta de nuevo");
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
        toast.success("Causa rechazada");
      }
    } catch {
      toast.error("Ocurrió un error, intenta de nuevo");
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Handler desafiar colega ─────────────────────────

  const [challengingColega, setChallengingColega] = useState<string | null>(null);

  async function handleChallengeColega(colegaId: string, colegaName: string) {
    setChallengingColega(colegaId);
    try {
      const res = await fetch("/api/causas/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: colegaId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al desafiar");
        return;
      }
      toast.success(`Reto enviado a ${colegaName}`);
      router.refresh();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setChallengingColega(null);
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
          rama: roomRama || undefined,
          difficulty: roomDifficulty || undefined,
          maxPlayers: roomMaxPlayers,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Sala creada");
        router.push(`/dashboard/causas/sala/${data.roomId}`);
      } else {
        toast.error(data.error ?? "No se pudo crear la sala");
        setShowCreateModal(false);
      }
    } catch {
      toast.error("Error de conexión");
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
        toast.error(data.error ?? "Código inválido");
        setJoinError(data.error);
      }
    } catch {
      toast.error("Error de conexión");
      setJoinError("Error de conexión");
    } finally {
      setJoiningRoom(false);
    }
  }

  // ─── Insignias dropdown state ──────────────────────────
  const [showBadges, setShowBadges] = useState(false);
  const causasBadges = BADGE_RULES.filter((b) => b.category === "causas");
  const earnedCount = causasBadges.filter((b) => earnedBadges.includes(b.slug)).length;

  // ─── Render ───────────────────────────────────────────

  return (
    <main className="min-h-screen">
      {/* ─── 1. Tabs (Individual / Grupal) ─────────────── */}
      <div className="mb-6">
        <div className="flex gap-2 rounded-[3px] border border-gz-rule p-1">
          <button
            onClick={() => setTab("individual")}
            className={`flex-1 rounded-[3px] px-4 py-2.5 font-archivo text-[13px] font-semibold transition-colors ${
              tab === "individual"
                ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                : "text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            ⚔️ Individual
          </button>
          <button
            onClick={() => setTab("grupal")}
            className={`flex-1 rounded-[3px] px-4 py-2.5 font-archivo text-[13px] font-semibold transition-colors ${
              tab === "grupal"
                ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                : "text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            👥 Grupal
            {activeRooms.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gz-gold font-ibm-mono text-[9px] font-bold text-white">
                {activeRooms.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── 2. Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-[4px] border border-gz-rule p-4 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
          <p className="font-cormorant text-[28px] !font-bold text-gz-sage">{causasGanadas}</p>
          <p className="font-ibm-mono text-[11px] text-gz-ink-light">Ganadas</p>
        </div>
        <div className="rounded-[4px] border border-gz-rule p-4 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
          <p className="font-cormorant text-[28px] !font-bold text-gz-burgundy">{causasPerdidas}</p>
          <p className="font-ibm-mono text-[11px] text-gz-ink-light">Perdidas</p>
        </div>
        <div className="rounded-[4px] border border-gz-rule p-4 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
          <p className="font-cormorant text-[28px] !font-bold text-gz-gold">{winRate}%</p>
          <p className="font-ibm-mono text-[11px] text-gz-ink-light">Win Rate</p>
        </div>
      </div>

      {/* ─── 3. Main content + Historial sidebar ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        {/* LEFT: Tab content */}
        <div className="space-y-6">

        {/* ─── TAB: Individual ───────────────────────────── */}
        {tab === "individual" && (
          <>
            {/* Retar */}
            <div className="rounded-[4px] border border-gz-rule p-6" style={{ backgroundColor: "var(--gz-cream)" }}>
              <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">Desafiar</h2>
              <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
                Ingresa el email de tu oponente para iniciar una causa
              </p>
              <form onSubmit={handleChallenge} className="mt-4 flex items-center gap-3">
                <input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Desafiar"}
                </button>
              </form>
              {error && <p className="mt-3 font-archivo text-[13px] text-gz-burgundy">{error}</p>}
              {success && <p className="mt-3 font-archivo text-[13px] text-gz-sage">{success}</p>}
            </div>

            {/* Desafiar Colegas */}
            {colegas.length > 0 && (
              <div className="rounded-[4px] border border-gz-rule p-6" style={{ backgroundColor: "var(--gz-cream)" }}>
                <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">
                  Desafiar a un Colega
                </h2>
                <div className="mt-3 space-y-2">
                  {colegas.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-[3px] border border-gz-rule px-4 py-3"
                    >
                      <Link
                        href={`/dashboard/perfil/${c.id}`}
                        className="flex items-center gap-3 min-w-0"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gz-navy/10 text-xs font-bold text-gz-ink">
                          {c.firstName[0]}
                          {c.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-archivo text-[13px] font-medium text-gz-ink truncate">
                            {c.firstName} {c.lastName}
                          </p>
                          {c.tier && (
                            <p className="text-[10px] text-gz-ink-light">
                              {TIER_EMOJIS[c.tier] ?? ""}{" "}
                              {TIER_LABELS[c.tier] ?? c.tier}
                            </p>
                          )}
                        </div>
                      </Link>
                      <button
                        onClick={() =>
                          handleChallengeColega(
                            c.id,
                            `${c.firstName} ${c.lastName}`
                          )
                        }
                        disabled={challengingColega === c.id}
                        className="shrink-0 ml-3 rounded-[3px] bg-gz-gold px-4 py-1.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90 disabled:opacity-50"
                      >
                        {challengingColega === c.id ? "..." : "Desafiar"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activas */}
            {active.length > 0 && (
              <div>
                <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">Causas Activas</h2>
                <div className="mt-3 space-y-3">
                  {active.map((c) => (
                    <Link key={c.id} href={`/dashboard/causas/${c.id}`}
                      className="flex items-center justify-between rounded-[4px] border border-gz-gold/30 bg-gz-gold/[0.06] p-4 transition-shadow hover:shadow-sm">
                      <div>
                        <p className="font-archivo font-medium text-gz-ink">vs {c.opponentName}</p>
                        <p className="font-ibm-mono text-[11px] text-gz-ink-light">En curso</p>
                      </div>
                      <span className="rounded-full bg-gz-gold/15 px-3 py-1 font-ibm-mono text-[9px] font-semibold text-gz-gold">Jugar →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Pendientes */}
            {pending.length > 0 && (
              <div>
                <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">Retos Pendientes</h2>
                <div className="mt-3 space-y-3">
                  {pending.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
                      <div>
                        <p className="font-archivo font-medium text-gz-ink">{c.challengerName}</p>
                        <p className="font-ibm-mono text-[11px] text-gz-ink-light">{new Date(c.createdAt).toLocaleDateString("es-CL")}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAccept(c.id)} disabled={actionLoading === c.id} className="rounded-[3px] bg-gz-sage px-4 py-2 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-sage/90 disabled:opacity-50">Aceptar</button>
                        <button onClick={() => handleReject(c.id)} disabled={actionLoading === c.id} className="rounded-[3px] bg-gz-burgundy/[0.15] px-4 py-2 font-archivo text-[13px] font-semibold text-gz-burgundy transition-colors hover:bg-gz-burgundy/20 disabled:opacity-50">Rechazar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── TAB: Grupal ───────────────────────────────── */}
        {tab === "grupal" && (
          <>
            {/* Crear / Unirse */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Crear sala */}
              <div className="rounded-[4px] border border-gz-rule p-6" style={{ backgroundColor: "var(--gz-cream)" }}>
                <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">Crear Sala</h2>
                <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
                  Crea una sala y comparte el código
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 w-full rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
                >
                  Crear Sala
                </button>
              </div>

              {/* Unirse por código */}
              <div className="rounded-[4px] border border-gz-rule p-6" style={{ backgroundColor: "var(--gz-cream)" }}>
                <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">Unirse</h2>
                <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
                  Ingresa el código de la sala
                </p>
                <form onSubmit={handleJoinByCode} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="CÓDIGO"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 font-ibm-mono text-[14px] text-gz-ink uppercase placeholder:text-gz-ink-light focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  />
                  <button
                    type="submit"
                    disabled={joiningRoom || joinCode.length < 4}
                    className="rounded-[3px] bg-gz-gold px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90 disabled:opacity-50"
                  >
                    {joiningRoom ? "..." : "Unirse"}
                  </button>
                </form>
                {joinError && (
                  <p className="mt-2 font-archivo text-[13px] text-gz-burgundy">{joinError}</p>
                )}
              </div>
            </div>

            {/* Salas activas */}
            {activeRooms.length > 0 && (
              <div>
                <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">Salas Activas</h2>
                <div className="mt-3 space-y-3">
                  {activeRooms.map((r) => (
                    <Link
                      key={r.id}
                      href={`/dashboard/causas/sala/${r.id}`}
                      className="flex items-center justify-between rounded-[4px] border border-gz-gold/30 bg-gz-gold/[0.06] p-4 transition-shadow hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-archivo font-medium text-gz-ink">
                            Sala de {r.creatorName}
                          </p>
                          <span className="rounded-full bg-gz-rule/40 px-2 py-0.5 font-ibm-mono text-[10px] text-gz-ink-light">
                            {r.code}
                          </span>
                        </div>
                        <p className="font-ibm-mono text-[11px] text-gz-ink-light">
                          {r.participantCount}/{r.maxPlayers} jugadores ·{" "}
                          {r.status === "lobby" ? "En espera" : "En curso"}
                        </p>
                      </div>
                      <span className="rounded-full bg-gz-gold/15 px-3 py-1 font-ibm-mono text-[9px] font-semibold text-gz-gold">
                        {r.status === "lobby" ? "Entrar" : "Jugar"} &rarr;
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </>
        )}

        {/* ─── Insignias (collapsible dropdown) ─────────── */}
        <div className="rounded-[4px] border border-gz-rule" style={{ backgroundColor: "var(--gz-cream)" }}>
          <button
            onClick={() => setShowBadges(!showBadges)}
            className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-gz-gold/[0.04]"
          >
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light font-semibold">
              🏅 Insignias de Causas ({earnedCount}/{causasBadges.length})
            </span>
            <span className={`text-[10px] text-gz-ink-light transition-transform duration-200 ${showBadges ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
          {showBadges && (
            <div className="border-t border-gz-rule px-4 py-3">
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {causasBadges.map((badge) => {
                  const earned = earnedBadges.includes(badge.slug);
                  return (
                    <div
                      key={badge.slug}
                      className={`text-center transition-opacity ${earned ? "" : "opacity-25 grayscale"}`}
                      title={badge.description}
                    >
                      <span className="text-2xl">{badge.emoji}</span>
                      <p className="mt-0.5 text-[9px] font-medium text-gz-ink leading-tight truncate">
                        {badge.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </div>{/* END left column */}

        {/* RIGHT: Historial sidebar (sticky like OD contingencias) */}
        <aside className="hidden lg:block">
          <div className="sticky top-[72px]">
            <div className="rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
              <h3 className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light font-semibold mb-3">
                📜 Historial
              </h3>

              {/* Individual history */}
              {tab === "individual" && (
                <>
                  {history.length === 0 ? (
                    <p className="font-archivo text-[12px] text-gz-ink-light italic">Sin causas completadas</p>
                  ) : (
                    <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
                      {history.map((c) => (
                        <Link key={c.id} href={`/dashboard/causas/${c.id}`}
                          className="flex items-center justify-between py-2 px-2 rounded-[3px] transition-colors hover:bg-gz-gold/[0.06] border-b border-gz-rule/40 last:border-0">
                          <div className="min-w-0">
                            <p className="font-archivo text-[12px] font-medium text-gz-ink truncate">vs {c.opponentName}</p>
                            <p className="font-ibm-mono text-[9px] text-gz-ink-light">{new Date(c.createdAt).toLocaleDateString("es-CL")}</p>
                          </div>
                          <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 font-ibm-mono text-[8px] font-semibold ${
                            c.won ? "bg-gz-sage/[0.15] text-gz-sage"
                            : c.lost ? "bg-gz-burgundy/[0.15] text-gz-burgundy"
                            : c.status === "COMPLETED" ? "bg-gz-rule/30 text-gz-ink-mid"
                            : "bg-gz-rule/20 text-gz-ink-light"
                          }`}>
                            {c.won ? "V" : c.lost ? "D" : c.status === "COMPLETED" ? "E" : "R"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Grupal history */}
              {tab === "grupal" && (
                <>
                  {roomHistory.length === 0 ? (
                    <p className="font-archivo text-[12px] text-gz-ink-light italic">Sin causas grupales</p>
                  ) : (
                    <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
                      {roomHistory.map((r) => (
                        <Link key={r.id} href={`/dashboard/causas/sala/${r.id}`}
                          className="flex items-center justify-between py-2 px-2 rounded-[3px] transition-colors hover:bg-gz-gold/[0.06] border-b border-gz-rule/40 last:border-0">
                          <div className="min-w-0">
                            <p className="font-archivo text-[12px] font-medium text-gz-ink truncate">{r.participantCount} jugadores</p>
                            <p className="font-ibm-mono text-[9px] text-gz-ink-light">{new Date(r.createdAt).toLocaleDateString("es-CL")} · {r.score} pts</p>
                          </div>
                          <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 font-ibm-mono text-[8px] font-semibold ${
                            r.position === 1 ? "bg-gz-sage/[0.15] text-gz-sage"
                            : r.position === 2 ? "bg-gz-navy/[0.15] text-gz-navy"
                            : r.position === 3 ? "bg-gz-gold/[0.15] text-gz-gold"
                            : "bg-gz-rule/30 text-gz-ink-mid"
                          }`}>
                            {r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : `${r.position}°`}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>{/* END grid */}

      {/* Mobile: historial below content */}
      <div className="mt-6 lg:hidden">
        <div className="rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
          <h3 className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light font-semibold mb-3">📜 Historial</h3>
          {tab === "individual" && history.length === 0 && <p className="font-archivo text-[12px] text-gz-ink-light italic">Sin causas completadas</p>}
          {tab === "individual" && history.length > 0 && (
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
              {history.map((c) => (
                <Link key={c.id} href={`/dashboard/causas/${c.id}`} className="flex items-center justify-between py-2 px-2 rounded-[3px] hover:bg-gz-gold/[0.06] border-b border-gz-rule/40 last:border-0">
                  <div className="min-w-0"><p className="font-archivo text-[12px] font-medium text-gz-ink truncate">vs {c.opponentName}</p></div>
                  <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 font-ibm-mono text-[8px] font-semibold ${c.won ? "bg-gz-sage/[0.15] text-gz-sage" : c.lost ? "bg-gz-burgundy/[0.15] text-gz-burgundy" : "bg-gz-rule/30 text-gz-ink-mid"}`}>{c.won ? "V" : c.lost ? "D" : "E"}</span>
                </Link>
              ))}
            </div>
          )}
          {tab === "grupal" && roomHistory.length === 0 && <p className="font-archivo text-[12px] text-gz-ink-light italic">Sin causas grupales</p>}
          {tab === "grupal" && roomHistory.length > 0 && (
            <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
              {roomHistory.map((r) => (
                <Link key={r.id} href={`/dashboard/causas/sala/${r.id}`} className="flex items-center justify-between py-2 px-2 rounded-[3px] hover:bg-gz-gold/[0.06] border-b border-gz-rule/40 last:border-0">
                  <div className="min-w-0"><p className="font-archivo text-[12px] font-medium text-gz-ink truncate">{r.participantCount} jug. · {r.score}pts</p></div>
                  <span className={`shrink-0 ml-2 rounded-full px-2 py-0.5 font-ibm-mono text-[8px] font-semibold ${r.position === 1 ? "bg-gz-sage/[0.15] text-gz-sage" : "bg-gz-rule/30 text-gz-ink-mid"}`}>{r.position === 1 ? "🥇" : `${r.position}°`}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal Crear Sala ──────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[4px] p-6 shadow-xl border border-gz-rule" style={{ backgroundColor: "var(--gz-cream)" }}>
            <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">Crear Causa Grupal</h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">Rama</label>
                <select
                  value={roomRama}
                  onChange={(e) => setRoomRama(e.target.value)}
                  className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                >
                  <option value="">Todas</option>
                  <option value="DERECHO_CIVIL">Derecho Civil</option>
                  <option value="DERECHO_PROCESAL_CIVIL">
                    Derecho Procesal Civil
                  </option>
                </select>
              </div>

              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  Dificultad
                </label>
                <select
                  value={roomDifficulty}
                  onChange={(e) => setRoomDifficulty(e.target.value)}
                  className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                >
                  <option value="">Mixto</option>
                  <option value="BASICO">Básico</option>
                  <option value="INTERMEDIO">Intermedio</option>
                  <option value="AVANZADO">Avanzado</option>
                </select>
              </div>

              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  Max. jugadores (2-10)
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={roomMaxPlayers}
                  onChange={(e) => setRoomMaxPlayers(Number(e.target.value))}
                  className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] text-gz-ink-mid transition-colors hover:border-gz-gold hover:text-gz-gold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={creatingRoom}
                className="flex-1 rounded-[3px] bg-gz-navy px-4 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
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
