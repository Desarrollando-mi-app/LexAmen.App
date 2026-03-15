"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";

// ─── Types ───────────────────────────────────────────────

interface ColegaUser {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  tier: string | null;
  xp: number;
}

interface PendingRequest {
  id: string;
  senderId: string;
  senderFirstName: string;
  senderLastName: string;
  senderUniversidad: string | null;
  senderTier: string | null;
  createdAt: string;
}

interface SentRequest {
  id: string;
  receiverId: string;
  receiverFirstName: string;
  receiverLastName: string;
  receiverUniversidad: string | null;
  receiverTier: string | null;
  createdAt: string;
}

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  xp: number;
  tier: string | null;
  colegaStatus: string;
  requestId: string | null;
}

interface ColegasClientProps {
  colegas: ColegaUser[];
  pendingReceived: PendingRequest[];
  pendingSent: SentRequest[];
}

// ─── Component ───────────────────────────────────────────

export function ColegasClient({
  colegas: initialColegas,
  pendingReceived: initialPending,
  pendingSent: initialSent,
}: ColegasClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"colegas" | "solicitudes" | "enviadas">(
    "colegas"
  );
  const [colegas, setColegas] = useState(initialColegas);
  const [pending, setPending] = useState(initialPending);
  const [sent, setSent] = useState(initialSent);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(
    null
  );

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── Search ─────────────────────────────────────────────

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchDebounce) clearTimeout(searchDebounce);

      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      const timeout = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `/api/users/search?q=${encodeURIComponent(query.trim())}`
          );
          const data = await res.json();
          if (res.ok) {
            setSearchResults(data.users);
          }
        } catch {
          // silently fail
        } finally {
          setSearching(false);
        }
      }, 300);

      setSearchDebounce(timeout);
    },
    [searchDebounce]
  );

  // ─── Actions ────────────────────────────────────────────

  async function handleSendRequest(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/colegas/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al enviar solicitud");
        return;
      }
      if (data.autoAccepted) {
        toast.success("Son colegas ahora");
      } else {
        toast.success("Solicitud enviada");
      }
      // Actualizar resultados de busqueda
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                colegaStatus: data.autoAccepted
                  ? "accepted"
                  : "pending_sent",
                requestId: data.requestId,
              }
            : u
        )
      );
      router.refresh();
    } catch {
      toast.error("Error de conexion");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept(requestId: string, senderName: string) {
    setActionLoading(requestId);
    try {
      const res = await fetch("/api/colegas/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((r) => r.id !== requestId));
        toast.success(`${senderName} es tu colega ahora`);
        router.refresh();
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(requestId: string) {
    setActionLoading(requestId);
    try {
      const res = await fetch("/api/colegas/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "reject" }),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((r) => r.id !== requestId));
        toast.success("Solicitud rechazada");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancelSent(requestId: string) {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/colegas/${requestId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSent((prev) => prev.filter((r) => r.id !== requestId));
        toast.success("Solicitud cancelada");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveColega(
    colegaId: string,
    colegaName: string
  ) {
    // Necesitamos buscar el requestId
    setActionLoading(colegaId);
    try {
      // Need the requestId — search for it
      const searchRes = await fetch(
        `/api/users/search?q=${encodeURIComponent(colegaName)}`
      );
      const searchData = await searchRes.json();
      const match = searchData.users?.find(
        (u: SearchResult) => u.id === colegaId
      );
      if (match?.requestId) {
        const delRes = await fetch(`/api/colegas/${match.requestId}`, {
          method: "DELETE",
        });
        if (delRes.ok) {
          setColegas((prev) => prev.filter((c) => c.id !== colegaId));
          toast.success("Colega eliminado");
          router.refresh();
          return;
        }
      }
      toast.error("No se pudo eliminar");
    } catch {
      toast.error("Error de conexion");
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar usuarios por nombre..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-[4px] border border-gz-rule bg-white px-4 py-3 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
          />
          {searching && (
            <div className="absolute right-3 top-3.5 text-xs text-gz-ink-light">
              Buscando...
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 rounded-[4px] border border-gz-rule bg-white shadow-sm">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b border-gz-rule px-4 py-3 last:border-0"
                >
                  <Link
                    href={`/dashboard/perfil/${user.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[11px] font-bold text-gz-ink">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-archivo text-[13px] font-medium text-gz-ink truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="font-ibm-mono text-[10px] text-gz-ink-light truncate">
                        {user.universidad ?? ""}{" "}
                        {user.tier
                          ? `${TIER_EMOJIS[user.tier] ?? ""} ${
                              TIER_LABELS[user.tier] ?? user.tier
                            }`
                          : ""}
                      </p>
                    </div>
                  </Link>
                  <div className="shrink-0 ml-3">
                    {user.colegaStatus === "none" && (
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        disabled={actionLoading === user.id}
                        className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[11px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
                      >
                        Agregar
                      </button>
                    )}
                    {user.colegaStatus === "pending_sent" && (
                      <span className="rounded-[3px] bg-gz-cream-dark px-3 py-1.5 font-ibm-mono text-[10px] text-gz-ink-light">
                        Enviada
                      </span>
                    )}
                    {user.colegaStatus === "pending_received" && (
                      <span className="rounded-[3px] bg-gz-gold/10 px-3 py-1.5 font-ibm-mono text-[10px] font-semibold text-gz-gold">
                        Te envio solicitud
                      </span>
                    )}
                    {user.colegaStatus === "accepted" && (
                      <span className="rounded-[3px] bg-gz-sage/[0.15] px-3 py-1.5 font-ibm-mono text-[10px] font-semibold text-gz-sage">
                        Colega
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border border-gz-rule rounded-[4px] p-1">
          <button
            onClick={() => setTab("colegas")}
            className={`flex-1 rounded-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "colegas"
                ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                : "text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            Mis Colegas ({colegas.length})
          </button>
          <button
            onClick={() => setTab("solicitudes")}
            className={`flex-1 rounded-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "solicitudes"
                ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                : "text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            Solicitudes
            {pending.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gz-gold font-ibm-mono text-[9px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("enviadas")}
            className={`flex-1 rounded-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
              tab === "enviadas"
                ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                : "text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            Enviadas ({sent.length})
          </button>
        </div>

        {/* ─── Tab: Mis Colegas ────────────────────────── */}
        {tab === "colegas" && (
          <div>
            {colegas.length === 0 ? (
              <div className="rounded-[4px] border border-gz-rule bg-white p-8 text-center">
                <p className="text-4xl">👥</p>
                <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-light text-center">
                  Aun no tienes colegas. Busca usuarios para agregarlos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {colegas.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-[4px] border border-gz-rule bg-white p-4 hover:border-gz-gold transition-colors"
                  >
                    <Link
                      href={`/dashboard/perfil/${c.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gz-navy font-archivo text-[14px] font-bold text-gz-gold-bright">
                        {c.firstName[0]}
                        {c.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-archivo text-[14px] font-medium text-gz-ink truncate">
                          {c.firstName} {c.lastName}
                        </p>
                        <div className="flex items-center gap-2 font-ibm-mono text-[11px] text-gz-ink-light">
                          {c.universidad && <span>{c.universidad}</span>}
                          {c.tier && (
                            <span>
                              {TIER_EMOJIS[c.tier] ?? ""}{" "}
                              {TIER_LABELS[c.tier] ?? c.tier}
                            </span>
                          )}
                          <span>{c.xp.toLocaleString()} XP</span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Link
                        href={`/dashboard/causas?challenge=${c.id}`}
                        className="rounded-[3px] bg-gz-gold/10 px-3 py-1.5 font-archivo text-[11px] font-semibold text-gz-gold hover:bg-gz-gold/20"
                      >
                        Desafiar
                      </Link>
                      <button
                        onClick={() =>
                          handleRemoveColega(
                            c.id,
                            `${c.firstName} ${c.lastName}`
                          )
                        }
                        disabled={actionLoading === c.id}
                        className="rounded-[3px] border border-gz-rule px-3 py-1.5 font-archivo text-[11px] text-gz-ink-light hover:border-gz-burgundy hover:text-gz-burgundy disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Solicitudes ────────────────────────── */}
        {tab === "solicitudes" && (
          <div>
            {pending.length === 0 ? (
              <div className="rounded-[4px] border border-gz-rule bg-white p-8 text-center">
                <p className="text-4xl">📩</p>
                <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-light text-center">
                  No tienes solicitudes pendientes
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-[4px] border border-gz-rule bg-white p-4 hover:border-gz-gold transition-colors"
                  >
                    <Link
                      href={`/dashboard/perfil/${r.senderId}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gz-gold/10 font-archivo text-[14px] font-bold text-gz-gold">
                        {r.senderFirstName[0]}
                        {r.senderLastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-archivo text-[14px] font-medium text-gz-ink truncate">
                          {r.senderFirstName} {r.senderLastName}
                        </p>
                        <p className="font-ibm-mono text-[11px] text-gz-ink-light">
                          {r.senderUniversidad ?? ""}{" "}
                          {r.senderTier
                            ? `${TIER_EMOJIS[r.senderTier] ?? ""} ${
                                TIER_LABELS[r.senderTier] ?? r.senderTier
                              }`
                            : ""}
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-2 shrink-0 ml-3">
                      <button
                        onClick={() =>
                          handleAccept(
                            r.id,
                            `${r.senderFirstName} ${r.senderLastName}`
                          )
                        }
                        disabled={actionLoading === r.id}
                        className="rounded-[3px] bg-gz-sage px-4 py-2 font-archivo text-[11px] font-semibold text-white hover:bg-gz-sage/90 disabled:opacity-50"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={actionLoading === r.id}
                        className="rounded-[3px] bg-gz-burgundy/[0.15] px-4 py-2 font-archivo text-[11px] font-semibold text-gz-burgundy hover:bg-gz-burgundy/20 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Enviadas ───────────────────────────── */}
        {tab === "enviadas" && (
          <div>
            {sent.length === 0 ? (
              <div className="rounded-[4px] border border-gz-rule bg-white p-8 text-center">
                <p className="text-4xl">📤</p>
                <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-light text-center">
                  No tienes solicitudes enviadas pendientes
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sent.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-[4px] border border-gz-rule bg-white p-4 hover:border-gz-gold transition-colors"
                  >
                    <Link
                      href={`/dashboard/perfil/${r.receiverId}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[11px] font-bold text-gz-ink">
                        {r.receiverFirstName[0]}
                        {r.receiverLastName[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-archivo text-[14px] font-medium text-gz-ink truncate">
                          {r.receiverFirstName} {r.receiverLastName}
                        </p>
                        <p className="font-ibm-mono text-[11px] text-gz-ink-light">
                          Enviada el{" "}
                          {new Date(r.createdAt).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleCancelSent(r.id)}
                      disabled={actionLoading === r.id}
                      className="shrink-0 ml-3 rounded-[3px] border border-gz-rule px-4 py-2 font-archivo text-[11px] text-gz-ink-light hover:border-gz-burgundy hover:text-gz-burgundy disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
