"use client";

import Link from "next/link";
import type { EnsayoPreview } from "../types/obiter";

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

const TIPO_LABELS: Record<string, string> = {
  opinion: "Opinión",
  nota_doctrinaria: "Nota doctrinaria",
  comentario_reforma: "Comentario de reforma",
  analisis_comparado: "Análisis comparado",
  tesis: "Tesis / Memoria",
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

type EnsayoPreviewCardProps = {
  ensayo: EnsayoPreview;
  currentUserId: string | null;
  onApoyar?: (id: string) => void;
  onGuardar?: (id: string) => void;
  onComuniquese?: (id: string) => void;
};

// ─── Component ──────────────────────────────────────────────

export function EnsayoPreviewCard({
  ensayo,
  currentUserId,
  onApoyar,
  onGuardar,
  onComuniquese,
}: EnsayoPreviewCardProps) {
  const initials =
    (ensayo.user.firstName?.[0] ?? "") + (ensayo.user.lastName?.[0] ?? "");
  const isOwn = currentUserId === ensayo.user.id;

  const formatLabel = ensayo.archivoFormato === "pdf" ? "PDF" : "DOCX";

  return (
    <div className="mb-3 rounded-[4px] border border-gz-rule bg-white transition-colors hover:border-gz-gold/40">
      {/* ── Type badge ──────────────────────────────── */}
      <div className="border-b border-gz-cream-dark px-5 py-2">
        <span className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-sage">
          {formatLabel} · Ensayo · {TIPO_LABELS[ensayo.tipo] ?? ensayo.tipo}
        </span>
      </div>

      <div className="p-5">
        {/* ── Author row ─────────────────────────────── */}
        <div className="mb-3 flex items-center gap-3">
          <Link href={`/dashboard/perfil/${ensayo.user.id}`}>
            {ensayo.user.avatarUrl ? (
              <img
                src={ensayo.user.avatarUrl}
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
              href={`/dashboard/perfil/${ensayo.user.id}`}
              className="font-archivo text-[12px] font-semibold text-gz-ink hover:text-gz-gold transition-colors"
            >
              {ensayo.user.firstName} {ensayo.user.lastName}
            </Link>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              {timeAgo(ensayo.createdAt)} · {ensayo.archivoFormato.toUpperCase()}
            </p>
          </div>
        </div>

        {/* ── Title ──────────────────────────────────── */}
        <Link href={`/dashboard/diario/ensayos/${ensayo.id}`}>
          <h3 className="mb-2 font-cormorant text-[18px] font-bold leading-tight text-gz-ink hover:text-gz-gold transition-colors">
            {ensayo.titulo}
          </h3>
        </Link>

        {/* ── Resumen ────────────────────────────────── */}
        {ensayo.resumen && (
          <p className="mb-3 line-clamp-3 font-cormorant text-[15px] leading-relaxed text-gz-ink-mid">
            {ensayo.resumen}
          </p>
        )}

        {/* ── Badges ─────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {ensayo.materia && MATERIA_LABELS[ensayo.materia] && (
            <span className="inline-block rounded-[2px] bg-gz-cream-dark px-2 py-0.5 font-ibm-mono text-[9px] text-gz-ink-mid">
              {MATERIA_LABELS[ensayo.materia]}
            </span>
          )}
          {ensayo.downloadsCount > 0 && (
            <span className="inline-block rounded-[2px] bg-gz-cream-dark px-2 py-0.5 font-ibm-mono text-[9px] text-gz-ink-light">
              {ensayo.downloadsCount} descarga{ensayo.downloadsCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* ── Actions ────────────────────────────────── */}
        <div className="mt-3 flex items-center gap-0 border-t border-gz-cream-dark pt-3">
          <button
            onClick={() => !isOwn && onApoyar?.(ensayo.id)}
            disabled={isOwn}
            className={`font-ibm-mono text-[11px] tracking-[0.5px] transition-colors ${
              ensayo.hasApoyado
                ? "font-semibold text-gz-gold"
                : isOwn
                  ? "cursor-default text-gz-ink-light/50"
                  : "cursor-pointer text-gz-ink-light hover:text-gz-gold"
            }`}
          >
            Apoyar{ensayo.apoyosCount > 0 ? ` ${ensayo.apoyosCount}` : ""}
          </button>

          <span className="mx-2 text-gz-ink-light/30">·</span>

          <span className="font-ibm-mono text-[11px] tracking-[0.5px] text-gz-ink-light">
            Citar{ensayo.citasCount > 0 ? ` ${ensayo.citasCount}` : ""}
          </span>

          <span className="mx-2 text-gz-ink-light/30">·</span>

          <button
            onClick={() => onGuardar?.(ensayo.id)}
            className={`font-ibm-mono text-[11px] tracking-[0.5px] transition-colors ${
              ensayo.hasGuardado
                ? "font-semibold text-gz-gold"
                : "cursor-pointer text-gz-ink-light hover:text-gz-gold"
            }`}
          >
            {ensayo.hasGuardado ? "Guardado" : "Guardar"}
          </button>

          <span className="mx-2 text-gz-ink-light/30">·</span>

          <button
            onClick={() => !isOwn && onComuniquese?.(ensayo.id)}
            disabled={isOwn}
            className={`font-ibm-mono text-[11px] tracking-[0.5px] transition-colors ${
              ensayo.hasComunicado
                ? "font-semibold text-gz-gold"
                : isOwn
                  ? "cursor-default text-gz-ink-light/50"
                  : "cursor-pointer text-gz-ink-light hover:text-gz-gold"
            }`}
          >
            {ensayo.hasComunicado ? "Comunicado" : "Comuníquese"}
          </button>
        </div>
      </div>
    </div>
  );
}
