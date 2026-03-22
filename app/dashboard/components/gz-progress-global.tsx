"use client";

import { useState, useEffect } from "react";
import { InfoTooltip } from "@/app/components/info-tooltip";
import { FEATURE_INFO } from "@/lib/feature-info";

interface LibroProgress {
  libro: string;
  label: string;
  titulosCubiertos: number;
  titulosTotales: number;
  porcentaje: number;
}

interface CodigoProgress {
  rama: string;
  label: string;
  titulosCubiertos: number;
  titulosTotales: number;
  porcentaje: number;
  libros: LibroProgress[];
}

interface ProgressData {
  global: {
    titulosCubiertos: number;
    titulosTotales: number;
    porcentaje: number;
  };
  porCodigo: CodigoProgress[];
}

const RAMA_COLORS: Record<string, string> = {
  DERECHO_CIVIL: "bg-gz-gold",
  DERECHO_PROCESAL_CIVIL: "bg-gz-navy",
  DERECHO_ORGANICO: "bg-gz-burgundy",
};

const RAMA_SHORT: Record<string, string> = {
  DERECHO_CIVIL: "Código Civil",
  DERECHO_PROCESAL_CIVIL: "Código Proc. Civil",
  DERECHO_ORGANICO: "Cód. Org. Tribunales",
};

export function GzProgressGlobal() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progreso-global")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return null; // Don't show skeleton — just hide until loaded
  }

  // Don't show if no progress at all
  if (data.global.titulosCubiertos === 0) return null;

  return (
    <div className="mx-auto max-w-[1280px] px-4 lg:px-10 mt-4">
      <div className="rounded-[4px] border border-gz-rule bg-white p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-baseline justify-between">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light flex items-center gap-2">
            Tu progreso
            <InfoTooltip title={FEATURE_INFO.progreso.title} description={FEATURE_INFO.progreso.description} />
          </p>
          <span className="font-cormorant text-[28px] font-bold text-gz-gold">
            {data.global.porcentaje}%
          </span>
        </div>

        {/* Global bar */}
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-gz-cream-dark">
          <div
            className="h-full rounded-full bg-gz-gold transition-all duration-700"
            style={{ width: `${data.global.porcentaje}%` }}
          />
        </div>
        <p className="mt-1.5 font-ibm-mono text-[11px] text-gz-ink-light">
          {data.global.titulosCubiertos} de {data.global.titulosTotales} títulos
          cubiertos
        </p>

        {/* Per-código bars */}
        <div className="mt-5 space-y-3">
          {data.porCodigo.map((codigo) => (
            <div key={codigo.rama}>
              <div className="flex items-center justify-between">
                <span className="font-archivo text-[13px] font-medium text-gz-ink">
                  {RAMA_SHORT[codigo.rama] ?? codigo.label}
                </span>
                <span className="font-ibm-mono text-[11px] text-gz-ink-mid">
                  {codigo.porcentaje}% · {codigo.titulosCubiertos}/
                  {codigo.titulosTotales}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-sm bg-gz-cream-dark">
                <div
                  className={`h-full rounded-sm transition-all duration-700 ${
                    RAMA_COLORS[codigo.rama] ?? "bg-gz-gold"
                  }`}
                  style={{ width: `${codigo.porcentaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Expand/collapse for libro detail */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 font-archivo text-[12px] font-medium text-gz-gold hover:text-gz-gold/80 transition-colors"
        >
          {expanded ? "Ocultar desglose ↑" : "Ver desglose por libro →"}
        </button>

        {expanded && (
          <div className="mt-4 space-y-5 border-t border-gz-rule pt-4">
            {data.porCodigo.map((codigo) => (
              <div key={codigo.rama}>
                <p className="font-archivo text-[12px] font-semibold text-gz-ink mb-2">
                  {codigo.label}
                </p>
                <div className="space-y-2">
                  {codigo.libros.map((libro) => (
                    <div key={libro.libro}>
                      <div className="flex items-center justify-between">
                        <span className="font-archivo text-[11px] text-gz-ink-mid truncate max-w-[60%]">
                          {libro.label.replace(/\(Arts\.\s[\d–]+\)/g, "").trim()}
                        </span>
                        <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                          {libro.porcentaje}% · {libro.titulosCubiertos}/
                          {libro.titulosTotales}
                        </span>
                      </div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-gz-cream-dark">
                        <div
                          className={`h-full rounded-sm ${
                            RAMA_COLORS[codigo.rama] ?? "bg-gz-gold"
                          }`}
                          style={{ width: `${libro.porcentaje}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
