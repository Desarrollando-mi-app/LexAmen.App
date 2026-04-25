"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Status =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "rejected";

interface ColegaCtaButtonProps {
  targetUserId: string;
  initialStatus: Status;
  initialRequestId: string | null;
  /** Etiqueta accent: "burgundy" para solicitudes (busco), "ink" en otros contextos. */
  variant?: "burgundy" | "ink";
}

/**
 * CTA editorial para enviar/cancelar/responder solicitudes de colega.
 * Pensado para usarse en el hero de detalle (solicitud de pasantía,
 * ofertas, etc.). Refleja el estado actual y se mantiene compacto.
 */
export function ColegaCtaButton({
  targetUserId,
  initialStatus,
  initialRequestId,
  variant = "burgundy",
}: ColegaCtaButtonProps) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [requestId, setRequestId] = useState<string | null>(initialRequestId);
  const [loading, setLoading] = useState(false);

  const accent =
    variant === "burgundy" ? "border-gz-burgundy text-gz-burgundy" : "border-gz-ink text-gz-ink";
  const accentHover =
    variant === "burgundy"
      ? "hover:bg-gz-burgundy hover:text-gz-cream"
      : "hover:bg-gz-ink hover:text-gz-cream";

  async function send() {
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No pudimos enviar la solicitud.");
        return;
      }
      if (data.autoAccepted) {
        setStatus("accepted");
        toast.success("Son colegas ahora.");
      } else {
        setStatus("pending_sent");
        setRequestId(data.requestId ?? null);
        toast.success("Solicitud de colega enviada.");
      }
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/colegas/${requestId}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("none");
        setRequestId(null);
        toast.success("Solicitud cancelada.");
      } else {
        toast.error("No pudimos cancelar la solicitud.");
      }
    } catch {
      toast.error("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  async function respond(action: "accept" | "decline") {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "No pudimos responder.");
        return;
      }
      if (action === "accept") {
        setStatus("accepted");
        toast.success("Solicitud aceptada.");
      } else {
        setStatus("rejected");
        toast.success("Solicitud declinada.");
      }
    } catch {
      toast.error("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  const baseBtn = `px-5 py-3 border ${accent} ${accentHover} font-ibm-mono text-[11px] tracking-[1.8px] uppercase transition disabled:opacity-50 disabled:cursor-not-allowed`;

  if (status === "accepted") {
    return (
      <span className="px-5 py-3 border border-gz-gold text-gz-gold font-ibm-mono text-[11px] tracking-[1.8px] uppercase">
        ✓ Son colegas
      </span>
    );
  }

  if (status === "pending_sent") {
    return (
      <button type="button" onClick={cancel} disabled={loading} className={baseBtn}>
        {loading ? "…" : "Cancelar solicitud"}
      </button>
    );
  }

  if (status === "pending_received") {
    return (
      <span className="inline-flex gap-2">
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={loading}
          className="px-5 py-3 bg-gz-gold text-gz-ink font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-ink hover:text-gz-cream transition disabled:opacity-50"
        >
          {loading ? "…" : "Aceptar solicitud"}
        </button>
        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={loading}
          className="px-5 py-3 border border-gz-rule text-gz-ink-mid font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:border-gz-ink hover:text-gz-ink transition disabled:opacity-50"
        >
          Rechazar
        </button>
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="px-5 py-3 border border-gz-rule text-gz-ink-light font-ibm-mono text-[11px] tracking-[1.8px] uppercase">
        Solicitud declinada
      </span>
    );
  }

  return (
    <button type="button" onClick={send} disabled={loading} className={baseBtn}>
      {loading ? "…" : "Conectar como colega"}
    </button>
  );
}

/** Link compacto para "Ver perfil" — Server-renderable. */
export function VerPerfilLink({ userId }: { userId: string }) {
  return (
    <Link
      href={`/dashboard/perfil/${userId}`}
      className="px-5 py-3 border border-gz-ink text-gz-ink font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:border-gz-gold hover:text-gz-gold transition"
    >
      Ver perfil →
    </Link>
  );
}
