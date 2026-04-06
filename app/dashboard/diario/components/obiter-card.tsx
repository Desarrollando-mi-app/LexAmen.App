"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { ObiterData } from "../types/obiter";
import { parseObiterContent } from "@/lib/legal-reference-parser";
import { ObiterLegalRef } from "./obiter-legal-ref";

// ─── Types ──────────────────────────────────────────────────

type ObiterCardProps = {
  obiter: ObiterData;
  currentUserId: string | null;
  onApoyar: (id: string) => void;
  onGuardar: (id: string) => void;
  onComuniquese: (id: string) => void;
  onCitar: (obiter: ObiterData) => void;
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

export function ObiterCard({
  obiter,
  currentUserId,
  onApoyar,
  onGuardar,
  onComuniquese,
  onCitar,
  onThreadClick,
  onManage,
  showComuniquesePor,
}: ObiterCardProps) {
  const initials =
    (obiter.user.firstName?.[0] ?? "") + (obiter.user.lastName?.[0] ?? "");

  const isOwnObiter = currentUserId === obiter.userId;

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

  return (
    <div className="mb-3 rounded-[4px] border border-gz-rule bg-white p-5 transition-colors hover:border-gz-gold/40">
      {/* ── Comuníquese header ───────────────────────── */}
      {showComuniquesePor && obiter.comuniquesePor && (
        <div className="mb-3 border-b border-gz-cream-dark pb-3">
          <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              {obiter.comuniquesePor.firstName}{" "}
              {obiter.comuniquesePor.lastName[0]}. comunicó y publicó
          </p>
        </div>
      )}

      {/* ── Author row ───────────────────────────────── */}
      <div className="mb-3 flex items-center gap-3">
        <Link href={`/dashboard/perfil/${obiter.user.id}`}>
          {obiter.user.avatarUrl ? (
            <img
              src={obiter.user.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full border border-gz-gold object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gz-navy font-archivo text-[12px] font-semibold text-gz-gold-bright">
              {initials}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/perfil/${obiter.user.id}`}
            className="font-archivo text-[13px] font-semibold text-gz-ink hover:text-gz-gold transition-colors"
          >
            {obiter.user.firstName} {obiter.user.lastName}
          </Link>
          <p className="font-ibm-mono text-[10px] text-gz-ink-light">
            {metaPieces.join(" · ")}
          </p>
        </div>

        {/* 3-dot menu (only for own obiters) */}
        {isOwnObiter && onManage && (
          <ObiterMenu
            obiterId={obiter.id}
            isPinned={!!!!(obiter as unknown as { pinned?: boolean }).pinned}
            isArchived={!!!!(obiter as unknown as { archived?: boolean }).archived}
            commentsDisabled={!!!!(obiter as unknown as { commentsDisabled?: boolean }).commentsDisabled}
            onManage={onManage}
          />
        )}
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div
        className="mb-3 font-cormorant text-[16px] leading-[1.7] text-gz-ink lg:text-[17px]"
        style={{ whiteSpace: "pre-wrap" }}
      >
        <RenderedContent content={obiter.content} />
      </div>

      {/* ── Cited obiter ─────────────────────────────── */}
      {obiter.citedObiterId && (
        <div
          className="mb-3 cursor-pointer rounded-[3px] border border-gz-rule p-3 transition-colors hover:border-gz-gold/50"
          style={{ backgroundColor: "color-mix(in srgb, var(--gz-cream-dark) 30%, transparent)" }}
        >
          {obiter.citedObiter ? (
            <>
              <p className="mb-1 font-archivo text-[11px] font-semibold text-gz-ink-mid">
                Citando a @{obiter.citedObiter.user.firstName?.toLowerCase()}:
              </p>
              <p className="line-clamp-3 font-cormorant text-[14px] text-gz-ink-mid">
                &ldquo;{obiter.citedObiter.content}&rdquo;
              </p>
            </>
          ) : (
            <p className="font-cormorant text-[14px] italic text-gz-ink-light">
              Este Obiter fue eliminado por su autor
            </p>
          )}
        </div>
      )}

      {/* ── Cited Análisis ───────────────────────────── */}
      {obiter.citedAnalisisId && obiter.citedAnalisis && (
        <Link
          href={`/dashboard/diario/analisis/${obiter.citedAnalisis.id}`}
          className="mb-3 block rounded-[3px] border border-gz-burgundy/30 p-3 transition-colors hover:border-gz-burgundy/60"
          style={{ backgroundColor: "color-mix(in srgb, var(--gz-burgundy) 5%, transparent)" }}
        >
          <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-burgundy">
            Análisis de Sentencia
          </p>
          <p className="font-cormorant text-[15px] font-bold text-gz-ink">
            {obiter.citedAnalisis.titulo}
          </p>
          <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
            {obiter.citedAnalisis.tribunal} · {MATERIA_LABELS[obiter.citedAnalisis.materia] ?? obiter.citedAnalisis.materia}
          </p>
        </Link>
      )}

      {/* ── Cited Ensayo ─────────────────────────────── */}
      {obiter.citedEnsayoId && obiter.citedEnsayo && (
        <Link
          href={`/dashboard/diario/ensayos/${obiter.citedEnsayo.id}`}
          className="mb-3 block rounded-[3px] border border-gz-sage/30 p-3 transition-colors hover:border-gz-sage/60"
          style={{ backgroundColor: "color-mix(in srgb, var(--gz-sage) 5%, transparent)" }}
        >
          <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-sage">
            Ensayo · {ENSAYO_TIPO_LABELS[obiter.citedEnsayo.tipo] ?? obiter.citedEnsayo.tipo}
          </p>
          <p className="font-cormorant text-[15px] font-bold text-gz-ink">
            {obiter.citedEnsayo.titulo}
          </p>
          <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
            {MATERIA_LABELS[obiter.citedEnsayo.materia] ?? obiter.citedEnsayo.materia}
          </p>
        </Link>
      )}

      {/* ── Thread indicator ─────────────────────────── */}
      {obiter.threadPartsCount && obiter.threadPartsCount > 1 && (
        <button
          onClick={() =>
            onThreadClick?.(obiter.threadId ?? obiter.id)
          }
          className="mb-2 mt-1 font-ibm-mono text-[10px] text-gz-gold transition-colors hover:underline"
        >
          Hilo · {obiter.threadPartsCount} partes →
        </button>
      )}

      {/* ── Actions row ──────────────────────────────── */}
      <div className="mt-3 flex items-center gap-0 border-t border-gz-cream-dark pt-3">
        {/* Apoyar */}
        <button
          onClick={() => !isOwnObiter && onApoyar(obiter.id)}
          disabled={isOwnObiter}
          className={`font-ibm-mono text-[13px] tracking-[0.5px] transition-colors ${
            obiter.hasApoyado
              ? "font-semibold text-gz-gold"
              : isOwnObiter
                ? "cursor-default text-gz-ink-light/50"
                : "cursor-pointer text-gz-ink-mid hover:text-gz-gold"
          }`}
        >
          {obiter.hasApoyado ? "♥" : "♡"} Apoyar{obiter.apoyosCount > 0 ? ` ${obiter.apoyosCount}` : ""}
        </button>

        <span className="mx-3 text-gz-rule">|</span>

        {/* Citar */}
        <button
          onClick={() => onCitar(obiter)}
          className="cursor-pointer font-ibm-mono text-[13px] tracking-[0.5px] text-gz-ink-mid transition-colors hover:text-gz-gold"
        >
          Citar{obiter.citasCount > 0 ? ` ${obiter.citasCount}` : ""}
        </button>

        <span className="mx-3 text-gz-rule">|</span>

        {/* Comuníquese */}
        <button
          onClick={() => !isOwnObiter && onComuniquese(obiter.id)}
          disabled={isOwnObiter}
          className={`font-ibm-mono text-[13px] tracking-[0.5px] transition-colors ${
            obiter.hasComunicado
              ? "font-semibold text-gz-gold"
              : isOwnObiter
                ? "cursor-default text-gz-ink-light/50"
                : "cursor-pointer text-gz-ink-mid hover:text-gz-gold"
          }`}
        >
          {obiter.hasComunicado ? "Comunicado" : "Comuníquese"}
        </button>

        <span className="mx-3 text-gz-rule">|</span>

        {/* Guardar */}
        <button
          onClick={() => onGuardar(obiter.id)}
          className={`font-ibm-mono text-[13px] tracking-[0.5px] transition-colors ${
            obiter.hasGuardado
              ? "font-semibold text-gz-gold"
              : "cursor-pointer text-gz-ink-mid hover:text-gz-gold"
          }`}
        >
          {obiter.hasGuardado ? "✓ Guardado" : "Guardar"}
        </button>
      </div>

      {/* ── Pinned indicator ────────────────────────── */}
      {!!(obiter as unknown as { pinned?: boolean }).pinned && (
        <p className="mt-2 font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-gold">
          📌 Fijado
        </p>
      )}

      {/* ── Colegas que apoyaron ─────────────────────── */}
      {colegasText && (
        <p className="mt-2 font-archivo text-[10px] text-gz-ink-light">
          {colegasText}
        </p>
      )}
    </div>
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
  onManage: (id: string, action: string, content?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
                    onManage(obiterId, item.action);
                  }
                } else if (item.action === "edit") {
                  const newContent = prompt("Editar contenido:");
                  if (newContent && newContent.trim()) {
                    onManage(obiterId, item.action, newContent.trim());
                  }
                } else {
                  onManage(obiterId, item.action);
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
