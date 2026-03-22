"use client";

import { useState, useRef, useEffect } from "react";

interface InfoTooltipProps {
  title: string;
  description: string;
}

export function InfoTooltip({ title, description }: InfoTooltipProps) {
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

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label={`Información: ${title}`}
        className="flex h-[20px] w-[20px] items-center justify-center rounded-full border border-gz-rule text-[11px] font-semibold text-gz-ink-light transition-colors hover:border-gz-gold hover:text-gz-gold focus:outline-none"
      >
        i
      </button>
      {open && (
        <>
          {/* Mobile overlay */}
          <div className="fixed inset-0 z-40 bg-black/10 sm:hidden" />
          {/* Popover */}
          <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 sm:absolute sm:left-1/2 sm:top-full sm:right-auto sm:-translate-x-1/2 sm:translate-y-0 sm:mt-2">
            <div className="rounded-lg border border-gz-rule bg-white p-4 shadow-sm sm:w-[320px]">
              <p className="font-cormorant text-[15px] font-bold text-gz-ink">
                {title}
              </p>
              <p className="mt-1.5 font-archivo text-[13px] leading-relaxed text-gz-ink-mid">
                {description}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
