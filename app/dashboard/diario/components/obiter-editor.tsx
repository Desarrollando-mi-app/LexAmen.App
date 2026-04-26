"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ObiterData } from "../types/obiter";
import { MATERIAS, TIPOS } from "../types/obiter";

// ─── Types ──────────────────────────────────────────────────

type CitingAnalisis = {
  id: string;
  titulo: string;
  tribunal: string;
};

type CitingEnsayo = {
  id: string;
  titulo: string;
  tipo: string;
};

type ObiterEditorProps = {
  userId: string;
  userFirstName: string;
  userAvatarUrl: string | null;
  onPublished: (obiter: ObiterData) => void;
  citingObiter?: ObiterData | null;
  citingAnalisis?: CitingAnalisis | null;
  citingEnsayo?: CitingEnsayo | null;
  threadId?: string;
  threadOrder?: number;
  onCancelCite?: () => void;
  initialText?: string;
};

type EditorState = "collapsed" | "expanded" | "sending" | "published";

// ─── Component ──────────────────────────────────────────────

export function ObiterEditor(props: ObiterEditorProps) {
  const {
    userFirstName,
    userAvatarUrl,
    onPublished,
    citingObiter,
    citingAnalisis,
    citingEnsayo,
    threadId,
    threadOrder,
    onCancelCite,
    initialText,
  } = props;
  const [state, setState] = useState<EditorState>(initialText ? "expanded" : "collapsed");
  const [content, setContent] = useState(initialText ?? "");
  const [materia, setMateria] = useState("");
  const [tipo, setTipo] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPremium] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [publishedObiter, setPublishedObiter] = useState<ObiterData | null>(
    null
  );
  const [continueThread, setContinueThread] = useState(false);
  const [threadPartNumber, setThreadPartNumber] = useState(threadOrder ?? 1);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(threadId);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Word count
  const words = content.trim()
    ? content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const isOverLimit = words > 200;
  const isNearLimit = words >= 180 && words <= 200;

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "80px";
      ta.style.height = Math.max(80, ta.scrollHeight) + "px";
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [content, resizeTextarea]);

  // Auto-expand when citing
  useEffect(() => {
    if ((citingObiter || citingAnalisis || citingEnsayo) && state === "collapsed") {
      setState("expanded");
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [citingObiter, citingAnalisis, citingEnsayo, state]);

  // Fetch remaining on expand
  useEffect(() => {
    if (state === "expanded" && remaining === null) {
      // Check remaining via a lightweight mechanism
      // We infer from canPublish — do a test POST with empty to see
      // Or simply: we'll show remaining after first publish attempt
      // For now, optimistically fetch remaining count
      fetch("/api/obiter?feed=recientes&limit=0", { credentials: "include" })
        .then(() => {
          // We can't easily get remaining from GET.
          // Instead, call a HEAD or accept that remaining shows after error.
          // Let's track remaining locally from publish responses.
        })
        .catch(() => {
          // Silent
        });
    }
  }, [state, remaining]);

  // ─── Handlers ─────────────────────────────────────────────

  function handleExpand() {
    setState("expanded");
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  // Acepta opcionalmente un override `andContinueThread` para evitar la
  // race condition con el estado `continueThread` (cuando se llama desde
  // el botón "+" antes de que React haya commiteado setContinueThread).
  async function handlePublish(opts?: { andContinueThread?: boolean }) {
    if (!content.trim() || isOverLimit) return;

    const willContinue = opts?.andContinueThread ?? continueThread;

    setState("sending");
    setError(null);

    try {
      const body: Record<string, unknown> = {
        content: content.trim(),
      };
      if (materia) body.materia = materia;
      if (tipo) body.tipo = tipo;
      if (citingObiter) body.citedObiterId = citingObiter.id;
      if (citingAnalisis) body.citedAnalisisId = citingAnalisis.id;
      if (citingEnsayo) body.citedEnsayoId = citingEnsayo.id;
      if (activeThreadId && threadPartNumber > 1) {
        body.threadId = activeThreadId;
        body.threadOrder = threadPartNumber;
      } else if (threadId && threadOrder) {
        body.threadId = threadId;
        body.threadOrder = threadOrder;
      }

      const res = await fetch("/api/obiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setRemaining(0);
          setError(
            data.error ??
              "Has alcanzado tu límite de 5 publicaciones diarias."
          );
        } else {
          setError(data.error ?? "Error al publicar");
        }
        setState("expanded");
        return;
      }

      // Success
      const newObiter = data.obiter as ObiterData;
      setPublishedObiter(newObiter);
      onPublished(newObiter);

      // Decrement remaining
      if (remaining !== null && remaining > 0) {
        setRemaining(remaining - 1);
      }

      // If "continue thread" is checked, reset editor for next part
      if (willContinue) {
        const newThreadId = activeThreadId ?? newObiter.threadId ?? newObiter.id;
        setActiveThreadId(newThreadId);
        setThreadPartNumber((prev) => prev + 1);
        setContinueThread(false); // reset para próximas publicaciones
        setContent("");
        setError(null);
        setState("expanded");
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else {
        setState("published");
      }
    } catch {
      setError("Error de conexión");
      setState("expanded");
    }
  }

  function handleReset() {
    setContent("");
    setMateria("");
    setTipo("");
    setShowDetails(false);
    setError(null);
    setPublishedObiter(null);
    setState("collapsed");
    onCancelCite?.();
  }

  function handlePublishAnother() {
    setContent("");
    setMateria("");
    setTipo("");
    setShowDetails(false);
    setError(null);
    setPublishedObiter(null);
    setState("expanded");
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  // ─── Avatar ───────────────────────────────────────────────

  const avatarEl = userAvatarUrl ? (
    <img
      src={userAvatarUrl}
      alt=""
      className="h-8 w-8 rounded-full border border-gz-gold object-cover"
    />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gz-navy font-archivo text-[11px] font-semibold text-gz-gold-bright">
      {userFirstName[0]}
    </div>
  );

  // ─── Collapsed state ─────────────────────────────────────

  if (state === "collapsed") {
    return (
      <div
        onClick={handleExpand}
        className="mb-6 flex cursor-text items-center gap-3 rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40"
      >
        {avatarEl}
        <p className="font-cormorant text-[16px] italic text-gz-ink-light">
          ¿Qué estás pensando, jurídicamente?
        </p>
      </div>
    );
  }

  // ─── Published state ──────────────────────────────────────

  if (state === "published") {
    return (
      <div className="mb-6 rounded-[4px] border border-gz-rule bg-white py-6 text-center">
        <p className="mb-3 font-archivo text-[14px] font-semibold text-gz-sage">
          ✅ Obiter publicado
        </p>
        <button
          onClick={handlePublishAnother}
          className="font-archivo text-[13px] text-gz-ink-mid transition-colors hover:text-gz-ink"
        >
          Publicar otro
        </button>
      </div>
    );
  }

  // ─── Expanded / Sending state ─────────────────────────────

  return (
    <div
      key={`editor-${threadPartNumber}`}
      className="mb-6 rounded-[4px] border border-gz-gold bg-white p-4 shadow-sm animate-gz-slide-up"
    >
      {/* Citing preview — Obiter */}
      {citingObiter && (
        <div
          className="mb-3 flex items-start justify-between rounded-[3px] border border-gz-rule p-3"
          style={{ backgroundColor: "var(--gz-cream-dark)", opacity: 0.85 }}
        >
          <div className="min-w-0 flex-1">
            <p className="mb-1 font-ibm-mono text-[10px] text-gz-ink-light">
              Citando a @
              {citingObiter.user.firstName?.toLowerCase()}
            </p>
            <p className="line-clamp-2 font-cormorant text-[14px] text-gz-ink-mid">
              &ldquo;{citingObiter.content}&rdquo;
            </p>
          </div>
          <button
            onClick={onCancelCite}
            className="ml-2 flex-shrink-0 text-gz-ink-light transition-colors hover:text-gz-ink"
          >
            ✕
          </button>
        </div>
      )}

      {/* Citing preview — Análisis */}
      {citingAnalisis && (
        <div
          className="mb-3 flex items-start justify-between rounded-[3px] border border-gz-burgundy/30 p-3"
          style={{ backgroundColor: "color-mix(in srgb, var(--gz-burgundy) 5%, transparent)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-burgundy">
              Citando Análisis de Sentencia
            </p>
            <p className="font-cormorant text-[14px] font-bold text-gz-ink">
              {citingAnalisis.titulo}
            </p>
            <p className="mt-0.5 font-ibm-mono text-[10px] text-gz-ink-light">
              {citingAnalisis.tribunal}
            </p>
          </div>
          <button
            onClick={onCancelCite}
            className="ml-2 flex-shrink-0 text-gz-ink-light transition-colors hover:text-gz-ink"
          >
            ✕
          </button>
        </div>
      )}

      {/* Citing preview — Ensayo */}
      {citingEnsayo && (
        <div
          className="mb-3 flex items-start justify-between rounded-[3px] border border-gz-sage/30 p-3"
          style={{ backgroundColor: "color-mix(in srgb, var(--gz-sage) 5%, transparent)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-sage">
              Citando Ensayo
            </p>
            <p className="font-cormorant text-[14px] font-bold text-gz-ink">
              {citingEnsayo.titulo}
            </p>
          </div>
          <button
            onClick={onCancelCite}
            className="ml-2 flex-shrink-0 text-gz-ink-light transition-colors hover:text-gz-ink"
          >
            ✕
          </button>
        </div>
      )}

      {/* Thread indicator */}
      {(threadPartNumber > 1 || (threadId && threadOrder)) && (
        <div className="mb-3 flex items-center gap-1.5 font-ibm-mono text-[10px] text-gz-gold">
          <span>🧵</span>
          <span>Parte {threadPartNumber} del hilo</span>
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Comparte tu reflexión jurídica..."
        disabled={state === "sending"}
        className="w-full resize-none border-none font-cormorant text-[16px] leading-[1.7] text-gz-ink placeholder:text-gz-ink-light/40 focus:outline-none focus:ring-0 lg:text-[17px]"
        style={{
          minHeight: "80px",
          backgroundColor: "transparent",
        }}
      />

      {/* Details toggle + selects */}
      {!showDetails ? (
        <button
          onClick={() => setShowDetails(true)}
          className="mb-2 font-archivo text-[11px] text-gz-ink-light transition-colors hover:text-gz-gold"
        >
          + Agregar detalles
        </button>
      ) : (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
            className="rounded-[3px] border border-gz-rule bg-white px-3 py-1.5 font-archivo text-[12px] text-gz-ink-mid focus:border-gz-gold focus:outline-none"
          >
            <option value="">Materia</option>
            {MATERIAS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="rounded-[3px] border border-gz-rule bg-white px-3 py-1.5 font-archivo text-[12px] text-gz-ink-mid focus:border-gz-gold focus:outline-none"
          >
            <option value="">Tipo</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Word counter */}
          <span
            className={`ml-auto font-ibm-mono text-[10px] ${
              isOverLimit
                ? "font-bold text-gz-burgundy"
                : isNearLimit
                  ? "text-gz-gold"
                  : "text-gz-ink-light"
            }`}
          >
            {words}/200 palabras
          </span>
        </div>
      )}

      {/* Word counter (if details not shown) */}
      {!showDetails && content.trim() && (
        <div className="mb-2 text-right">
          <span
            className={`font-ibm-mono text-[10px] ${
              isOverLimit
                ? "font-bold text-gz-burgundy"
                : isNearLimit
                  ? "text-gz-gold"
                  : "text-gz-ink-light"
            }`}
          >
            {words}/200 palabras
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mb-2 rounded-[3px] border border-gz-burgundy/20 bg-gz-burgundy/[0.06] p-2 font-archivo text-[12px] text-gz-burgundy">
          {error}
        </p>
      )}

      {/* Daily limit indicator */}
      {remaining !== null && !isPremium && (
        <p
          className={`mb-2 font-ibm-mono text-[10px] ${
            remaining <= 1
              ? remaining === 0
                ? "font-semibold text-gz-burgundy"
                : "text-gz-burgundy"
              : "text-gz-ink-light"
          }`}
        >
          {remaining === 0
            ? "Has alcanzado tu límite diario"
            : `${remaining}/5 publicaciones restantes hoy`}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="font-archivo text-[13px] text-gz-ink-mid transition-colors hover:text-gz-ink"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePublish()}
            disabled={
              state === "sending" ||
              !content.trim() ||
              isOverLimit ||
              remaining === 0
            }
            className="rounded-[3px] bg-gz-navy px-5 py-2 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:cursor-not-allowed disabled:opacity-40"
          >
            {state === "sending" ? (
              <span className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Publicando…
              </span>
            ) : (
              "Publicar Obiter"
            )}
          </button>

          {/* "+" button: publish and continue thread */}
          <button
            onClick={() => handlePublish({ andContinueThread: true })}
            disabled={state === "sending" || !content.trim() || isOverLimit || remaining === 0}
            title="Publicar y continuar hilo"
            aria-label="Publicar y continuar hilo"
            className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-gz-gold bg-white text-[18px] font-bold text-gz-gold transition-all hover:bg-gz-gold hover:text-white hover:rotate-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="font-cormorant text-[20px] leading-none -mt-px transition-transform">
              +
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
