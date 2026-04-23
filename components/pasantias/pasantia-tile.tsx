"use client";

import Link from "next/link";
import { useState } from "react";
import {
  areaGradient,
  areaLabel,
  formatoLabel,
  remuneracionLabel,
  jornadaLabel,
  estudioInitial,
  formatDateShort,
  deadlineLabel,
  isDeadlinePassed,
  type PasantiaType,
} from "@/lib/pasantias-helpers";
import { initials, formatRelative, isFresh } from "@/lib/ayudantias-v4-helpers";

export interface PasantiaTileProps {
  id: string;
  type: PasantiaType;
  titulo: string;
  empresa: string;
  areaPractica: string;
  ciudad: string;
  formato: string;
  jornada: string | null;
  remuneracion: string;
  montoRemu: string | null;
  fechaLimite: string | null;
  cupos: number | null;
  createdAt: string;
  estudio: {
    id: string;
    slug: string;
    nombre: string;
    logoUrl: string | null;
    verificado: boolean;
  } | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    universidad: string | null;
  };
  onFav?: (id: string, next: boolean) => void;
  initialFav?: boolean;
}

/**
 * Tile V4 para pasantías — hereda el lenguaje editorial de ayudantías.
 * OFREZCO: cover ink/gold, link a /pasantias/oferta/[id].
 * BUSCO:   cover burgundy, link a /pasantias/solicitud/[id].
 */
export function PasantiaTile(props: PasantiaTileProps) {
  const [fav, setFav] = useState(props.initialFav ?? false);
  const isBusco = props.type === "busco";
  const gradient = areaGradient(props.areaPractica);
  const href = isBusco
    ? `/dashboard/sala/pasantias/solicitud/${props.id}`
    : `/dashboard/sala/pasantias/oferta/${props.id}`;
  const fresh = isFresh(props.createdAt);
  const deadline = deadlineLabel(props.fechaLimite);
  const cerrada = isDeadlinePassed(props.fechaLimite);

  // Para OFREZCO, el "sujeto" visible es el estudio (o la persona si no hay).
  // Para BUSCO, siempre el postulante.
  const coverInitials = !isBusco && props.estudio
    ? estudioInitial(props.estudio.nombre)
    : initials(props.user.firstName, props.user.lastName);

  const sujeto = !isBusco && props.estudio ? props.estudio.nombre : props.empresa;

  return (
    <article
      className={`relative flex flex-col bg-white cursor-pointer
                  border-r border-b border-gz-rule
                  transition-[background,box-shadow] duration-200
                  hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2]
                  group`}
    >
      <Link
        href={href}
        aria-label={isBusco ? "Ver solicitud de pasantía" : `Ver oferta de ${sujeto}`}
        className="absolute inset-0 z-[1] overflow-hidden text-[0]"
      >
        {isBusco ? "Ver solicitud" : "Ver oferta"}
      </Link>

      {/* Cover */}
      <div
        className="relative aspect-[16/10] flex items-center justify-center overflow-hidden border-b border-gz-rule"
        style={{ background: isBusco
          ? "linear-gradient(135deg, #c2485a, #9a3040 55%, #6b1d2a)"
          : gradient }}
      >
        <div
          className="absolute inset-0 pointer-events-none mix-blend-soft-light"
          style={{ background: "linear-gradient(180deg, rgba(245,240,230,0.18), rgba(245,240,230,0))" }}
        />

        <span
          className={`absolute top-3 left-3 z-[2] px-2.5 py-1 rounded-[3px]
                     font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium
                     ${isBusco
                       ? "bg-gz-burgundy/95 text-gz-cream"
                       : "bg-gz-ink/90 text-gz-cream"}`}
        >
          {isBusco ? "Busca pasantía" : "Ofrece pasantía"}
        </span>

        {!isBusco && props.estudio?.verificado && (
          <span className="absolute top-3 left-[108px] z-[2] px-2 py-1 rounded-[3px] bg-gz-gold/95 text-gz-ink font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-semibold">
            ✓ Estudio
          </span>
        )}

        <button
          type="button"
          aria-label="Guardar pasantía"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const next = !fav;
            setFav(next);
            props.onFav?.(props.id, next);
          }}
          className={`absolute top-2.5 right-2.5 z-[2] w-8 h-8 rounded-full
                     flex items-center justify-center text-[15px] leading-none
                     bg-gz-cream/88 hover:bg-white/95 transition
                     ${fav ? "text-gz-burgundy" : "text-gz-ink-mid hover:text-gz-burgundy"}`}
        >
          {fav ? "♥" : "♡"}
        </button>

        <div
          className="relative z-[1] font-cormorant font-bold text-[78px] leading-none tracking-[-2px] text-gz-cream/92
                     transition-transform duration-200 group-hover:scale-[1.04]"
          style={{ textShadow: "0 2px 12px rgba(28,24,20,0.22)" }}
        >
          {coverInitials}
        </div>

        <span className="absolute bottom-2.5 left-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-cream/88 flex items-center gap-1.5">
          {fresh && <span className="w-1.5 h-1.5 rounded-full bg-gz-gold-bright animate-pulse" />}
          {formatRelative(props.createdAt)}
        </span>

        {deadline && !isBusco && (
          <span
            className={`absolute bottom-2.5 right-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase px-2 py-1 rounded-[3px]
                       ${cerrada
                         ? "bg-gz-ink/90 text-gz-cream/70 line-through"
                         : "bg-gz-cream/90 text-gz-ink"}`}
          >
            {deadline}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-[18px_20px_20px] flex flex-col gap-[10px] flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-ibm-mono text-[10px] tracking-[1.6px] uppercase font-medium
                       ${isBusco ? "text-gz-burgundy" : "text-gz-ink-mid"}`}
          >
            {areaLabel(props.areaPractica)}
          </span>
          {!isBusco && props.cupos && (
            <span className="font-ibm-mono text-[10.5px] text-gz-ink-mid">
              § {props.cupos} {props.cupos === 1 ? "cupo" : "cupos"}
            </span>
          )}
        </div>

        <h3 className="font-cormorant font-semibold text-[21px] leading-[1.18] text-gz-ink m-0">
          {props.titulo}
        </h3>

        <div
          className={`h-px w-10 ${isBusco ? "bg-gz-burgundy" : "bg-gz-gold"} mb-1`}
        />

        <p className="text-[12.5px] text-gz-ink-light m-0 leading-[1.45]">
          <strong className="font-semibold text-gz-ink">
            {sujeto}
          </strong>
          <span> · {props.ciudad}</span>
          {isBusco && props.user.universidad && (
            <span className="block mt-0.5 font-ibm-mono text-[10px] tracking-[1px] uppercase text-gz-ink-mid">
              {props.user.firstName} {props.user.lastName} · {props.user.universidad}
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-ink-mid px-2 py-1 rounded-[3px] border border-gz-rule">
            {formatoLabel(props.formato)}
          </span>
          <span className="font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-ink-mid px-2 py-1 rounded-[3px] border border-gz-rule">
            {jornadaLabel(props.jornada)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gz-rule/60">
          <span
            className={`font-ibm-mono text-[12px] tracking-[0.8px]
                       ${props.remuneracion === "no_pagada"
                         ? "text-gz-sage italic font-semibold"
                         : props.remuneracion === "pagada"
                         ? "text-gz-burgundy font-semibold"
                         : "text-gz-ink font-medium"}`}
          >
            {remuneracionLabel(props.remuneracion, props.montoRemu)}
          </span>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={`relative z-[2] px-3 py-[7px] font-ibm-mono text-[10px] tracking-[1.5px] uppercase
                       border rounded-[3px] transition
                       ${isBusco
                         ? "border-gz-burgundy text-gz-burgundy hover:bg-gz-burgundy hover:text-gz-cream"
                         : "border-gz-ink text-gz-ink hover:bg-gz-ink hover:text-gz-cream"}`}
          >
            {isBusco ? "Ofrecer →" : "Postular →"}
          </button>
        </div>
      </div>

      {/* Date under hover — small refinement consistent with ayudantías */}
      {!isBusco && props.fechaLimite && (
        <span className="sr-only">
          Fecha límite: {formatDateShort(props.fechaLimite)}
        </span>
      )}
    </article>
  );
}
