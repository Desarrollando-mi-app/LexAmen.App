"use client";

import Link from "next/link";
import Image from "next/image";
import {
  etapaGradient,
  etapaLabel,
  areaLabel,
  colegaInitials,
  colegaSummary,
  type ColegaTileData,
} from "@/lib/networking-helpers";

/**
 * Tile V4 editorial para Networking — mismo lenguaje que Pasantías y Ofertas:
 * cover degradado por etapa profesional, badge de etapa en gz-ink, monogram
 * con iniciales o avatar real cuando existe. Cuerpo con summary editorial,
 * 2 chips de especialidad y CTA "Ver perfil →".
 */
export function ColegaTile(props: ColegaTileData) {
  const gradient = etapaGradient(props.etapaActual);
  const initials = colegaInitials(props.firstName, props.lastName);
  const fullName = `${props.firstName} ${props.lastName}`.trim();
  const summary = colegaSummary({
    etapaActual: props.etapaActual,
    universidad: props.universidad,
    cargoActual: props.cargoActual,
    empleoActual: props.empleoActual,
    universityYear: props.universityYear,
  });
  const region = props.region
    ? props.region.replace(/^Región (de |del |de la |Metropolitana de )/, "")
    : null;
  const topEsp = props.especialidades.slice(0, 2);

  return (
    <article
      className="relative flex flex-col bg-white cursor-pointer
                 border-r border-b border-gz-rule
                 transition-[background,box-shadow] duration-200
                 hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2]
                 group"
    >
      <Link
        href={`/dashboard/perfil/${props.id}`}
        aria-label={`Ver perfil de ${fullName}`}
        className="absolute inset-0 z-[1] overflow-hidden text-[0]"
      >
        Ver perfil
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
          {etapaLabel(props.etapaActual)}
        </span>

        {props.avatarUrl ? (
          <div className="relative z-[1] w-[92px] h-[92px] rounded-full overflow-hidden border-[3px] border-gz-cream/85 shadow-[0_2px_12px_rgba(28,24,20,0.22)] transition-transform duration-200 group-hover:scale-[1.04]">
            <Image
              src={props.avatarUrl}
              alt={fullName}
              fill
              sizes="92px"
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="relative z-[1] font-cormorant font-bold text-[68px] leading-none tracking-[-2px] text-gz-cream/92
                       transition-transform duration-200 group-hover:scale-[1.04]"
            style={{ textShadow: "0 2px 12px rgba(28,24,20,0.22)" }}
          >
            {initials}
          </div>
        )}

        {region && (
          <span className="absolute bottom-2.5 left-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-cream/88">
            {region}
          </span>
        )}

        {props.grado > 1 && (
          <span className="absolute bottom-2.5 right-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase px-2 py-1 rounded-[3px] bg-gz-cream/90 text-gz-ink">
            Grado {toRoman(props.grado)}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-[18px_20px_20px] flex flex-col gap-[10px] flex-1">
        <span className="font-ibm-mono text-[10px] tracking-[1.6px] uppercase font-medium text-gz-ink-mid">
          {props.universidad ?? "Sin universidad"}
        </span>

        <h3 className="font-cormorant font-semibold text-[21px] leading-[1.18] text-gz-ink m-0">
          {fullName}
        </h3>

        <div className="h-px w-10 bg-gz-gold mb-1" />

        <p className="text-[12.5px] text-gz-ink-light m-0 leading-[1.45]">
          {summary}
        </p>

        {topEsp.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {topEsp.map((e) => (
              <span
                key={e}
                className="font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-ink-mid px-2 py-1 rounded-[3px] border border-gz-rule"
              >
                {areaLabel(e)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gz-rule/60">
          <span className="font-cormorant italic text-[13px] text-gz-ink-mid">
            {props.xp.toLocaleString("es-CL")} XP
          </span>
          <span className="relative z-[2] px-3 py-[7px] font-ibm-mono text-[10px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] group-hover:bg-gz-ink group-hover:text-gz-cream transition">
            Ver perfil →
          </span>
        </div>
      </div>
    </article>
  );
}

/** Ints a roman numerals — para el grado en covers. */
function toRoman(num: number): string {
  if (num <= 0) return "";
  const map: Array<[number, string]> = [
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
