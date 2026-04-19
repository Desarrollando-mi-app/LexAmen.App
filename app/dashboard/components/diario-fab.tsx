"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

// ─── Inline mini-editor for quick OD publishing ──────────

export function DiarioFab() {
  const pathname = usePathname();
  const isInDiario = pathname.startsWith("/dashboard/diario");

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hide on diario routes
  if (isInDiario) return null;

  const words = content.trim()
    ? content.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const isOverLimit = words > 200;

  function handleOpen() {
    setOpen(true);
    setTimeout(() => textareaRef.current?.focus(), 150);
  }

  function handleClose() {
    setOpen(false);
    setContent("");
  }

  async function handlePublish() {
    if (!content.trim() || isOverLimit || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/obiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: content.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Error al publicar");
        setSending(false);
        return;
      }

      toast.success("Obiter publicado");
      setContent("");
      setOpen(false);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* ── Floating editor panel ──────────────────────── */}
      {open && (
        <div
          className="hidden lg:block fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] rounded-[4px] border border-gz-gold shadow-xl"
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gz-rule px-4 py-2.5">
            <span className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
              Nuevo Obiter Dictum
            </span>
            <button
              onClick={handleClose}
              className="text-gz-ink-light transition-colors hover:text-gz-ink"
              aria-label="Cerrar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="M6 6 18 18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Comparte tu reflexión jurídica…"
              disabled={sending}
              className="w-full resize-none border-none font-cormorant text-[16px] leading-[1.7] text-gz-ink placeholder:text-gz-ink-light/40 focus:outline-none focus:ring-0"
              style={{ minHeight: "100px", backgroundColor: "transparent" }}
            />

            {/* Word count */}
            {content.trim() && (
              <div className="mb-2 text-right">
                <span
                  className={`font-ibm-mono text-[10px] ${
                    isOverLimit
                      ? "font-bold text-gz-burgundy"
                      : words >= 180
                        ? "text-gz-gold"
                        : "text-gz-ink-light"
                  }`}
                >
                  {words}/200 palabras
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gz-rule">
              <button
                onClick={handleClose}
                className="font-archivo text-[12px] text-gz-ink-mid transition-colors hover:text-gz-ink"
              >
                Cancelar
              </button>
              <button
                onClick={handlePublish}
                disabled={sending || !content.trim() || isOverLimit}
                className="rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[12px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Publicando…
                  </span>
                ) : (
                  "Publicar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pill button ────────────────────────────────── */}
      <button
        onClick={open ? handleClose : handleOpen}
        className="hidden lg:flex fixed bottom-6 right-6 z-50 items-center gap-2 rounded-full bg-gold px-4 py-3 text-sm font-semibold text-white shadow-xl transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:bg-gold/90 active:scale-100"
      >
        <span>{open ? "✕" : "Obiter Dictum"}</span>
      </button>
    </>
  );
}
