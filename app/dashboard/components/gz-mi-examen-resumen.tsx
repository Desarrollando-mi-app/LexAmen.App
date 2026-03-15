"use client";

import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────

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

// ─── Component ─────────────────────────────────────────────

export function GzMiExamenResumen({ config }: ExamenResumenProps) {
  // No config — show CTA
  if (!config) {
    return (
      <Link
        href="/dashboard/progreso"
        className="block rounded-[4px] border border-dashed border-gz-gold/30 bg-gz-gold/[0.03] p-5 transition-colors hover:border-gz-gold/60 hover:bg-gz-gold/[0.06]"
      >
        <div className="flex items-center gap-3">
          <span className="text-[20px]">📋</span>
          <div>
            <p className="font-cormorant text-[16px] font-bold text-gz-ink">
              Configura tu plan de estudio personalizado
            </p>
            <p className="font-archivo text-[12px] text-gz-ink-mid mt-0.5">
              Sube tu cedulario y obt&eacute;n un plan adaptado a tu examen de grado &rarr;
            </p>
          </div>
        </div>
      </Link>
    );
  }

  // Has config — show mini summary
  const diasRestantes = config.fechaExamen
    ? Math.max(
        0,
        Math.ceil(
          (new Date(config.fechaExamen).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <Link
      href="/dashboard/progreso"
      className="block rounded-[4px] border border-gz-rule bg-white p-5 transition-colors hover:border-gz-gold/50"
    >
      <div className="flex items-start gap-3">
        <span className="text-[20px] shrink-0">📋</span>
        <div className="flex-1 min-w-0">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-1">
            Mi Examen &middot; {config.universidad}
            {config.sede ? ` ${config.sede}` : ""}
          </p>

          <div className="flex items-center gap-3">
            <p className="font-cormorant text-[20px] font-bold text-gz-ink">
              {Math.round(config.progresoGlobal)}% de progreso
            </p>
            {diasRestantes !== null && (
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                &middot; {diasRestantes} d&iacute;as restantes
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gz-cream-dark rounded-sm overflow-hidden mt-2">
            <div
              className="h-full bg-gz-gold rounded-sm"
              style={{
                width: `${Math.min(config.progresoGlobal, 100)}%`,
              }}
            />
          </div>

          {config.temaDebil && (
            <p className="font-archivo text-[11px] text-gz-ink-mid mt-2">
              &Aacute;rea m&aacute;s d&eacute;bil: {config.temaDebil} ({config.temaDebilPorcentaje}%)
            </p>
          )}

          <p className="font-archivo text-[11px] text-gz-gold mt-1">
            Ver plan completo &rarr;
          </p>
        </div>
      </div>
    </Link>
  );
}
