"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Invitacion = {
  id: string;
  publicacionId: string;
  publicacionTipo: string;
  estado: string;
  createdAt: string;
  titulo: string;
  inviter: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  } | null;
};

export default function ColaboracionPage() {
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/diario/colaboracion/mis-invitaciones", {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setInvitaciones(data.invitaciones ?? []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAction(id: string, action: "aceptar" | "rechazar") {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/diario/colaboracion/${id}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setInvitaciones((prev) => prev.filter((inv) => inv.id !== id));
      }
    } catch {
      /* silent */
    } finally {
      setProcessingId(null);
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days}d`;
    return new Date(dateStr).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="min-h-screen bg-gz-cream">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/dashboard/diario"
            className="mb-4 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink transition-colors"
          >
            &larr; Volver al Diario
          </Link>
          <p className="font-ibm-mono uppercase tracking-wider text-[11px] text-gz-ink-light">
            Colaboracion
          </p>
          <h1 className="font-cormorant text-[28px] font-bold text-gz-ink mt-1">
            Mis Invitaciones
          </h1>
          <div className="border-t-2 border-gz-rule mt-3" />
        </header>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-[100px] animate-pulse rounded-[4px] bg-gz-cream-dark"
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && invitaciones.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-cormorant text-[17px] italic text-gz-ink-light">
              No tienes invitaciones pendientes.
            </p>
          </div>
        )}

        {/* Invitations list */}
        {!loading && invitaciones.length > 0 && (
          <div className="space-y-4">
            {invitaciones.map((inv) => {
              const inviterInitials = inv.inviter
                ? `${inv.inviter.firstName[0]}${inv.inviter.lastName[0]}`.toUpperCase()
                : "??";
              const tipoLabel =
                inv.publicacionTipo === "analisis"
                  ? "Analisis de Sentencia"
                  : "Ensayo";

              return (
                <div
                  key={inv.id}
                  className="rounded-[4px] border border-gz-rule bg-white p-5"
                >
                  <div className="mb-3 flex items-center gap-3">
                    {inv.inviter?.avatarUrl ? (
                      <img
                        src={inv.inviter.avatarUrl}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
                        {inviterInitials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-archivo text-[13px] font-semibold text-gz-ink">
                        {inv.inviter?.firstName} {inv.inviter?.lastName}
                      </p>
                      <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                        {timeAgo(inv.createdAt)}
                      </p>
                    </div>
                    <span className="rounded-full bg-gz-gold/15 px-3 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-gold">
                      {tipoLabel}
                    </span>
                  </div>

                  <p className="mb-1 font-archivo text-[13px] text-gz-ink-mid">
                    Te invito a co-autorar:
                  </p>
                  <h3 className="font-cormorant text-[18px] font-bold text-gz-ink mb-4">
                    {inv.titulo || "Sin titulo"}
                  </h3>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAction(inv.id, "aceptar")}
                      disabled={processingId === inv.id}
                      className="rounded-[3px] bg-gz-navy px-5 py-2 font-archivo text-[12px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
                    >
                      {processingId === inv.id ? "..." : "Aceptar"}
                    </button>
                    <button
                      onClick={() => handleAction(inv.id, "rechazar")}
                      disabled={processingId === inv.id}
                      className="rounded-[3px] border border-gz-rule px-5 py-2 font-archivo text-[12px] text-gz-ink-light transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
