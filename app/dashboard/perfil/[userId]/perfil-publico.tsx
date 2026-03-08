"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BADGE_RULES } from "@/lib/badge-constants";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";

// ─── Types ───────────────────────────────────────────────

interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  institution: string | null;
  universityYear: number | null;
  xp: number;
  causasGanadas: number;
  causasPerdidas: number;
  winRate: number;
  tier: string | null;
  flashcardsStudied: number;
  mcqAttempts: number;
  trueFalseAttempts: number;
  memberSince: string;
}

interface ColegaPreview {
  id: string;
  firstName: string;
  lastName: string;
  institution: string | null;
  tier: string | null;
  xp: number;
}

interface PerfilPublicoProps {
  user: ProfileUser;
  colegaStatus: string;
  requestId: string | null;
  colegaCount: number;
  earnedBadges: string[];
  colegasPreview: ColegaPreview[];
}

// ─── Component ───────────────────────────────────────────

export function PerfilPublico({
  user,
  colegaStatus: initialStatus,
  requestId: initialRequestId,
  colegaCount,
  earnedBadges,
  colegasPreview,
}: PerfilPublicoProps) {
  const [colegaStatus, setColegaStatus] = useState(initialStatus);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [loading, setLoading] = useState(false);

  const tierLabel = user.tier ? TIER_LABELS[user.tier] ?? user.tier : null;
  const tierEmoji = user.tier ? TIER_EMOJIS[user.tier] ?? "" : "";
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  // ─── Handlers ───────────────────────────────────────────

  async function handleSendRequest() {
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al enviar solicitud");
        return;
      }
      if (data.autoAccepted) {
        setColegaStatus("accepted");
        toast.success("Son colegas ahora");
      } else {
        setColegaStatus("pending_sent");
        setRequestId(data.requestId);
        toast.success("Solicitud enviada");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/colegas/${requestId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setColegaStatus("none");
        setRequestId(null);
        toast.success("Solicitud cancelada");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptRequest() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      if (res.ok) {
        setColegaStatus("accepted");
        toast.success("Solicitud aceptada");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveColega() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/colegas/${requestId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setColegaStatus("none");
        setRequestId(null);
        toast.success("Colega eliminado");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* ─── Header ──────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-xl font-bold text-white">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-navy font-display truncate">
                {user.firstName} {user.lastName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-navy/60">
                {user.institution && <span>{user.institution}</span>}
                {user.universityYear && (
                  <span>
                    {user.institution ? "·" : ""} {user.universityYear}o ano
                  </span>
                )}
              </div>
              {tierLabel && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                  {tierEmoji} {tierLabel}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            {colegaStatus === "none" && (
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Agregar Colega"}
              </button>
            )}

            {colegaStatus === "pending_sent" && (
              <button
                onClick={handleCancelRequest}
                disabled={loading}
                className="rounded-lg border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy/60 transition-colors hover:bg-paper disabled:opacity-50"
              >
                {loading ? "..." : "Cancelar Solicitud"}
              </button>
            )}

            {colegaStatus === "pending_received" && (
              <button
                onClick={handleAcceptRequest}
                disabled={loading}
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "..." : "Aceptar Solicitud"}
              </button>
            )}

            {colegaStatus === "accepted" && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700">
                  Colegas
                </span>
                <button
                  onClick={handleRemoveColega}
                  disabled={loading}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </>
            )}

            {colegaStatus === "accepted" && (
              <Link
                href={`/dashboard/causas?challenge=${user.id}`}
                className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90"
              >
                Desafiar
              </Link>
            )}
          </div>
        </div>

        {/* ─── Stats ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-navy font-display">
              {user.xp.toLocaleString()}
            </p>
            <p className="text-xs text-navy/50">XP Total</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {user.causasGanadas}
            </p>
            <p className="text-xs text-navy/50">Causas Ganadas</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gold">{user.winRate}%</p>
            <p className="text-xs text-navy/50">Win Rate</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-4 text-center">
            <p className="text-2xl font-bold text-navy font-display">
              {user.flashcardsStudied}
            </p>
            <p className="text-xs text-navy/50">Flashcards</p>
          </div>
        </div>

        {/* ─── Insignias ───────────────────────────────── */}
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

        {/* ─── Colegas ─────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy/70 uppercase tracking-wider">
              Colegas ({colegaCount})
            </h2>
          </div>
          {colegasPreview.length === 0 ? (
            <p className="mt-4 text-sm text-navy/40">
              Este usuario aun no tiene colegas
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {colegasPreview.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/perfil/${c.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-paper"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                    {c.firstName[0]}
                    {c.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    {c.tier && (
                      <p className="text-[10px] text-navy/40">
                        {TIER_EMOJIS[c.tier] ?? ""}{" "}
                        {TIER_LABELS[c.tier] ?? c.tier}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ─── Info ────────────────────────────────────── */}
        <div className="text-center text-xs text-navy/30">
          Miembro desde{" "}
          {new Date(user.memberSince).toLocaleDateString("es-CL", {
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>
    </main>
  );
}
