"use client";

import type { ObiterData } from "../types/obiter";
import { parseObiterContent } from "@/lib/legal-reference-parser";
import { ObiterLegalRef } from "./obiter-legal-ref";

// ─── Types ──────────────────────────────────────────────────

type ObiterThreadViewProps = {
  threadObiters: ObiterData[]; // ordenados por threadOrder ASC
  currentUserId: string | null;
  onApoyar: (id: string) => void;
  onGuardar: (id: string) => void;
  onComuniquese: (id: string) => void;
  onCitar: (obiter: ObiterData) => void;
  onClose: () => void;
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

// ─── Rendered Content ───────────────────────────────────────

function RenderedContent({ content }: { content: string }) {
  const parsed = parseObiterContent(content);

  return (
    <>
      {parsed.map((segment, i) => {
        if (segment.type === "text") {
          return <span key={i}>{segment.value}</span>;
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

export function ObiterThreadView({
  threadObiters,
  currentUserId,
  onApoyar,
  onGuardar,
  onComuniquese,
  onCitar,
  onClose,
}: ObiterThreadViewProps) {
  if (threadObiters.length === 0) return null;

  const firstObiter = threadObiters[0];
  const total = threadObiters.length;
  const author = firstObiter.user;

  // Meta pieces for header
  const metaPieces: string[] = [
    `por ${author.firstName} ${author.lastName}`,
    timeAgo(firstObiter.createdAt),
  ];
  if (firstObiter.materia && MATERIA_LABELS[firstObiter.materia]) {
    metaPieces.push(MATERIA_LABELS[firstObiter.materia]);
  }

  return (
    <div className="mb-3 overflow-hidden rounded-[4px] border border-gz-rule bg-white">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="relative border-b border-gz-rule px-5 pb-3 pt-5">
        <p className="mb-2 flex items-center gap-2 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
          <span>🧵</span>
          <span>
            Hilo · {total} {total === 1 ? "parte" : "partes"}
          </span>
        </p>
        <p className="font-archivo text-[13px] text-gz-ink-mid">
          {metaPieces.join(" · ")}
        </p>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gz-ink-light transition-colors hover:text-gz-ink"
        >
          ✕
        </button>
      </div>

      {/* ── Thread parts ────────────────────────────────────── */}
      {threadObiters.map((obiter, idx) => {
        const isOwnObiter = currentUserId === obiter.userId;

        return (
          <div key={obiter.id}>
            {/* Connector line between parts */}
            {idx > 0 && (
              <div className="ml-[20px] h-4 border-l-2 border-gz-gold/30" />
            )}

            {/* Part content */}
            <div className="px-5 py-4">
              {/* Part number */}
              <p className="mb-2 font-ibm-mono text-[9px] text-gz-ink-light">
                {idx + 1}/{total}
              </p>

              {/* Content */}
              <div
                className="mb-3 font-cormorant text-[16px] leading-[1.7] text-gz-ink lg:text-[17px]"
                style={{ whiteSpace: "pre-wrap" }}
              >
                <RenderedContent content={obiter.content} />
              </div>

              {/* Actions (compact) */}
              <div className="mt-3 flex items-center gap-0 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
                <button
                  onClick={() => !isOwnObiter && onApoyar(obiter.id)}
                  disabled={isOwnObiter}
                  className={`transition-colors ${
                    obiter.hasApoyado
                      ? "font-semibold text-gz-gold"
                      : isOwnObiter
                        ? "cursor-default text-gz-ink-light/50"
                        : "cursor-pointer hover:text-gz-gold"
                  }`}
                >
                  Apoyar{obiter.apoyosCount > 0 ? ` ${obiter.apoyosCount}` : ""}
                </button>
                <span className="mx-1.5 text-gz-ink-light/30">·</span>
                <button
                  onClick={() => onCitar(obiter)}
                  className="cursor-pointer transition-colors hover:text-gz-gold"
                >
                  Citar{obiter.citasCount > 0 ? ` ${obiter.citasCount}` : ""}
                </button>
                <span className="mx-1.5 text-gz-ink-light/30">·</span>
                <button
                  onClick={() => onGuardar(obiter.id)}
                  className={`transition-colors ${
                    obiter.hasGuardado
                      ? "font-semibold text-gz-gold"
                      : "cursor-pointer hover:text-gz-gold"
                  }`}
                >
                  {obiter.hasGuardado ? "Guardado" : "Guardar"}
                </button>
                <span className="mx-1.5 text-gz-ink-light/30">·</span>
                <button
                  onClick={() => !isOwnObiter && onComuniquese(obiter.id)}
                  disabled={isOwnObiter}
                  className={`transition-colors ${
                    obiter.hasComunicado
                      ? "font-semibold text-gz-gold"
                      : isOwnObiter
                        ? "cursor-default text-gz-ink-light/50"
                        : "cursor-pointer hover:text-gz-gold"
                  }`}
                >
                  {obiter.hasComunicado ? "Comunicado" : "Comuníquese"}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Footer: Comuníquese hilo completo ───────────────── */}
      <div
        className="flex items-center justify-center border-t border-gz-rule px-5 py-3"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--gz-cream) 50%, transparent)",
        }}
      >
        <button
          onClick={() => {
            // Comuníquese on the first obiter (thread root)
            if (currentUserId !== firstObiter.userId) {
              onComuniquese(firstObiter.id);
            }
          }}
          disabled={currentUserId === firstObiter.userId}
          className={`cursor-pointer font-archivo text-[12px] font-semibold transition-colors ${
            currentUserId === firstObiter.userId
              ? "cursor-default text-gz-ink-light/50"
              : "text-gz-gold hover:text-gz-ink"
          }`}
        >
          Comuníquese (hilo completo)
        </button>
      </div>
    </div>
  );
}
