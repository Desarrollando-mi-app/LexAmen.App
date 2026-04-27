"use client";

import { useState, useEffect, useRef, forwardRef } from "react";
import Link from "next/link";
import type { ObiterData } from "../../types/obiter";
import { ObiterCard } from "../../components/obiter-card";
import { ObiterThreadView } from "../../components/obiter-thread-view";
import { ObiterCiteChain } from "../../components/obiter-cite-chain";
import { ObiterEditor } from "../../components/obiter-editor";

// ─── Types ──────────────────────────────────────────────────

type CitationItem = {
  id: string;
  content: string;
  createdAt: string;
  apoyosCount: number;
  citasCount: number;
  user: {
    id?: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
};

type ObiterDetailClientProps = {
  obiter: ObiterData;
  threadParts: ObiterData[] | null;
  citations: CitationItem[];
  replies?: ObiterData[];
  parentContext?: ParentContext | null;
  colegaIds?: string[];
  commentsDisabled?: boolean;
  currentUserId: string | null;
  currentUserFirstName?: string;
  currentUserAvatarUrl?: string | null;
};

type ParentContext = {
  id: string;
  content: string;
  user: { id: string; firstName: string; lastName: string };
};

// ─── Component ──────────────────────────────────────────────

export function ObiterDetailClient({
  obiter: initialObiter,
  threadParts: initialThreadParts,
  citations,
  replies: initialReplies,
  parentContext,
  colegaIds,
  commentsDisabled,
  currentUserId,
  currentUserFirstName,
  currentUserAvatarUrl,
}: ObiterDetailClientProps) {
  const [obiter, setObiter] = useState(initialObiter);
  const [threadParts, setThreadParts] = useState(initialThreadParts);
  const [replies, setReplies] = useState<ObiterData[]>(initialReplies ?? []);
  const replyEditorRef = useRef<HTMLDivElement>(null);

  // Si la URL trae #reply, scroll suave al editor de respuestas y enfocar
  // el textarea. Permite que la acción "Responder" desde la card del feed
  // navegue directamente al modo respuesta.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#reply") return;
    if (!currentUserId) return;
    const t = setTimeout(() => {
      replyEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const ta = replyEditorRef.current?.querySelector("textarea");
      ta?.focus();
    }, 200);
    return () => clearTimeout(t);
  }, [currentUserId]);

  // ─── Optimistic toggle helpers ──────────────────────────

  function updateObiter(id: string, updater: (o: ObiterData) => ObiterData) {
    if (obiter.id === id) {
      setObiter(updater(obiter));
    }
    if (threadParts) {
      setThreadParts(
        threadParts.map((o) => (o.id === id ? updater(o) : o))
      );
    }
    setReplies((prev) => prev.map((o) => (o.id === id ? updater(o) : o)));
  }

  async function handleApoyar(id: string) {
    if (!currentUserId) return;

    const target =
      obiter.id === id
        ? obiter
        : threadParts?.find((o) => o.id === id) ??
          replies.find((o) => o.id === id);
    if (!target) return;

    const wasApoyado = target.hasApoyado;

    updateObiter(id, (o) => ({
      ...o,
      hasApoyado: !wasApoyado,
      apoyosCount: o.apoyosCount + (wasApoyado ? -1 : 1),
    }));

    try {
      const res = await fetch(`/api/obiter/${id}/apoyar`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        updateObiter(id, (o) => ({
          ...o,
          hasApoyado: wasApoyado,
          apoyosCount: o.apoyosCount + (wasApoyado ? 1 : -1),
        }));
      }
    } catch {
      updateObiter(id, (o) => ({
        ...o,
        hasApoyado: wasApoyado,
        apoyosCount: o.apoyosCount + (wasApoyado ? 1 : -1),
      }));
    }
  }

  async function handleGuardar(id: string) {
    if (!currentUserId) return;

    const target =
      obiter.id === id
        ? obiter
        : threadParts?.find((o) => o.id === id) ??
          replies.find((o) => o.id === id);
    if (!target) return;

    const wasGuardado = target.hasGuardado;

    updateObiter(id, (o) => ({
      ...o,
      hasGuardado: !wasGuardado,
      guardadosCount: o.guardadosCount + (wasGuardado ? -1 : 1),
    }));

    try {
      const res = await fetch(`/api/obiter/${id}/guardar`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        updateObiter(id, (o) => ({
          ...o,
          hasGuardado: wasGuardado,
          guardadosCount: o.guardadosCount + (wasGuardado ? 1 : -1),
        }));
      }
    } catch {
      updateObiter(id, (o) => ({
        ...o,
        hasGuardado: wasGuardado,
        guardadosCount: o.guardadosCount + (wasGuardado ? 1 : -1),
      }));
    }
  }

  async function handleComuniquese(id: string) {
    if (!currentUserId) return;

    const target =
      obiter.id === id
        ? obiter
        : threadParts?.find((o) => o.id === id) ??
          replies.find((o) => o.id === id);
    if (!target) return;

    const wasComunicado = target.hasComunicado;

    updateObiter(id, (o) => ({
      ...o,
      hasComunicado: !wasComunicado,
      comuniqueseCount: o.comuniqueseCount + (wasComunicado ? -1 : 1),
    }));

    try {
      const res = await fetch(`/api/obiter/${id}/comuniquese`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        updateObiter(id, (o) => ({
          ...o,
          hasComunicado: wasComunicado,
          comuniqueseCount: o.comuniqueseCount + (wasComunicado ? 1 : -1),
        }));
      }
    } catch {
      updateObiter(id, (o) => ({
        ...o,
        hasComunicado: wasComunicado,
        comuniqueseCount: o.comuniqueseCount + (wasComunicado ? 1 : -1),
      }));
    }
  }

  function handleCitar() {
    // Navigate to the diario page for citing
    window.location.href = "/dashboard/diario";
  }

  const isThread = threadParts && threadParts.length > 1;

  // Cuando se publica una parte nueva del hilo, la añadimos optimistically
  // al threadParts y reseteamos el thread.
  function handlePublishedNewPart(newPart: ObiterData) {
    setThreadParts((prev) => {
      const list = prev ?? [obiter];
      // Aseguramos no duplicar
      if (list.some((p) => p.id === newPart.id)) return list;
      return [...list, newPart].sort(
        (a, b) => (a.threadOrder ?? 0) - (b.threadOrder ?? 0),
      );
    });
  }

  return (
    <div>
      {/* Back link */}
      <div className="mb-5">
        <Link
          href="/dashboard/diario"
          className="group inline-flex items-center gap-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-burgundy transition-colors"
        >
          <span className="font-cormorant text-[16px] leading-none -mt-px transition-transform group-hover:-translate-x-1">←</span>
          Volver al Diario
        </Link>
      </div>

      {/* "Respondiendo a @handle" — si este OD es una respuesta */}
      {parentContext && (
        <Link
          href={`/dashboard/diario/obiter/${parentContext.id}`}
          className="group block mb-3 rounded-[4px] border border-gz-rule bg-white px-4 py-3 transition-all hover:border-gz-gold/50 hover:bg-gz-cream-dark/30 cursor-pointer"
        >
          <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1 flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-gz-burgundy">
              <path
                d="M9 14L4 9l5-5M4 9h11a4 4 0 014 4v6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Respondiendo a{" "}
            <span className="font-semibold text-gz-burgundy">
              @{(parentContext.user.firstName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")}
            </span>
            <span className="text-gz-ink-light/60 ml-auto group-hover:text-gz-gold transition-colors">
              Ver hilo →
            </span>
          </p>
          <p className="font-cormorant italic text-[14px] text-gz-ink-mid leading-snug line-clamp-2">
            {parentContext.content}
          </p>
        </Link>
      )}

      {/* Thread view or single card */}
      {isThread ? (
        <ObiterThreadView
          threadObiters={threadParts}
          currentUserId={currentUserId}
          userFirstName={currentUserFirstName}
          userAvatarUrl={currentUserAvatarUrl}
          onApoyar={handleApoyar}
          onGuardar={handleGuardar}
          onComuniquese={handleComuniquese}
          onCitar={handleCitar}
          onPublishedNewPart={handlePublishedNewPart}
        />
      ) : (
        <ObiterCard
          obiter={obiter}
          currentUserId={currentUserId}
          onApoyar={handleApoyar}
          onGuardar={handleGuardar}
          onComuniquese={handleComuniquese}
          onCitar={handleCitar}
        />
      )}

      {/* Si es OD propio standalone (no thread), ofrecer iniciar hilo */}
      {!isThread && currentUserId === obiter.userId && currentUserId && (
        <StartThreadCallout
          obiter={obiter}
          currentUserId={currentUserId}
          currentUserFirstName={currentUserFirstName}
          currentUserAvatarUrl={currentUserAvatarUrl ?? null}
          onPublishedNewPart={handlePublishedNewPart}
        />
      )}

      {/* ═══ RESPUESTAS — sección inline ═══════════════════════ */}
      <RepliesSection
        ref={replyEditorRef}
        rootObiter={obiter}
        replies={replies}
        colegaIds={colegaIds ?? []}
        currentUserId={currentUserId}
        currentUserFirstName={currentUserFirstName}
        currentUserAvatarUrl={currentUserAvatarUrl ?? null}
        commentsDisabled={!!commentsDisabled}
        onApoyar={handleApoyar}
        onGuardar={handleGuardar}
        onComuniquese={handleComuniquese}
        onCitar={handleCitar}
        onReplyPublished={(newReply, parentId) => {
          setReplies((prev) => [...prev, newReply]);
          // Si la respuesta es al OD raiz, incrementamos el replyCount
          // del padre. Si es a una respuesta hija, incrementamos en esa.
          if (parentId === obiter.id) {
            setObiter((prev) => ({
              ...prev,
              replyCount: (prev.replyCount ?? 0) + 1,
            }));
          } else {
            setReplies((prev) =>
              prev.map((r) =>
                r.id === parentId
                  ? { ...r, replyCount: (r.replyCount ?? 0) + 1 }
                  : r,
              ),
            );
          }
        }}
      />

      {/* Citation chain */}
      <ObiterCiteChain
        originalObiter={obiter}
        citations={citations}
        currentUserId={currentUserId}
        onApoyar={handleApoyar}
        onCitar={handleCitar}
      />
    </div>
  );
}

// ─── RepliesSection — Reddit-style nested + sort + reply-to-reply ──

type SortKey = "recientes" | "apoyadas" | "colegas" | "todas";

type ReplyNode = {
  obiter: ObiterData;
  children: ReplyNode[];
};

type RepliesSectionProps = {
  rootObiter: ObiterData;
  replies: ObiterData[];
  colegaIds: string[];
  currentUserId: string | null;
  currentUserFirstName?: string;
  currentUserAvatarUrl?: string | null;
  commentsDisabled: boolean;
  onApoyar: (id: string) => void;
  onGuardar: (id: string) => void;
  onComuniquese: (id: string) => void;
  onCitar: (obiter: ObiterData) => void;
  // parentId puede ser el root o cualquier respuesta hija (reply-to-reply)
  onReplyPublished: (newReply: ObiterData, parentId: string) => void;
};

// Construye un mapa parentId → hijos[] y arma el bosque desde el root.
function buildReplyTree(
  replies: ObiterData[],
  rootId: string,
): ReplyNode[] {
  const byParent = new Map<string, ObiterData[]>();
  for (const r of replies) {
    const pid = r.parentObiterId ?? rootId;
    const arr = byParent.get(pid) ?? [];
    arr.push(r);
    byParent.set(pid, arr);
  }
  function build(parentId: string): ReplyNode[] {
    const children = byParent.get(parentId) ?? [];
    return children.map((c) => ({
      obiter: c,
      children: build(c.id),
    }));
  }
  return build(rootId);
}

const RepliesSection = forwardRef<HTMLDivElement, RepliesSectionProps>(
  function RepliesSection(
    {
      rootObiter,
      replies,
      colegaIds,
      currentUserId,
      currentUserFirstName,
      currentUserAvatarUrl,
      commentsDisabled,
      onApoyar,
      onGuardar,
      onComuniquese,
      onCitar,
      onReplyPublished,
    },
    ref,
  ) {
    const [sort, setSort] = useState<SortKey>("recientes");
    const replyCount = replies.length;
    const colegaSet = new Set(colegaIds);
    const handle = (rootObiter.user.firstName ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // Construye el árbol y ordena las raíces (top-level) según el sort.
    const tree = buildReplyTree(replies, rootObiter.id);

    const sortedTopLevel = [...tree].sort((a, b) => {
      switch (sort) {
        case "apoyadas":
          return b.obiter.apoyosCount - a.obiter.apoyosCount;
        case "recientes":
          return (
            new Date(b.obiter.createdAt).getTime() -
            new Date(a.obiter.createdAt).getTime()
          );
        case "colegas": {
          // Colegas primero, luego cronológico
          const aIsColega = colegaSet.has(a.obiter.userId) ? 0 : 1;
          const bIsColega = colegaSet.has(b.obiter.userId) ? 0 : 1;
          if (aIsColega !== bIsColega) return aIsColega - bIsColega;
          return (
            new Date(a.obiter.createdAt).getTime() -
            new Date(b.obiter.createdAt).getTime()
          );
        }
        case "todas":
        default:
          return (
            new Date(a.obiter.createdAt).getTime() -
            new Date(b.obiter.createdAt).getTime()
          );
      }
    });

    return (
      <section ref={ref} id="reply" className="mt-8 scroll-mt-24">
        {/* Header editorial + sort */}
        <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-gz-ink/85 pb-2 flex-wrap">
          <div>
            <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-burgundy mb-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
              Conversación
            </p>
            <h2 className="font-cormorant text-[26px] sm:text-[30px] font-bold text-gz-ink leading-none">
              {replyCount === 0 ? (
                <>Sin respuestas aún</>
              ) : (
                <>
                  {replyCount} {replyCount === 1 ? "respuesta" : "respuestas"}
                </>
              )}
            </h2>
          </div>

          {/* Sort toggle — pill editorial */}
          {replyCount > 1 && (
            <div className="inline-flex rounded-full border border-gz-rule overflow-hidden bg-white">
              {([
                ["recientes", "Recientes"],
                ["apoyadas", "Apoyadas"],
                ["colegas", "Colegas"],
                ["todas", "Todas"],
              ] as [SortKey, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={`font-ibm-mono text-[10px] uppercase tracking-[1.5px] px-3 py-1.5 transition-all duration-200 cursor-pointer ${
                    sort === key
                      ? "bg-gz-navy text-white"
                      : "text-gz-ink-mid hover:bg-gz-cream-dark/60 hover:text-gz-ink"
                  }`}
                  disabled={key === "colegas" && colegaIds.length === 0}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Editor principal — responder al OD raíz */}
        {currentUserId && currentUserFirstName && !commentsDisabled && (
          <div className="mb-5 rounded-[4px] border border-gz-rule bg-white overflow-hidden">
            <div className="px-4 pt-3 pb-1 border-b border-gz-rule/60">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-gz-burgundy">
                  <path
                    d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Respondiendo a <span className="font-semibold text-gz-ink">@{handle}</span>
              </p>
            </div>
            <ObiterEditor
              userId={currentUserId}
              userFirstName={currentUserFirstName}
              userAvatarUrl={currentUserAvatarUrl ?? null}
              onPublished={(newReply) => onReplyPublished(newReply, rootObiter.id)}
              parentObiterId={rootObiter.id}
            />
          </div>
        )}

        {/* Banner si comentarios deshabilitados */}
        {commentsDisabled && (
          <div className="mb-4 rounded-[4px] border border-gz-burgundy/30 bg-gz-burgundy/[0.04] px-4 py-3">
            <p className="font-cormorant italic text-[15px] text-gz-burgundy">
              El autor desactivó las respuestas en este Obiter.
            </p>
          </div>
        )}

        {/* Login CTA */}
        {!currentUserId && (
          <div className="mb-4 rounded-[4px] border border-gz-rule bg-white px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="font-cormorant italic text-[15px] text-gz-ink-mid">
              Iniciá sesión para responder a este Obiter.
            </p>
            <Link
              href="/login"
              className="rounded-full bg-gz-navy px-4 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors cursor-pointer"
            >
              Entrar
            </Link>
          </div>
        )}

        {/* Lista de respuestas — árbol nested */}
        {tree.length > 0 ? (
          <div className="rounded-[4px] border border-gz-rule bg-white overflow-hidden">
            {sortedTopLevel.map((node, idx) => (
              <ReplyNodeView
                key={node.obiter.id}
                node={node}
                depth={0}
                isLast={idx === sortedTopLevel.length - 1}
                isColega={colegaSet.has(node.obiter.userId)}
                colegaSet={colegaSet}
                currentUserId={currentUserId}
                currentUserFirstName={currentUserFirstName}
                currentUserAvatarUrl={currentUserAvatarUrl ?? null}
                onApoyar={onApoyar}
                onGuardar={onGuardar}
                onComuniquese={onComuniquese}
                onCitar={onCitar}
                onReplyPublished={onReplyPublished}
              />
            ))}
          </div>
        ) : (
          currentUserId && !commentsDisabled && (
            <p className="font-cormorant italic text-[15px] text-gz-ink-light text-center py-6">
              Sé el primero en responder.
            </p>
          )
        )}
      </section>
    );
  },
);

// ─── ReplyNodeView — render recursivo de una rama del árbol ────

const MAX_VISUAL_DEPTH = 5; // a partir de aquí se aplana
const INDENT_PX = 20;

type ReplyNodeViewProps = {
  node: ReplyNode;
  depth: number;
  isLast: boolean;
  isColega: boolean;
  colegaSet: Set<string>;
  currentUserId: string | null;
  currentUserFirstName?: string;
  currentUserAvatarUrl?: string | null;
  onApoyar: (id: string) => void;
  onGuardar: (id: string) => void;
  onComuniquese: (id: string) => void;
  onCitar: (obiter: ObiterData) => void;
  onReplyPublished: (newReply: ObiterData, parentId: string) => void;
};

function ReplyNodeView({
  node,
  depth,
  isColega,
  colegaSet,
  currentUserId,
  currentUserFirstName,
  currentUserAvatarUrl,
  onApoyar,
  onGuardar,
  onComuniquese,
  onCitar,
  onReplyPublished,
}: ReplyNodeViewProps) {
  const [composing, setComposing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
  const indent = depth > 0 ? visualDepth * INDENT_PX : 0;

  // Cuando publicamos respuesta a esta rama, cerramos el editor.
  function handleReplyPublished(newReply: ObiterData) {
    onReplyPublished(newReply, node.obiter.id);
    setComposing(false);
  }

  return (
    <div
      className="relative border-t border-gz-rule first:border-t-0"
      style={{ paddingLeft: indent ? `${indent}px` : undefined }}
    >
      {/* Línea vertical guía cuando está nested (estilo Reddit) */}
      {depth > 0 && (
        <span
          className={`absolute left-[${indent - 12}px] top-0 bottom-0 w-px ${
            isColega ? "bg-gz-burgundy/30" : "bg-gz-rule"
          }`}
          style={{
            left: `${Math.max(0, indent - 12)}px`,
          }}
          aria-hidden
        />
      )}

      {/* Banner sutil "de tu colega" */}
      {isColega && depth === 0 && (
        <div className="px-4 sm:px-5 pt-2 -mb-1">
          <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-burgundy font-semibold">
            ✦ De tu colega
          </span>
        </div>
      )}

      {/* La card */}
      <ObiterCard
        obiter={node.obiter}
        currentUserId={currentUserId}
        onApoyar={onApoyar}
        onGuardar={onGuardar}
        onComuniquese={onComuniquese}
        onCitar={onCitar}
        onResponder={() => {
          // Reply inline — abre composer aquí mismo
          setComposing((v) => !v);
        }}
      />

      {/* Toggle "ocultar hilo" si tiene hijos */}
      {node.children.length > 0 && (
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="ml-12 mb-2 -mt-2 inline-flex items-center gap-1 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer"
        >
          {collapsed ? (
            <>+ Mostrar {node.children.length} {node.children.length === 1 ? "respuesta" : "respuestas"}</>
          ) : (
            <>− Ocultar hilo</>
          )}
        </button>
      )}

      {/* Editor inline reply-to-reply */}
      {composing && currentUserId && currentUserFirstName && (
        <div className="ml-12 mb-3 rounded-[4px] border border-gz-rule bg-white overflow-hidden">
          <div className="px-3 pt-2 pb-1 border-b border-gz-rule/60 flex items-center justify-between">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">
              Respondiendo a{" "}
              <span className="font-semibold text-gz-ink">
                @{(node.obiter.user.firstName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")}
              </span>
            </p>
            <button
              onClick={() => setComposing(false)}
              className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer"
              aria-label="Cancelar"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ObiterEditor
            userId={currentUserId}
            userFirstName={currentUserFirstName}
            userAvatarUrl={currentUserAvatarUrl ?? null}
            onPublished={handleReplyPublished}
            parentObiterId={node.obiter.id}
          />
        </div>
      )}

      {/* Hijos recursivos (si no está collapsed) */}
      {!collapsed &&
        node.children.map((child, idx) => (
          <ReplyNodeView
            key={child.obiter.id}
            node={child}
            depth={depth + 1}
            isLast={idx === node.children.length - 1}
            isColega={colegaSet.has(child.obiter.userId)}
            colegaSet={colegaSet}
            currentUserId={currentUserId}
            currentUserFirstName={currentUserFirstName}
            currentUserAvatarUrl={currentUserAvatarUrl}
            onApoyar={onApoyar}
            onGuardar={onGuardar}
            onComuniquese={onComuniquese}
            onCitar={onCitar}
            onReplyPublished={onReplyPublished}
          />
        ))}
    </div>
  );
}

// ─── Start Thread Callout (para OD propio sin hilo) ─────────

function StartThreadCallout({
  obiter,
  currentUserId,
  currentUserFirstName,
  currentUserAvatarUrl,
  onPublishedNewPart,
}: {
  obiter: ObiterData;
  currentUserId: string;
  currentUserFirstName?: string;
  currentUserAvatarUrl: string | null;
  onPublishedNewPart: (o: ObiterData) => void;
}) {
  const [composing, setComposing] = useState(false);
  const threadId = obiter.id;

  return (
    <div className="mt-3 rounded-[6px] border border-gz-ink/15 bg-gradient-to-br from-white via-white to-gz-cream-dark/30 overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_4px_18px_-12px_rgba(15,15,15,0.18)]">
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-gold to-gz-burgundy" />
      <div className="px-5 py-4">
        {!composing ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-burgundy mb-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
                Convertí esto en un hilo
              </p>
              <p className="font-cormorant italic text-[15px] text-gz-ink-mid leading-snug">
                Continuá el razonamiento con otra parte. Hasta 10 partes en total.
              </p>
            </div>
            <button
              onClick={() => setComposing(true)}
              className="group inline-flex items-center gap-2 rounded-full border-2 border-dashed border-gz-gold/60 bg-white px-4 py-2 font-archivo text-[13px] font-semibold text-gz-gold hover:border-gz-gold hover:bg-gz-gold hover:text-white hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span className="font-cormorant text-[20px] leading-none -mt-px transition-transform duration-200 group-hover:rotate-90">
                +
              </span>
              Continuar
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-burgundy flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
                Parte 2 del hilo
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
              userFirstName={currentUserFirstName ?? "Tú"}
              userAvatarUrl={currentUserAvatarUrl}
              threadId={threadId}
              threadOrder={2}
              onPublished={(newObiter) => {
                onPublishedNewPart(newObiter);
                setComposing(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
