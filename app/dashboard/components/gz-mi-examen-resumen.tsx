"use client";

import Link from "next/link";

interface ExamenResumenProps {
  config: {
    universidad: string;
    sede: string | null;
    fechaExamen: string | null;
    progresoGlobal: number;
    temaDebil: string | null;
    temaDebilPorcentaje: number | null;
  } | null;
}

export function GzMiExamenResumen({ config }: ExamenResumenProps) {
  // Sin configuración — CTA destacado
  if (!config) {
    return (
      <Link
        href="/dashboard/progreso"
        className="group block relative bg-white border border-dashed border-gz-gold/40 rounded-[5px] overflow-hidden p-4 hover:border-gz-gold hover:bg-gz-gold/[0.04] transition-all"
      >
        <div className="absolute top-0 left-0 h-full w-[3px] bg-gz-gold/60 group-hover:bg-gz-gold transition-colors" />
        <div className="flex items-center gap-3 pl-2">
          <span className="font-cormorant text-[28px] leading-none text-gz-gold">⚖</span>
          <div className="flex-1 min-w-0">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-0.5">
              Plan personalizado
            </p>
            <p className="font-cormorant text-[18px] font-bold text-gz-ink leading-tight">
              Configura tu plan de estudio
            </p>
            <p className="font-archivo text-[12px] text-gz-ink-mid mt-0.5">
              Sube tu cedulario y obtén un plan adaptado a tu examen de grado.
            </p>
          </div>
          <span className="font-archivo text-[11px] font-semibold text-gz-gold shrink-0 group-hover:translate-x-1 transition-transform">
            Comenzar →
          </span>
        </div>
      </Link>
    );
  }

  const diasRestantes = config.fechaExamen
    ? Math.max(
        0,
        Math.ceil(
          (new Date(config.fechaExamen).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const urgencia =
    diasRestantes !== null && diasRestantes <= 30 ? "alta" :
    diasRestantes !== null && diasRestantes <= 90 ? "media" : "normal";
  const urgenciaColor =
    urgencia === "alta" ? "var(--gz-burgundy)" :
    urgencia === "media" ? "var(--gz-gold)" : "var(--gz-navy)";

  return (
    <Link
      href="/dashboard/progreso"
      className="group block relative bg-white border border-gz-ink/15 rounded-[5px] overflow-hidden p-4 shadow-[0_1px_0_rgba(15,15,15,0.04),0_4px_18px_-12px_rgba(15,15,15,0.18)] hover:shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_24px_-14px_rgba(15,15,15,0.30)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <div
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{ backgroundColor: urgenciaColor }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center pl-2">
        <div className="min-w-0">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-0.5 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: urgenciaColor }} />
            Mi Examen · {config.universidad}
            {config.sede ? ` · ${config.sede}` : ""}
          </p>
          <div className="flex items-baseline gap-3 mb-2">
            <p className="font-cormorant text-[24px] font-bold text-gz-ink leading-none">
              {Math.round(config.progresoGlobal)}%
              <span className="font-archivo text-[12px] font-normal text-gz-ink-light ml-1.5">
                de progreso
              </span>
            </p>
            {diasRestantes !== null && (
              <span
                className="font-ibm-mono text-[11px] font-semibold"
                style={{ color: urgenciaColor }}
              >
                T-{diasRestantes}d
              </span>
            )}
          </div>
          <div className="h-1.5 bg-gz-cream-dark rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(config.progresoGlobal, 100)}%`,
                backgroundColor: urgenciaColor,
              }}
            />
          </div>
          {config.temaDebil && (
            <p className="font-archivo text-[11px] text-gz-ink-mid mt-2">
              Área más débil:{" "}
              <span className="font-semibold text-gz-ink">{config.temaDebil}</span>{" "}
              <span className="text-gz-burgundy">({config.temaDebilPorcentaje}%)</span>
            </p>
          )}
        </div>
        <span className="font-archivo text-[11px] font-semibold text-gz-gold shrink-0 group-hover:text-gz-burgundy group-hover:translate-x-1 transition-all hidden sm:inline">
          Ver plan →
        </span>
      </div>
    </Link>
  );
}
