"use client";

import { useState, useRef, useEffect } from "react";
import { ARTICULOS_CC } from "@/lib/codigo-civil-data";

type ObiterLegalRefProps = {
  article: number;
  code: string;
  originalText: string;
};

export function ObiterLegalRef({
  article,
  code,
  originalText,
}: ObiterLegalRefProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("above");
  const spanRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const articleText = ARTICULOS_CC[article];

  useEffect(() => {
    if (showTooltip && spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      // Si hay menos de 200px arriba, mostrar abajo
      setPosition(rect.top < 200 ? "below" : "above");
    }
  }, [showTooltip]);

  return (
    <span className="relative inline">
      <span
        ref={spanRef}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((v) => !v)}
        className="inline cursor-pointer rounded-sm bg-gz-gold/[0.06] px-1.5 py-0.5 font-ibm-mono text-[13px] text-gz-gold transition-colors hover:bg-gz-gold/[0.12]"
      >
        {originalText}
      </span>

      {showTooltip && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-[320px] max-w-[90vw] rounded-[3px] bg-gz-navy p-4 shadow-lg ${
            position === "above"
              ? "bottom-full left-1/2 mb-2 -translate-x-1/2"
              : "top-full left-1/2 mt-2 -translate-x-1/2"
          }`}
        >
          {/* Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 ${
              position === "above"
                ? "top-full border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gz-navy"
                : "bottom-full border-b-[6px] border-l-[6px] border-r-[6px] border-b-gz-navy border-l-transparent border-r-transparent"
            }`}
          />

          <p className="mb-2 font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold-bright">
            Artículo {article} · {code === "CC" ? "Código Civil" : code}
          </p>
          <p className="font-cormorant text-[14px] leading-relaxed text-white/90">
            {articleText ?? "Texto no disponible en la base de datos."}
          </p>
        </div>
      )}
    </span>
  );
}
