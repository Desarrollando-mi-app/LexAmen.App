"use client";

import Link from "next/link";
import { useState } from "react";
import {
  subjectColor,
  SUBJECT_GRADIENTS,
  initials,
  priceLabel,
  formatLabel,
  formatSchedule,
  formatRelative,
  isFresh,
} from "@/lib/ayudantias-v4-helpers";

export interface TileCardProps {
  id: string;
  type: "OFREZCO" | "BUSCO";
  materia: string;
  titulo: string | null;
  format: string;
  priceType: string;
  priceAmount: number | null;
  disponibilidad: string | null;
  orientadaA: string[];
  createdAt: string;
  sesionesCompletadas: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    universidad: string | null;
  };
  rating: { avg: number | null; count: number } | null;
  /** Opcional — callback cuando el usuario toggle-ea el corazón. */
  onFav?: (id: string, next: boolean) => void;
  /** Estado inicial del corazón (default false). */
  initialFav?: boolean;
}

/**
 * V4 Hybrid tile — cover + body con borde compartido.
 * Los tiles "OFREZCO" se linkean al perfil del tutor.
 * Los tiles "BUSCO" se linkean al detalle de la solicitud (sin perfil de tutor).
 */
export function TileCard(props: TileCardProps) {
  const [fav, setFav] = useState(props.initialFav ?? false);
  const isBusco = props.type === "BUSCO";
  const color = subjectColor(props.materia);
  const gradient = SUBJECT_GRADIENTS[color];
  const href = isBusco
    ? `/dashboard/sala/ayudantias/solicitud/${props.id}`
    : `/dashboard/sala/ayudantias/tutor/${props.user.id}`;
  const price = priceLabel(props.priceType, props.priceAmount);
  const fresh = isFresh(props.createdAt);

  return (
    <article
      className={`relative flex flex-col bg-white cursor-pointer
                  border-r border-b border-gz-rule
                  transition-[background,box-shadow] duration-200
                  hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2]
                  group`}
    >
      {/* Stretched link — todo el tile es clickable */}
      <Link
        href={href}
        aria-label={isBusco ? "Ver solicitud" : `Ver perfil de ${props.user.firstName} ${props.user.lastName}`}
        className="absolute inset-0 z-[1] overflow-hidden text-[0]"
      >
        {isBusco ? "Ver solicitud" : "Ver perfil"}
      </Link>

      {/* Cover */}
      <div
        className="relative aspect-[16/10] flex items-center justify-center overflow-hidden border-b border-gz-rule"
        style={{ background: gradient }}
      >
        {/* Soft overlay */}
        <div
          className="absolute inset-0 pointer-events-none mix-blend-soft-light"
          style={{ background: "linear-gradient(180deg, rgba(245,240,230,0.18), rgba(245,240,230,0))" }}
        />

        {/* Tag Ofrece/Busca */}
        <span
          className={`absolute top-3 left-3 z-[2] px-2.5 py-1 rounded-[3px]
                     font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium
                     ${isBusco
                       ? "bg-gz-burgundy/95 text-gz-cream"
                       : "bg-gz-ink/90 text-gz-cream"}`}
        >
          {isBusco ? "Busca" : "Ofrece"}
        </span>

        {/* Favorito */}
        <button
          type="button"
          aria-label="Guardar"
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

        {/* Iniciales grandes */}
        <div
          className="relative z-[1] font-cormorant font-bold text-[78px] leading-none tracking-[-2px] text-gz-cream/92
                     transition-transform duration-200 group-hover:scale-[1.04]"
          style={{ textShadow: "0 2px 12px rgba(28,24,20,0.22)" }}
        >
          {initials(props.user.firstName, props.user.lastName)}
        </div>

        {/* Fecha */}
        <span className="absolute bottom-2.5 left-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-cream/88 flex items-center gap-1.5">
          {fresh && <span className="w-1.5 h-1.5 rounded-full bg-gz-gold-bright animate-pulse" />}
          {formatRelative(props.createdAt)}
        </span>
      </div>

      {/* Body */}
      <div className="p-[18px_20px_20px] flex flex-col gap-[10px] flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-ibm-mono text-[10px] tracking-[1.6px] uppercase font-medium
                       ${isBusco ? "text-gz-burgundy" : "text-gz-ink-mid"}`}
          >
            {props.materia}
          </span>
          {!isBusco && props.rating?.avg && (
            <span className="font-ibm-mono text-[10.5px] text-gz-ink-mid">
              <span className="text-gz-gold">★</span> {props.rating.avg.toFixed(1)}
            </span>
          )}
        </div>

        <h3 className="font-cormorant font-semibold text-[21px] leading-[1.18] text-gz-ink m-0">
          {props.titulo || props.materia}
        </h3>

        {/* Filete dorado / burgundy */}
        <div
          className={`h-px w-10 ${isBusco ? "bg-gz-burgundy" : "bg-gz-gold"} mb-1`}
        />

        <p className="text-[12.5px] text-gz-ink-light m-0 leading-[1.45]">
          <strong className="font-semibold text-gz-ink">
            {props.user.firstName} {props.user.lastName}
          </strong>
          {props.user.universidad && <span> · {props.user.universidad}</span>}
          {!isBusco && (
            <span className="ml-2 font-ibm-mono text-[10px] tracking-[1px] uppercase text-gz-ink-mid">
              § {props.sesionesCompletadas} sesiones
            </span>
          )}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-ink-mid px-2 py-1 rounded-[3px] border border-gz-rule">
            {formatLabel(props.format)}
          </span>
          <span className="font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-ink-mid px-2 py-1 rounded-[3px] border border-gz-rule">
            {formatSchedule(props.disponibilidad)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gz-rule/60">
          <span
            className={`font-ibm-mono text-[12px] tracking-[0.8px]
                       ${props.priceType === "GRATUITO"
                         ? "text-gz-sage italic font-semibold"
                         : "text-gz-ink font-medium"}`}
          >
            {price}
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
            {isBusco ? "Postular →" : "Solicitar →"}
          </button>
        </div>
      </div>
    </article>
  );
}
