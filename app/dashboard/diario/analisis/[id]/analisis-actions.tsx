"use client";

import { useState } from "react";

import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────

interface AnalisisActionsProps {
  analisisId: string;
  currentUserId: string | null;
  initialApoyado: boolean;
  initialGuardado: boolean;
  initialComunicado: boolean;
  apoyosCount: number;
  guardadosCount: number;
  comuniqueseCount: number;
}

// ─── Component ──────────────────────────────────────────────

export function AnalisisActions({
  analisisId,
  currentUserId,
  initialApoyado,
  initialGuardado,
  initialComunicado,
  apoyosCount: initialApoyos,
  guardadosCount: initialGuardados,
  comuniqueseCount: initialComuniquese,
}: AnalisisActionsProps) {
  const [hasApoyado, setHasApoyado] = useState(initialApoyado);
  const [hasGuardado, setHasGuardado] = useState(initialGuardado);
  const [hasComunicado, setHasComunicado] = useState(initialComunicado);
  const [apoyos, setApoyos] = useState(initialApoyos);
  const [guardados, setGuardados] = useState(initialGuardados);
  const [comuniquese, setComuniquese] = useState(initialComuniquese);
  const [loading, setLoading] = useState<string | null>(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  if (!currentUserId) return null;

  async function handleAction(
    action: "apoyar" | "guardar" | "comuniquese",
  ) {
    if (loading) return;
    setLoading(action);

    try {
      const res = await fetch(
        `/api/diario/analisis/${analisisId}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (action === "apoyar") {
        setHasApoyado(data.apoyado);
        setApoyos((c) => (data.apoyado ? c + 1 : c - 1));
      } else if (action === "guardar") {
        setHasGuardado(data.guardado);
        setGuardados((c) => (data.guardado ? c + 1 : c - 1));
      } else if (action === "comuniquese") {
        setHasComunicado(data.comunicado);
        setComuniquese((c) => (data.comunicado ? c + 1 : c - 1));
        if (data.comunicado) {
          toast.success("Comuniquese enviado al autor");
        }
      }
    } catch {
      toast.error("Error al procesar la accion");
    } finally {
      setLoading(null);
    }
  }

  async function handleReport() {
    if (loading) return;
    setLoading("reportar");

    try {
      const res = await fetch(
        `/api/diario/analisis/${analisisId}/reportar`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error();
      toast.success("Reporte enviado. Gracias por tu colaboracion.");
      setShowReportConfirm(false);
    } catch {
      toast.error("Error al reportar");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-8 border-t border-b border-gz-rule py-5">
      <div className="flex flex-wrap items-center gap-3">
        {/* Apoyar */}
        <button
          onClick={() => handleAction("apoyar")}
          disabled={loading === "apoyar"}
          className={`flex items-center gap-1.5 rounded-[3px] px-4 py-2 font-archivo text-[13px] font-medium transition-colors ${
            hasApoyado
              ? "bg-gz-gold/[0.12] text-gz-gold"
              : "border border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark/50"
          }`}
        >
          {hasApoyado ? "Apoyado" : "Apoyar"}
          <span className="font-ibm-mono text-[11px]">({apoyos})</span>
        </button>

        {/* Guardar */}
        <button
          onClick={() => handleAction("guardar")}
          disabled={loading === "guardar"}
          className={`flex items-center gap-1.5 rounded-[3px] px-4 py-2 font-archivo text-[13px] font-medium transition-colors ${
            hasGuardado
              ? "bg-gz-sage/[0.15] text-gz-sage"
              : "border border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark/50"
          }`}
        >
          {hasGuardado ? "Guardado" : "Guardar"}
          <span className="font-ibm-mono text-[11px]">({guardados})</span>
        </button>

        {/* Comuniquese */}
        <button
          onClick={() => handleAction("comuniquese")}
          disabled={loading === "comuniquese"}
          className={`flex items-center gap-1.5 rounded-[3px] px-4 py-2 font-archivo text-[13px] font-medium transition-colors ${
            hasComunicado
              ? "bg-gz-burgundy/[0.1] text-gz-burgundy"
              : "border border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark/50"
          }`}
        >
          {hasComunicado ? "Comunicado" : "Comuniquese"}
          <span className="font-ibm-mono text-[11px]">({comuniquese})</span>
        </button>

        {/* Reportar */}
        <div className="ml-auto">
          {showReportConfirm ? (
            <div className="flex items-center gap-2">
              <span className="font-archivo text-[12px] text-gz-burgundy">
                Confirmar reporte
              </span>
              <button
                onClick={handleReport}
                disabled={loading === "reportar"}
                className="rounded-[3px] bg-gz-burgundy px-3 py-1.5 font-archivo text-[12px] font-medium text-white hover:bg-gz-burgundy/90 disabled:opacity-50"
              >
                {loading === "reportar" ? "..." : "Reportar"}
              </button>
              <button
                onClick={() => setShowReportConfirm(false)}
                className="rounded-[3px] border border-gz-rule px-3 py-1.5 font-archivo text-[12px] text-gz-ink-mid hover:bg-gz-cream-dark/50"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowReportConfirm(true)}
              className="rounded-[3px] border border-gz-rule px-3 py-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-burgundy hover:border-gz-burgundy/30 transition-colors"
            >
              Reportar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
