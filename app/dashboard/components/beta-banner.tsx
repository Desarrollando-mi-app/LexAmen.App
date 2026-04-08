"use client";

import { useState, useEffect } from "react";
import { BETA_BUG_REPORT_URL, BETA_BUG_REPORT_EMAIL } from "@/lib/config";

const STORAGE_KEY = "beta-banner-closed";

export function BetaBanner() {
  // Start hidden to avoid SSR/client flash; reveal after mount if not dismissed
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const closed = localStorage.getItem(STORAGE_KEY) === "true";
      if (!closed) setVisible(true);
    } catch {
      // localStorage unavailable (SSR/private mode) — show by default
      setVisible(true);
    }
  }, []);

  function handleClose() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // noop
    }
  }

  if (!mounted || !visible) return null;

  const bugReportHref =
    BETA_BUG_REPORT_URL ??
    `mailto:${BETA_BUG_REPORT_EMAIL}?subject=${encodeURIComponent(
      "[Studio IURIS Beta] Reporte de bug"
    )}&body=${encodeURIComponent(
      "Describe el bug:\n\nPasos para reproducirlo:\n1. \n2. \n3. \n\nComportamiento esperado:\n\nComportamiento actual:\n\nURL donde ocurrió:\n\nNavegador / dispositivo:\n"
    )}`;

  return (
    <div
      className="relative z-40 border-b border-gz-gold/30 bg-gz-gold/10 px-4 py-1.5 lg:px-10"
      role="region"
      aria-label="Versión beta"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-gold lg:text-[11px]">
          <span aria-hidden="true" className="shrink-0 text-[13px]">
            🧪
          </span>
          <span className="shrink-0 font-semibold">Versión Beta</span>
          <span className="hidden shrink-0 opacity-60 sm:inline">·</span>
          <span className="hidden min-w-0 truncate opacity-80 sm:inline">
            Tu feedback es importante
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <a
            href={bugReportHref}
            target={BETA_BUG_REPORT_URL ? "_blank" : undefined}
            rel={BETA_BUG_REPORT_URL ? "noopener noreferrer" : undefined}
            className="whitespace-nowrap font-ibm-mono text-[10px] font-semibold uppercase tracking-[1px] text-gz-gold underline decoration-gz-gold/40 underline-offset-2 transition-colors hover:text-gz-gold-bright hover:decoration-gz-gold lg:text-[11px]"
          >
            Reportar bug
          </a>
          <button
            onClick={handleClose}
            aria-label="Cerrar banner beta"
            title="Cerrar"
            className="flex h-5 w-5 items-center justify-center rounded-full text-gz-gold/70 transition-colors hover:bg-gz-gold/15 hover:text-gz-gold"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
