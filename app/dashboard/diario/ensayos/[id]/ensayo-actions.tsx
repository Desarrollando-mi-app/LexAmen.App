"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

// ─── Props ───────────────────────────────────────────────

interface EnsayoActionsProps {
  ensayoId: string;
  isOwner: boolean;
  isPremium: boolean;
  initialHasApoyado: boolean;
  initialHasGuardado: boolean;
  initialHasComunicado: boolean;
  initialApoyosCount: number;
  initialGuardadosCount: number;
}

// ─── Component ───────────────────────────────────────────

export function EnsayoActions({
  ensayoId,
  isOwner,
  isPremium,
  initialHasApoyado,
  initialHasGuardado,
  initialHasComunicado,
  initialApoyosCount,
  initialGuardadosCount,
}: EnsayoActionsProps) {
  const [hasApoyado, setHasApoyado] = useState(initialHasApoyado);
  const [hasGuardado, setHasGuardado] = useState(initialHasGuardado);
  const [hasComunicado, setHasComunicado] = useState(initialHasComunicado);
  const [apoyosCount, setApoyosCount] = useState(initialApoyosCount);
  const [guardadosCount, setGuardadosCount] = useState(initialGuardadosCount);
  const [loading, setLoading] = useState<string | null>(null);

  // Reportar state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  // Auto-close report modal after success
  useEffect(() => {
    if (!reportSent) return;
    const timer = setTimeout(() => {
      setShowReportModal(false);
      setReportSent(false);
      setReportReason("");
    }, 2000);
    return () => clearTimeout(timer);
  }, [reportSent]);

  // ─── Toggle handlers ────────────────────────────────

  async function handleApoyar() {
    if (loading) return;
    setLoading("apoyar");
    try {
      const res = await fetch(`/api/diario/ensayos/${ensayoId}/apoyar`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHasApoyado(data.apoyado);
      setApoyosCount((c) => (data.apoyado ? c + 1 : c - 1));
    } catch {
      toast.error("Error al apoyar");
    } finally {
      setLoading(null);
    }
  }

  async function handleGuardar() {
    if (loading) return;
    setLoading("guardar");
    try {
      const res = await fetch(`/api/diario/ensayos/${ensayoId}/guardar`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHasGuardado(data.guardado);
      setGuardadosCount((c) => (data.guardado ? c + 1 : c - 1));
    } catch {
      toast.error("Error al guardar");
    } finally {
      setLoading(null);
    }
  }

  async function handleComuniquese() {
    if (loading || isOwner) return;
    setLoading("comuniquese");
    try {
      const res = await fetch(`/api/diario/ensayos/${ensayoId}/comuniquese`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHasComunicado(data.comunicado);
      if (data.comunicado) {
        toast.success("Solicitud de contacto enviada al autor");
      }
    } catch {
      toast.error("Error al enviar solicitud");
    } finally {
      setLoading(null);
    }
  }

  async function handleReport() {
    if (!reportReason.trim() || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      const res = await fetch(`/api/diario/ensayos/${ensayoId}/reportar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      if (!res.ok) throw new Error();
      setReportSent(true);
      toast.success("Reporte enviado");
    } catch {
      toast.error("Error al enviar reporte");
    } finally {
      setReportSubmitting(false);
    }
  }

  async function handleDownload() {
    if (!isPremium && !isOwner) return;
    try {
      const res = await fetch(`/api/diario/ensayos/${ensayoId}/descargar`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast.error("Error al descargar");
    }
  }

  // ─── Render ──────────────────────────────────────────

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Apoyar */}
        <button
          onClick={handleApoyar}
          disabled={loading === "apoyar"}
          className={`flex items-center gap-1.5 rounded-[3px] px-3 py-2 font-archivo text-[13px] font-medium transition-colors ${
            hasApoyado
              ? "bg-gz-gold/[0.12] text-gz-gold"
              : "border border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark/50"
          }`}
        >
          {hasApoyado ? "Apoyado" : "Apoyar"} ({apoyosCount})
        </button>

        {/* Guardar */}
        <button
          onClick={handleGuardar}
          disabled={loading === "guardar"}
          className={`flex items-center gap-1.5 rounded-[3px] px-3 py-2 font-archivo text-[13px] font-medium transition-colors ${
            hasGuardado
              ? "bg-gz-sage/[0.12] text-gz-sage"
              : "border border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark/50"
          }`}
        >
          {hasGuardado ? "Guardado" : "Guardar"} ({guardadosCount})
        </button>

        {/* Comuníquese */}
        {!isOwner && (
          <button
            onClick={handleComuniquese}
            disabled={loading === "comuniquese" || hasComunicado}
            className={`flex items-center gap-1.5 rounded-[3px] px-3 py-2 font-archivo text-[13px] font-medium transition-colors ${
              hasComunicado
                ? "bg-gz-navy/[0.08] text-gz-navy cursor-default"
                : "border border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark/50"
            }`}
          >
            {hasComunicado ? "Solicitud enviada" : "Comuníquese"}
          </button>
        )}

        {/* Download */}
        {(isPremium || isOwner) && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Descargar
          </button>
        )}

        {/* Reportar */}
        {!isOwner && (
          <button
            onClick={() => setShowReportModal(true)}
            className="ml-auto rounded-[3px] border border-gz-burgundy/20 px-3 py-2 font-archivo text-[12px] text-gz-burgundy hover:bg-gz-burgundy/[0.06] transition-colors"
          >
            Reportar
          </button>
        )}
      </div>

      {/* ─── Report modal ────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-[4px] border border-gz-rule bg-white p-6 shadow-lg">
            {reportSent ? (
              <div className="text-center py-4">
                <p className="font-archivo text-[14px] font-medium text-gz-sage">
                  Reporte enviado correctamente
                </p>
                <p className="mt-1 font-ibm-mono text-[11px] text-gz-ink-light">
                  Revisaremos el contenido a la brevedad
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-1">
                  Reportar ensayo
                </h3>
                <p className="font-ibm-mono text-[11px] text-gz-ink-light mb-4">
                  Describe el motivo de tu reporte
                </p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Motivo del reporte..."
                  rows={4}
                  className="w-full rounded-[3px] border border-gz-rule bg-gz-cream-dark/20 px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30 resize-none"
                />
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowReportModal(false);
                      setReportReason("");
                    }}
                    className="rounded-[3px] border border-gz-rule px-4 py-2 font-archivo text-[13px] text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason.trim() || reportSubmitting}
                    className="rounded-[3px] bg-gz-burgundy px-4 py-2 font-archivo text-[13px] font-medium text-white hover:bg-gz-burgundy/90 disabled:opacity-50 transition-colors"
                  >
                    {reportSubmitting ? "Enviando..." : "Enviar reporte"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
