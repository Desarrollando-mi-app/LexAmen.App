"use client";

import { useState } from "react";
import Link from "next/link";
import type { ObiterData } from "../types/obiter";
import { parseObiterContent } from "@/lib/legal-reference-parser";
import { ObiterLegalRef } from "./obiter-legal-ref";
import { LinkPreviewList } from "./link-preview-card";
import { ObiterEditor } from "./obiter-editor";
import { LinkifiedText } from "./linkified-text";
import { useLinkPreviews } from "./use-link-previews";

// ─── Types ──────────────────────────────────────────────────

type ObiterThreadViewProps = {
  threadObiters: ObiterData[]; // ordenados por threadOrder ASC
  currentUserId: string | null;
  userFirstName?: string;
  userAvatarUrl?: string | null;
  onApoyar: (id: string) => void;
  onGuardar: (id: string) => void;
  onComuniquese: (id: string) => void;
  onCitar: (obiter: ObiterData) => void;
  onClose?: () => void;
  onPublishedNewPart?: (obiter: ObiterData) => void;
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

const OBITER_MAX_THREAD_PARTS = 10;

export function ObiterThreadView({
  threadObiters,
  currentUserId,
  userFirstName,
  userAvatarUrl,
  onApoyar,
  onGuardar,
  onComuniquese,
  onCitar,
  onClose,
  onPublishedNewPart,
}: ObiterThreadViewProps) {
  const [composing, setComposing] = useState(false);

  if (threadObiters.length === 0) return null;

  const firstObiter = threadObiters[0];
  const total = threadObiters.length;
  const author = firstObiter.user;

  const isOwnThread = currentUserId === firstObiter.userId;
  const canExtend =
    isOwnThread && total < OBITER_MAX_THREAD_PARTS;
  const lastPart = threadObiters[threadObiters.length - 1];
  const threadId = firstObiter.threadId ?? firstObiter.id;
  const nextOrder = (lastPart.threadOrder ?? total) + 1;

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      {/* Rail superior tricolor */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-burgundy via-gz-gold to-gz-navy" />

      {/* ── Header editorial ──────────────────────────────── */}
      <div className="relative flex items-start justify-between gap-3 border-b border-gz-rule/60 px-5 py-4 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-start gap-3 min-w-0">
          <Link href={`/dashboard/perfil/${author.id}`} className="shrink-0">
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatarUrl}
                alt=""
                className="h-12 w-12 rounded-full border-2 border-gz-gold object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gz-navy font-cormorant text-[16px] font-bold text-gz-gold-bright border-2 border-gz-gold">
                {(author.firstName?.[0] ?? "") + (author.lastName?.[0] ?? "")}
              </div>
            )}
          </Link>
          <div className="min-w-0">
            <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-burgundy mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
              Hilo · {total} {total === 1 ? "parte" : "partes"}
            </p>
            <Link
              href={`/dashboard/perfil/${author.id}`}
              className="font-cormorant text-[20px] font-bold text-gz-ink hover:text-gz-gold transition-colors leading-tight"
            >
              {author.firstName} {author.lastName}
            </Link>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-0.5">
              {timeAgo(firstObiter.createdAt)}
              {firstObiter.materia && MATERIA_LABELS[firstObiter.materia] && (
                <> · {MATERIA_LABELS[firstObiter.materia]}</>
              )}
              {firstObiter.tipo && TIPO_LABELS[firstObiter.tipo] && (
                <> · {TIPO_LABELS[firstObiter.tipo]}</>
              )}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Thread parts (Twitter-style con línea continua) ── */}
      <div className="relative px-5 py-4">
        {/* Línea vertical continua */}
        <div
          className="absolute left-[44px] top-6 bottom-4 w-[2px] bg-gradient-to-b from-gz-gold/60 via-gz-gold/30 to-gz-gold/10 rounded-full"
          aria-hidden
        />

        <div className="space-y-5">
          {threadObiters.map((obiter, idx) => (
            <ThreadPart
              key={obiter.id}
              obiter={obiter}
              idx={idx}
              total={total}
              isLast={idx === threadObiters.length - 1}
              currentUserId={currentUserId}
              onApoyar={onApoyar}
              onGuardar={onGuardar}
              onComuniquese={onComuniquese}
              onCitar={onCitar}
            />
          ))}
        </div>
      </div>

      {/* ── Continuar hilo (solo dueño + bajo el límite) ──── */}
      {canExtend && currentUserId && (
        <div className="border-t border-gz-rule/60 bg-gradient-to-b from-transparent to-gz-cream-dark/20 px-5 py-4">
          {!composing ? (
            <button
              onClick={() => setComposing(true)}
              className="group inline-flex items-center gap-2 rounded-full border-2 border-dashed border-gz-gold/60 bg-white px-4 py-2 font-archivo text-[13px] font-semibold text-gz-gold hover:border-gz-gold hover:bg-gz-gold hover:text-white hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span className="font-cormorant text-[20px] leading-none -mt-px transition-transform duration-200 group-hover:rotate-90">
                +
              </span>
              Continuar el hilo
              <span className="font-ibm-mono text-[10px] tracking-[1px] opacity-70">
                · parte {nextOrder} de {OBITER_MAX_THREAD_PARTS}
              </span>
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-burgundy flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
                  Nueva parte · {nextOrder} de {OBITER_MAX_THREAD_PARTS}
                </p>
                <button
                  onClick={() => setComposing(false)}
                  className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer"
                  aria-label="Cancelar"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ObiterEditor
                userId={currentUserId}
                userFirstName={userFirstName ?? "Tú"}
                userAvatarUrl={userAvatarUrl ?? null}
                threadId={threadId}
                threadOrder={nextOrder}
                onPublished={(newObiter) => {
                  if (onPublishedNewPart) onPublishedNewPart(newObiter);
                  setComposing(false);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Footer info para no-dueños ────────────────────── */}
      {!isOwnThread && currentUserId && (
        <div className="border-t border-gz-rule/60 px-5 py-3 bg-gradient-to-b from-transparent to-gz-cream-dark/20">
          <button
            onClick={() => onComuniquese(firstObiter.id)}
            disabled={firstObiter.hasComunicado}
            className="font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-burgundy transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50"
          >
            {firstObiter.hasComunicado ? "✓ Hilo comunicado" : "📣 Comuníquese (todo el hilo)"}
          </button>
        </div>
      )}
    </section>
  );
}

// ─── ThreadPart (sub-componente para una parte del hilo) ────

function ThreadPart({
  obiter,
  idx,
  total,
  isLast,
  currentUserId,
  onApoyar,
  onGuardar,
  onComuniquese,
  onCitar,
}: {
  obiter: ObiterData;
  idx: number;
  total: number;
  isLast: boolean;
  currentUserId: string | null;
  onApoyar: (id: string) => void;
  onGuardar: (id: string) => void;
  onComuniquese: (id: string) => void;
  onCitar: (obiter: ObiterData) => void;
}) {
  const isOwnObiter = currentUserId === obiter.userId;
  const linkPreviews = useLinkPreviews(
    obiter.id,
    obiter.content,
    obiter.linkPreviews,
  );

  return (
    <article className="relative flex gap-4">
      {/* Numeral marker */}
      <div className="relative z-10 shrink-0">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
            idx === 0
              ? "border-gz-burgundy bg-gz-burgundy text-white"
              : "border-gz-gold bg-white text-gz-gold"
          } shadow-sm`}
        >
          <span className="font-cormorant text-[16px] font-bold leading-none">
            {idx + 1}
          </span>
        </div>
        {!isLast && (
          <p className="font-ibm-mono text-[8px] text-gz-ink-light/60 text-center mt-1 -mb-1">
            /{total}
          </p>
        )}
      </div>

      {/* Contenido */}
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">
            Parte {idx + 1} <span className="text-gz-ink-light/50">de {total}</span>
          </span>
          {idx > 0 && (
            <span className="font-ibm-mono text-[9px] text-gz-ink-light/50">
              · {timeAgo(obiter.createdAt)}
            </span>
          )}
        </div>

        {/* Content */}
        <div
          className="font-cormorant text-[16px] leading-[1.7] text-gz-ink lg:text-[17px] mb-3 break-words"
          style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
        >
          <RenderedContent content={obiter.content} />
        </div>

        {/* Link previews */}
        {linkPreviews.length > 0 && (
          <LinkPreviewList previews={linkPreviews} compact />
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center gap-3 font-ibm-mono text-[10px] text-gz-ink-light">
          <button
            onClick={() => !isOwnObiter && onApoyar(obiter.id)}
            disabled={isOwnObiter}
            className={`inline-flex items-center gap-1 transition-colors ${
              obiter.hasApoyado
                ? "font-semibold text-gz-burgundy"
                : isOwnObiter
                ? "cursor-default text-gz-ink-light/50"
                : "cursor-pointer hover:text-gz-burgundy"
            }`}
          >
            <span>{obiter.hasApoyado ? "♥" : "♡"}</span>
            {obiter.apoyosCount > 0 ? obiter.apoyosCount : ""}
          </button>
          <span className="text-gz-rule/70">·</span>
          <button
            onClick={() => onCitar(obiter)}
            className="cursor-pointer transition-colors hover:text-gz-gold"
          >
            Citar{obiter.citasCount > 0 ? ` ${obiter.citasCount}` : ""}
          </button>
          <span className="text-gz-rule/70">·</span>
          <button
            onClick={() => onGuardar(obiter.id)}
            className={`cursor-pointer transition-colors ${
              obiter.hasGuardado
                ? "font-semibold text-gz-gold"
                : "hover:text-gz-gold"
            }`}
          >
            {obiter.hasGuardado ? "✓ Guardado" : "Guardar"}
          </button>
          {!isOwnObiter && (
            <>
              <span className="text-gz-rule/70">·</span>
              <button
                onClick={() => onComuniquese(obiter.id)}
                className={`cursor-pointer transition-colors ${
                  obiter.hasComunicado
                    ? "font-semibold text-gz-gold"
                    : "hover:text-gz-gold"
                }`}
              >
                {obiter.hasComunicado ? "Comunicado" : "Comuníquese"}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
