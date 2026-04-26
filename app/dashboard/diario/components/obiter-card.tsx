"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ObiterData } from "../types/obiter";
import { parseObiterContent } from "@/lib/legal-reference-parser";
import { ObiterLegalRef } from "./obiter-legal-ref";
import { ReportButton } from "@/app/components/report-button";
import { LinkPreviewList } from "./link-preview-card";
import { LinkifiedText } from "./linkified-text";
import { useLinkPreviews } from "./use-link-previews";

// ─── Types ──────────────────────────────────────────────────

type ObiterCardProps = {
  obiter: ObiterData;
  currentUserId: string | null;
  onApoyar: (id: string) => void;
  onGuardar: (id: string) => void;
  onComuniquese: (id: string) => void;
  onCitar: (obiter: ObiterData) => void;
  // Si se provee, se llama al click. Si NO se provee, navegamos a la
  // página de detalle del OD donde vive el editor inline de respuestas.
  onResponder?: (obiter: ObiterData) => void;
  onThreadClick?: (threadId: string) => void;
  onManage?: (id: string, action: string, content?: string) => void;
  showComuniquesePor?: boolean;
};

// ─── Helpers ────────────────────────────────────────────────

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
  reflexion: "Reflexión",
  pregunta: "Pregunta",
  cita_doctrinal: "Cita doctrinal",
  opinion: "Opinión",
  dato: "Dato",
};

const ENSAYO_TIPO_LABELS: Record<string, string> = {
  opinion: "Opinión",
  nota_doctrinaria: "Nota doctrinaria",
  comentario_reforma: "Comentario de reforma",
  analisis_comparado: "Análisis comparado",
  tesis: "Tesis / Memoria",
  otro: "Otro",
};

// ─── Rendered Content ───────────────────────────────────────

function RenderedContent({ content }: { content: string }) {
  const parsed = parseObiterContent(content);

  return (
    <>
      {parsed.map((segment, i) => {
        if (segment.type === "text") {
          return <LinkifiedText key={i} text={segment.value} />;
        }
        return (
          <ObiterLegalRef
            key={i}
            article={segment.article}
            code={segment.code}
            originalText={segment.original}
          />
        );
      })}
    </>
  );
}

// ─── Component ──────────────────────────────────────────────

export function ObiterCard({
  obiter,
  currentUserId,
  onApoyar,
  onGuardar,
  onComuniquese,
  onCitar,
  onResponder,
  onThreadClick,
  onManage,
  showComuniquesePor,
}: ObiterCardProps) {
  const router = useRouter();
  const initials =
    (obiter.user.firstName?.[0] ?? "") + (obiter.user.lastName?.[0] ?? "");

  const isOwnObiter = currentUserId === obiter.userId;

  // Lazy-fetch de link previews para ODs viejos sin previews guardados.
  const linkPreviews = useLinkPreviews(
    obiter.id,
    obiter.content,
    obiter.linkPreviews,
  );

  // Meta line pieces
  const metaPieces: string[] = [timeAgo(obiter.createdAt)];
  if (obiter.materia && MATERIA_LABELS[obiter.materia]) {
    metaPieces.push(MATERIA_LABELS[obiter.materia]);
  }
  if (obiter.tipo && TIPO_LABELS[obiter.tipo]) {
    metaPieces.push(TIPO_LABELS[obiter.tipo]);
  }

  // Colegas que apoyaron
  const colegas = obiter.colegasQueApoyaron ?? [];
  let colegasText = "";
  if (colegas.length === 1) {
    colegasText = `${colegas[0].firstName} ${colegas[0].lastName[0]}. apoyó`;
  } else if (colegas.length > 1) {
    colegasText = `${colegas[0].firstName} ${colegas[0].lastName[0]}. y ${colegas.length - 1} más apoyaron`;
  }

  const isThreadStart =
    obiter.threadPartsCount && obiter.threadPartsCount > 1;

  const isPinned = !!(obiter as unknown as { pinned?: boolean }).pinned;

  // Handle generado a partir del firstName en minúsculas (estilo @usuario X).
  const handle = (obiter.user.firstName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  // Color del rail lateral cuando es un hilo (estilo X reply-line).
  // Se conserva el acento burdeos para distinguir hilos.
  return (
    <article
      className={`group relative bg-white transition-colors duration-150 hover:bg-gz-cream-dark/[0.18] border-b border-gz-rule ${
        isPinned ? "bg-gz-gold/[0.04]" : ""
      }`}
    >
      {/* ── Indicador de Comuníquese (header tipo "X reposted") ── */}
      {showComuniquesePor && obiter.comuniquesePor && (
        <div className="px-4 sm:px-5 pt-3 pb-1 flex items-center gap-2 text-gz-ink-light">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path
              d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px]">
            {obiter.comuniquesePor.firstName} {obiter.comuniquesePor.lastName[0]}. comunicó
          </span>
        </div>
      )}

      {/* ── Indicador "Fijado" estilo X pinned ── */}
      {isPinned && (
        <div className="px-4 sm:px-5 pt-3 pb-1 flex items-center gap-2 text-gz-gold">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <path d="M16 9V4l1-1V1H7v2l1 1v5L4 14v2h7v6l1 1 1-1v-6h7v-2l-4-5z" />
          </svg>
          <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] font-semibold">
            Fijado por su autor
          </span>
        </div>
      )}

      {/* ── Body ── */}
      <div className="px-4 sm:px-5 py-3.5 flex gap-3">
        {/* Avatar columna izquierda — estilo X */}
        <Link
          href={`/dashboard/perfil/${obiter.user.id}`}
          className="shrink-0 cursor-pointer transition-transform hover:scale-105"
        >
          {obiter.user.avatarUrl ? (
            <img
              src={obiter.user.avatarUrl}
              alt=""
              className="h-11 w-11 rounded-full object-cover ring-1 ring-gz-rule/50"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gz-navy font-archivo text-[13px] font-semibold text-gz-gold-bright ring-1 ring-gz-rule/50">
              {initials}
            </div>
          )}
        </Link>

        {/* Columna derecha: header + contenido + acciones */}
        <div className="min-w-0 flex-1">
          {/* Header inline: nombre · @handle · • · time · ⋯ */}
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <Link
                href={`/dashboard/perfil/${obiter.user.id}`}
                className="font-archivo text-[14px] font-bold text-gz-ink hover:underline decoration-1 underline-offset-2 cursor-pointer truncate"
              >
                {obiter.user.firstName} {obiter.user.lastName}
              </Link>
              <span className="font-ibm-mono text-[12px] text-gz-ink-light truncate">
                @{handle}
              </span>
              <span className="text-gz-ink-light">·</span>
              <span className="font-ibm-mono text-[12px] text-gz-ink-light shrink-0">
                {timeAgo(obiter.createdAt)}
              </span>
            </div>

            {/* 3-dot menu (only for own obiters) */}
            {isOwnObiter && (
              <ObiterMenu
                obiterId={obiter.id}
                isPinned={isPinned}
                isArchived={!!(obiter as unknown as { archived?: boolean }).archived}
                commentsDisabled={!!(obiter as unknown as { commentsDisabled?: boolean }).commentsDisabled}
                onManage={onManage}
              />
            )}
          </div>

          {/* Materia / Tipo chips (sutiles, debajo del header) */}
          {(obiter.materia || obiter.tipo || isThreadStart) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isThreadStart && (
                <button
                  onClick={() => onThreadClick?.(obiter.threadId ?? obiter.id)}
                  className="group/thread inline-flex items-center gap-1 rounded-full bg-gz-burgundy/[0.08] border border-gz-burgundy/30 px-2 py-0.5 font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-burgundy hover:bg-gz-burgundy hover:text-white hover:border-gz-burgundy transition-all duration-200 cursor-pointer"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Hilo · {obiter.threadPartsCount}
                  <span className="transition-transform group-hover/thread:translate-x-0.5">→</span>
                </button>
              )}
              {obiter.materia && MATERIA_LABELS[obiter.materia] && (
                <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                  · {MATERIA_LABELS[obiter.materia]}
                </span>
              )}
              {obiter.tipo && TIPO_LABELS[obiter.tipo] && (
                <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                  · {TIPO_LABELS[obiter.tipo]}
                </span>
              )}
            </div>
          )}

          {/* Contenido — Cormorant editorial */}
          <div
            className="mt-2 font-cormorant text-[17px] leading-[1.55] text-gz-ink break-words"
            style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            <RenderedContent content={obiter.content} />
          </div>

          {/* Link previews (URLs detectadas en content) */}
          {linkPreviews.length > 0 && (
            <div className="mt-3">
              <LinkPreviewList previews={linkPreviews} />
            </div>
          )}

          {/* Cited obiter — bloque "quote tweet" estilo X */}
          {obiter.citedObiterId && (
            <div
              className="mt-3 cursor-pointer rounded-[10px] border border-gz-rule p-3 transition-all hover:border-gz-gold/50 hover:bg-gz-cream-dark/30"
            >
              {obiter.citedObiter ? (
                <>
                  <p className="mb-1 font-archivo text-[11px] font-semibold text-gz-ink-mid">
                    @{obiter.citedObiter.user.firstName?.toLowerCase()}
                  </p>
                  <p className="line-clamp-3 font-cormorant text-[14px] text-gz-ink-mid leading-snug">
                    {obiter.citedObiter.content}
                  </p>
                </>
              ) : (
                <p className="font-cormorant text-[14px] italic text-gz-ink-light">
                  Este Obiter fue eliminado por su autor
                </p>
              )}
            </div>
          )}

          {/* Cited Análisis */}
          {obiter.citedAnalisisId && obiter.citedAnalisis && (
            <Link
              href={`/dashboard/diario/analisis/${obiter.citedAnalisis.id}`}
              className="mt-3 block rounded-[10px] border border-gz-burgundy/25 p-3 transition-all hover:border-gz-burgundy/60 hover:bg-gz-burgundy/[0.04]"
            >
              <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-burgundy">
                Análisis de Sentencia
              </p>
              <p className="font-cormorant text-[15px] font-bold text-gz-ink leading-snug">
                {obiter.citedAnalisis.titulo}
              </p>
              <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
                {obiter.citedAnalisis.tribunal} · {MATERIA_LABELS[obiter.citedAnalisis.materia] ?? obiter.citedAnalisis.materia}
              </p>
            </Link>
          )}

          {/* Cited Ensayo */}
          {obiter.citedEnsayoId && obiter.citedEnsayo && (
            <Link
              href={`/dashboard/diario/ensayos/${obiter.citedEnsayo.id}`}
              className="mt-3 block rounded-[10px] border border-gz-sage/30 p-3 transition-all hover:border-gz-sage/60 hover:bg-gz-sage/[0.04]"
            >
              <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-sage">
                Ensayo · {ENSAYO_TIPO_LABELS[obiter.citedEnsayo.tipo] ?? obiter.citedEnsayo.tipo}
              </p>
              <p className="font-cormorant text-[15px] font-bold text-gz-ink leading-snug">
                {obiter.citedEnsayo.titulo}
              </p>
              <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
                {MATERIA_LABELS[obiter.citedEnsayo.materia] ?? obiter.citedEnsayo.materia}
              </p>
            </Link>
          )}

          {/* ── Action bar — estilo X con icon-buttons + hover circle ── */}
          <div className="mt-3 flex items-center justify-between max-w-[480px] -ml-2">
            {/* Responder / Reply — chat bubble (navega al detalle si no hay handler) */}
            <ActionButton
              label="Responder"
              count={obiter.replyCount ?? 0}
              active={false}
              disabled={!currentUserId}
              hoverColor="navy"
              onClick={() => {
                if (!currentUserId) return;
                if (onResponder) {
                  onResponder(obiter);
                } else {
                  // Navega al detalle, hash #reply enfoca el editor
                  router.push(`/dashboard/diario/obiter/${obiter.id}#reply`);
                }
              }}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            {/* Citar / Quote */}
            <ActionButton
              label="Citar"
              count={obiter.citasCount}
              active={false}
              hoverColor="gold"
              onClick={() => onCitar(obiter)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 21c0-3.5 2-7 6-7M3 13V8a2 2 0 012-2h4a2 2 0 012 2v5a2 2 0 01-2 2H3zm10 8c0-3.5 2-7 6-7m-6-1V8a2 2 0 012-2h4a2 2 0 012 2v5a2 2 0 01-2 2h-6z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            {/* Comuníquese / Repost */}
            <ActionButton
              label="Comuníquese"
              count={obiter.comuniqueseCount}
              active={obiter.hasComunicado}
              disabled={isOwnObiter}
              hoverColor="sage"
              onClick={() => !isOwnObiter && onComuniquese(obiter.id)}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            {/* Apoyar / Like */}
            <ActionButton
              label="Apoyar"
              count={obiter.apoyosCount}
              active={obiter.hasApoyado}
              disabled={isOwnObiter}
              hoverColor="gold"
              onClick={() => !isOwnObiter && onApoyar(obiter.id)}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={obiter.hasApoyado ? "currentColor" : "none"}
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            {/* Guardar / Bookmark */}
            <ActionButton
              label="Guardar"
              active={obiter.hasGuardado}
              hoverColor="burgundy"
              onClick={() => onGuardar(obiter.id)}
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={obiter.hasGuardado ? "currentColor" : "none"}
                >
                  <path
                    d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            {/* Report (solo en obiters ajenos) — fuera del max-width */}
            {!isOwnObiter && currentUserId && (
              <div className="ml-auto">
                <ReportButton contentType="Obiter" contentId={obiter.id} />
              </div>
            )}
          </div>

          {/* Colegas que apoyaron — pie sutil */}
          {colegasText && (
            <p className="mt-2 font-archivo text-[11px] italic text-gz-ink-light">
              {colegasText}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── ActionButton — estilo X con hover circle ──────────────────

function ActionButton({
  label,
  count,
  active = false,
  disabled = false,
  hoverColor,
  onClick,
  icon,
}: {
  label: string;
  count?: number;
  active?: boolean;
  disabled?: boolean;
  hoverColor: "gold" | "burgundy" | "sage" | "navy";
  onClick: () => void;
  icon: React.ReactNode;
}) {
  // Mapa de clases por color de hover (Tailwind JIT requiere literales)
  const colorMap = {
    gold: {
      activeText: "text-gz-gold",
      hoverText: "group-hover:text-gz-gold",
      hoverBg: "group-hover:bg-gz-gold/[0.10]",
    },
    burgundy: {
      activeText: "text-gz-burgundy",
      hoverText: "group-hover:text-gz-burgundy",
      hoverBg: "group-hover:bg-gz-burgundy/[0.08]",
    },
    sage: {
      activeText: "text-gz-sage",
      hoverText: "group-hover:text-gz-sage",
      hoverBg: "group-hover:bg-gz-sage/[0.10]",
    },
    navy: {
      activeText: "text-gz-navy",
      hoverText: "group-hover:text-gz-navy",
      hoverBg: "group-hover:bg-gz-navy/[0.08]",
    },
  } as const;

  const palette = colorMap[hoverColor];
  const isActive = active && !disabled;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      aria-label={label}
      title={disabled ? `${label} (no disponible en tu propio Obiter)` : label}
      className={`group flex items-center gap-1.5 -my-1 px-1.5 py-1.5 rounded-full transition-colors ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      {/* Círculo de hover detrás del icono */}
      <span
        className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          disabled ? "" : palette.hoverBg
        } ${
          isActive
            ? palette.activeText
            : `text-gz-ink-light ${disabled ? "" : palette.hoverText}`
        }`}
      >
        {icon}
      </span>
      {/* Counter */}
      {typeof count === "number" && count > 0 && (
        <span
          className={`font-ibm-mono text-[12px] tabular-nums transition-colors ${
            isActive
              ? `${palette.activeText} font-semibold`
              : `text-gz-ink-light ${disabled ? "" : palette.hoverText}`
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── 3-Dot Menu Component ──────────────────────────────────

function ObiterMenu({
  obiterId,
  isPinned,
  isArchived,
  commentsDisabled,
  onManage,
}: {
  obiterId: string;
  isPinned: boolean;
  isArchived: boolean;
  commentsDisabled: boolean;
  onManage?: (id: string, action: string, content?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Self-contained handler when parent doesn't provide onManage
  async function handleAction(action: string, content?: string) {
    if (onManage) {
      onManage(obiterId, action, content);
      return;
    }
    // Direct API call
    try {
      if (action === "delete") {
        await fetch(`/api/obiter/${obiterId}`, { method: "DELETE" });
      } else {
        await fetch(`/api/obiter/${obiterId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...(content ? { content } : {}) }),
        });
      }
      router.refresh();
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const items = [
    {
      label: isArchived ? "Desarchivar" : "Archivar",
      icon: "📦",
      action: isArchived ? "unarchive" : "archive",
    },
    {
      label: commentsDisabled ? "Activar comentarios" : "Desactivar comentarios",
      icon: commentsDisabled ? "💬" : "🔇",
      action: commentsDisabled ? "enableComments" : "disableComments",
    },
    {
      label: "Editar",
      icon: "✏️",
      action: "edit",
    },
    {
      label: isPinned ? "Desfijar" : "Fijar",
      icon: "📌",
      action: isPinned ? "unpin" : "pin",
    },
    {
      label: "Eliminar",
      icon: "🗑️",
      action: "delete",
      danger: true,
    },
  ];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-gz-ink-light transition-colors hover:bg-gz-cream-dark hover:text-gz-ink"
      >
        <span className="text-[16px] leading-none">⋯</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[220px] rounded-lg border border-gz-rule bg-white py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.action}
              onClick={() => {
                setOpen(false);
                if (item.action === "delete") {
                  if (confirm("¿Estás seguro de que quieres eliminar este Obiter?")) {
                    handleAction(item.action);
                  }
                } else if (item.action === "edit") {
                  const newContent = prompt("Editar contenido:");
                  if (newContent && newContent.trim()) {
                    handleAction(item.action, newContent.trim());
                  }
                } else {
                  handleAction(item.action);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 font-archivo text-[13px] transition-colors ${
                (item as { danger?: boolean }).danger
                  ? "text-gz-burgundy hover:bg-gz-burgundy/5"
                  : "text-gz-ink hover:bg-gz-gold/5"
              }`}
            >
              <span className="text-[14px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
