"use client";

import Link from "next/link";
import {
  areaGradient,
  areaLabel,
  formatoLabel,
  contratoLabel,
  remuneracionLabel,
  experienciaLabel,
  empresaInitial,
} from "@/lib/ofertas-helpers";
import { formatRelative, isFresh } from "@/lib/ayudantias-v4-helpers";

export interface OfertaTileProps {
  id: string;
  empresa: string;
  cargo: string;
  areaPractica: string;
  ciudad: string;
  formato: string;
  tipoContrato: string;
  experienciaReq: string | null;
  remuneracion: string | null;
  createdAt: string;
}

/**
 * Tile V4 para Ofertas laborales — mismo lenguaje editorial que pasantías.
 * Cover degradado por área, badge "Oferta laboral" en gz-ink, monogram con
 * inicial de la empresa, indicador "fresh" para postings recientes.
 */
export function OfertaTile(props: OfertaTileProps) {
  const gradient = areaGradient(props.areaPractica);
  const fresh = isFresh(props.createdAt);
  const initial = empresaInitial(props.empresa);

  return (
    <article
      className="relative flex flex-col bg-white cursor-pointer
                 border-r border-b border-gz-rule
                 transition-[background,box-shadow] duration-200
                 hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2]
                 group"
    >
      <Link
        href={`/dashboard/sala/ofertas/${props.id}`}
        aria-label={`Ver oferta laboral en ${props.empresa}`}
        className="absolute inset-0 z-[1] overflow-hidden text-[0]"
      >
        Ver oferta
      </Link>

      {/* Cover */}
      <div
        className="relative aspect-[16/10] flex items-center justify-center overflow-hidden border-b border-gz-rule"
        style={{ background: gradient }}
      >
        <div
          className="absolute inset-0 pointer-events-none mix-blend-soft-light"
          style={{
            background:
              "linear-gradient(180deg, rgba(245,240,230,0.18), rgba(245,240,230,0))",
          }}
        />

        <span className="absolute top-3 left-3 z-[2] px-2.5 py-1 rounded-[3px] bg-gz-ink/90 text-gz-cream font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium">
          Oferta laboral
        </span>

        <div
          className="relative z-[1] font-cormorant font-bold text-[78px] leading-none tracking-[-2px] text-gz-cream/92
                     transition-transform duration-200 group-hover:scale-[1.04]"
          style={{ textShadow: "0 2px 12px rgba(28,24,20,0.22)" }}
        >
          {initial}
        </div>

        <span className="absolute bottom-2.5 left-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-cream/88 flex items-center gap-1.5">
          {fresh && (
            <span className="w-1.5 h-1.5 rounded-full bg-gz-gold-bright animate-pulse" />
          )}
          {formatRelative(props.createdAt)}
        </span>

        {props.experienciaReq && (
          <span className="absolute bottom-2.5 right-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase px-2 py-1 rounded-[3px] bg-gz-cream/90 text-gz-ink">
            {experienciaLabel(props.experienciaReq)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-[18px_20px_20px] flex flex-col gap-[10px] flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-ibm-mono text-[10px] tracking-[1.6px] uppercase font-medium text-gz-ink-mid">
            {areaLabel(props.areaPractica)}
          </span>
          <span className="font-ibm-mono text-[10.5px] text-gz-ink-mid">
            § {contratoLabel(props.tipoContrato)}
          </span>
        </div>

        <h3 className="font-cormorant font-semibold text-[21px] leading-[1.18] text-gz-ink m-0">
          {props.cargo}
        </h3>

        <div className="h-px w-10 bg-gz-gold mb-1" />

        <p className="text-[12.5px] text-gz-ink-light m-0 leading-[1.45]">
          <strong className="font-semibold text-gz-ink">{props.empresa}</strong>
          <span> · {props.ciudad}</span>
        </p>

        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-ink-mid px-2 py-1 rounded-[3px] border border-gz-rule">
            {formatoLabel(props.formato)}
          </span>
          <span className="font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-ink-mid px-2 py-1 rounded-[3px] border border-gz-rule">
            {contratoLabel(props.tipoContrato)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gz-rule/60">
          <span
            className={`font-ibm-mono text-[12px] tracking-[0.8px]
                       ${
                         !props.remuneracion
                           ? "text-gz-ink-mid italic"
                           : "text-gz-burgundy font-semibold"
                       }`}
          >
            {remuneracionLabel(props.remuneracion)}
          </span>
          <span className="relative z-[2] px-3 py-[7px] font-ibm-mono text-[10px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] group-hover:bg-gz-ink group-hover:text-gz-cream transition">
            Postular →
          </span>
        </div>
      </div>
    </article>
  );
}
