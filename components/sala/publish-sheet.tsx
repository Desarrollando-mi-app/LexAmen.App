"use client";

import { useEffect, useRef } from "react";

/**
 * Drawer V4 reutilizable para abrir formularios de publicación inline,
 * sin sacar al usuario de la página actual. Mismo lenguaje editorial que
 * Pasantías / Ofertas / Networking V4: cormorant title, ibm-mono eyebrow,
 * paleta cream/ink/gold, rounded-[3px], borders editoriales.
 *
 * Slide-in desde la derecha en desktop, full-screen sheet en mobile.
 * Cierra con Esc, click en backdrop o botón explícito. Atrapa el scroll
 * del body cuando está abierto.
 */
export function PublishSheet({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Foco en el panel para keyboard nav
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-sheet-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-gz-ink/45 backdrop-blur-[2px] cursor-pointer"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full sm:w-[560px] max-w-full h-full bg-gz-cream border-l border-gz-rule shadow-[-12px_0_40px_-12px_rgba(28,24,20,0.25)] flex flex-col outline-none animate-[publish-slide_220ms_ease-out]"
      >
        {/* Header */}
        <div className="border-b-2 border-gz-ink px-7 pt-5 pb-4 bg-gz-cream sticky top-0 z-[2]">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
                {eyebrow}
              </div>
              <h2
                id="publish-sheet-title"
                className="mt-1 font-cormorant font-semibold text-[34px] leading-[0.98] tracking-[-0.5px] text-gz-ink m-0"
              >
                <em className="font-medium text-gz-gold mr-1.5">¶</em>
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 font-cormorant italic text-[14.5px] text-gz-ink-mid leading-snug">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 w-9 h-9 rounded-[3px] border border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink transition flex items-center justify-center font-archivo text-[14px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-white">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes publish-slide {
          from {
            transform: translateX(40px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Pequeñas piezas reutilizables para los forms ─────────

export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-7 py-6 border-b border-gz-rule">
      <div className="font-ibm-mono text-[10px] tracking-[1.8px] uppercase text-gz-ink-mid">
        {title}
      </div>
      {hint && (
        <p className="mt-1 font-cormorant italic text-[13.5px] text-gz-ink-light leading-snug">
          {hint}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase text-gz-ink-light">
        {label}
        {required && <span className="text-gz-gold ml-1">*</span>}
      </span>
      {children}
      {error ? (
        <span className="font-archivo text-[11.5px] text-gz-burgundy mt-0.5">
          {error}
        </span>
      ) : hint ? (
        <span className="font-archivo text-[11px] text-gz-ink-light mt-0.5">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const baseInputClass =
  "w-full font-archivo text-[14px] text-gz-ink bg-white border border-gz-rule rounded-[3px] px-3 py-2.5 outline-none transition focus:border-gz-gold focus:shadow-[0_0_0_2px_rgba(196,156,82,0.12)]";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <input {...props} className={`${baseInputClass} ${props.className ?? ""}`} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={`${baseInputClass} min-h-[110px] resize-y leading-[1.55] ${props.className ?? ""}`}
    />
  );
}

export function Select({
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${baseInputClass} ${rest.className ?? ""}`}>
      {children}
    </select>
  );
}

export function Footer({
  onCancel,
  submitLabel,
  submitting,
  canSubmit = true,
}: {
  onCancel: () => void;
  submitLabel: string;
  submitting?: boolean;
  canSubmit?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-[2] bg-gz-cream border-t-2 border-gz-ink px-7 py-4 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="font-ibm-mono text-[10.5px] tracking-[1.8px] uppercase text-gz-ink-mid hover:text-gz-ink transition cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="px-5 py-2.5 bg-gz-ink text-gz-cream font-ibm-mono text-[10.5px] tracking-[1.8px] uppercase rounded-[3px] hover:bg-gz-gold hover:text-gz-ink transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {submitting ? "Publicando…" : submitLabel}
      </button>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mx-7 mt-5 border border-gz-burgundy/40 bg-gz-burgundy/[0.06] px-4 py-2.5 rounded-[3px]">
      <p className="font-archivo text-[12.5px] text-gz-burgundy m-0">
        {message}
      </p>
    </div>
  );
}
