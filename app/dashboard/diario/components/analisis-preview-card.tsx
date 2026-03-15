"use client";

import Link from "next/link";
import type { AnalisisPreview } from "../types/obiter";

// ─── Helpers ────────────────────────────────────────────────

const MATERIA_LABELS: Record<string, string> = {
  acto_juridico: "Acto Jurídico",
  obligaciones: "Obligaciones",
  contratos: "Contratos",
  procesal_civil: "Procesal Civil",
  bienes: "Bienes",
  familia: "Familia",
  sucesiones: "Sucesiones",
  otro: "Otro",
};

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

// ─── Types ──────────────────────────────────────────────────

type AnalisisPreviewCardProps = {
  analisis: AnalisisPreview;
  currentUserId: string | null;
  onApoyar?: (id: string) => void;
  onGuardar?: (id: string) => void;
  onComuniquese?: (id: string) => void;
};

// ─── Component ──────────────────────────────────────────────

export function AnalisisPreviewCard({
  analisis,
  currentUserId,
  onApoyar,
  onGuardar,
  onComuniquese,
}: AnalisisPreviewCardProps) {
  const initials =
    (analisis.user.firstName?.[0] ?? "") + (analisis.user.lastName?.[0] ?? "");
  const isOwn = currentUserId === analisis.user.id;

  return (
    <div className="mb-3 rounded-[4px] border border-gz-rule bg-white transition-colors hover:border-gz-gold/40">
      {/* ── Type badge ──────────────────────────────── */}
      <div className="border-b border-gz-cream-dark px-5 py-2">
        <span className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-burgundy">
          Análisis de Sentencia
        </span>
      </div>

      <div className="p-5">
        {/* ── Author row ─────────────────────────────── */}
        <div className="mb-3 flex items-center gap-3">
          <Link href={`/dashboard/perfil/${analisis.user.id}`}>
            {analisis.user.avatarUrl ? (
              <img
                src={analisis.user.avatarUrl}
                alt=""
                className="h-8 w-8 rounded-full border border-gz-gold object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gz-navy font-archivo text-[11px] font-semibold text-gz-gold-bright">
                {initials}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/perfil/${analisis.user.id}`}
              className="font-archivo text-[12px] font-semibold text-gz-ink hover:text-gz-gold transition-colors"
            >
              {analisis.user.firstName} {analisis.user.lastName}
            </Link>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              {timeAgo(analisis.createdAt)} · {analisis.tiempoLectura} min lectura
            </p>
          </div>
        </div>

        {/* ── Title ──────────────────────────────────── */}
        <Link href={`/dashboard/diario/analisis/${analisis.id}`}>
          <h3 className="mb-2 font-cormorant text-[18px] font-bold leading-tight text-gz-ink hover:text-gz-gold transition-colors">
            {analisis.titulo}
          </h3>
        </Link>

        {/* ── Court info ─────────────────────────────── */}
        <p className="mb-2 font-ibm-mono text-[10px] text-gz-ink-mid">
          {analisis.tribunal} · Rol {analisis.numeroRol}
        </p>

        {/* ── Resumen ────────────────────────────────── */}
        <p className="mb-3 line-clamp-3 font-cormorant text-[15px] leading-relaxed text-gz-ink-mid">
          {analisis.resumen}
        </p>

        {/* ── Materia badge ──────────────────────────── */}
        {analisis.materia && MATERIA_LABELS[analisis.materia] && (
          <span className="mr-2 inline-block rounded-[2px] bg-gz-cream-dark px-2 py-0.5 font-ibm-mono text-[9px] text-gz-ink-mid">
            {MATERIA_LABELS[analisis.materia]}
          </span>
        )}

        {/* ── Actions ────────────────────────────────── */}
        <div className="mt-3 flex items-center gap-0 border-t border-gz-cream-dark pt-3">
          <button
            onClick={() => !isOwn && onApoyar?.(analisis.id)}
            disabled={isOwn}
            className={`font-ibm-mono text-[11px] tracking-[0.5px] transition-colors ${
              analisis.hasApoyado
                ? "font-semibold text-gz-gold"
                : isOwn
                  ? "cursor-default text-gz-ink-light/50"
                  : "cursor-pointer text-gz-ink-light hover:text-gz-gold"
            }`}
          >
            Apoyar{analisis.apoyosCount > 0 ? ` ${analisis.apoyosCount}` : ""}
          </button>

          <span className="mx-2 text-gz-ink-light/30">·</span>

          <span className="font-ibm-mono text-[11px] tracking-[0.5px] text-gz-ink-light">
            Citar{analisis.citasCount > 0 ? ` ${analisis.citasCount}` : ""}
          </span>

          <span className="mx-2 text-gz-ink-light/30">·</span>

          <button
            onClick={() => onGuardar?.(analisis.id)}
            className={`font-ibm-mono text-[11px] tracking-[0.5px] transition-colors ${
              analisis.hasGuardado
                ? "font-semibold text-gz-gold"
                : "cursor-pointer text-gz-ink-light hover:text-gz-gold"
            }`}
          >
            {analisis.hasGuardado ? "Guardado" : "Guardar"}
          </button>

          <span className="mx-2 text-gz-ink-light/30">·</span>

          <button
            onClick={() => !isOwn && onComuniquese?.(analisis.id)}
            disabled={isOwn}
            className={`font-ibm-mono text-[11px] tracking-[0.5px] transition-colors ${
              analisis.hasComunicado
                ? "font-semibold text-gz-gold"
                : isOwn
                  ? "cursor-default text-gz-ink-light/50"
                  : "cursor-pointer text-gz-ink-light hover:text-gz-gold"
            }`}
          >
            {analisis.hasComunicado ? "Comunicado" : "Comuníquese"}
          </button>
        </div>
      </div>
    </div>
  );
}
