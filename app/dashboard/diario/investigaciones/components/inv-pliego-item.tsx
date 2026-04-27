// ─── InvPliegoItem — Card de investigación en el listado ────
//
// Grid 60px+1fr: numeral romano italic en gris (cambia a ocre en hover)
// + contenido. Las citas se muestran en romano (decorativo, top<3000),
// el resto de datos en arábigos.

import Link from "next/link";
import {
  TIPOS_INVESTIGACION_LABELS,
  AREAS_DERECHO_LABELS_CORTOS,
  toRoman,
  toRomanLower,
} from "@/lib/investigaciones-constants";
import type { InvSerialized } from "@/lib/investigaciones";

export function InvPliegoItem({
  item,
  index,
}: {
  item: InvSerialized;
  index: number; // 1-based
}) {
  const tipoLabel =
    TIPOS_INVESTIGACION_LABELS[
      item.tipo as keyof typeof TIPOS_INVESTIGACION_LABELS
    ] ?? item.tipo;
  const areaLabel =
    AREAS_DERECHO_LABELS_CORTOS[
      item.area as keyof typeof AREAS_DERECHO_LABELS_CORTOS
    ] ?? item.area;
  const fecha = new Date(item.publishedAt).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
  });
  const citas = item.citationsInternal + item.citationsExternal;

  return (
    <Link
      href={`/dashboard/diario/investigaciones/${item.id}`}
      className="block group"
    >
      <article className="grid grid-cols-[40px_1fr] sm:grid-cols-[60px_1fr] gap-4 sm:gap-[18px] py-[22px] border-b border-inv-rule-2 cursor-pointer transition-all hover:pl-2">
        {/* Numeral romano */}
        <div className="font-cormorant italic text-[26px] sm:text-[32px] font-normal text-inv-ink-4 leading-none pt-1 text-right tracking-[-1px] transition-colors group-hover:text-inv-ocre">
          <em>{toRomanLower(index)}</em>
        </div>

        <div>
          <div className="font-crimson-pro text-[11px] tracking-[1px] uppercase text-inv-ink-3 mb-1.5">
            <span className="text-inv-ocre font-semibold italic">
              {tipoLabel}
            </span>
            <span className="text-inv-rule-3 mx-1.5">·</span>
            <span>{areaLabel}</span>
            <span className="text-inv-rule-3 mx-1.5">·</span>
            <span>{fecha}</span>
          </div>

          <h3 className="font-cormorant text-[20px] sm:text-[24px] font-medium leading-[1.2] mb-2 tracking-[-0.3px] text-inv-ink">
            {item.titulo}
          </h3>

          {item.abstract && (
            <p className="font-crimson-pro text-[14px] sm:text-[15px] leading-[1.55] text-inv-ink-2 mb-3 line-clamp-3">
              {item.abstract.length > 300
                ? item.abstract.slice(0, 300) + "…"
                : item.abstract}
            </p>
          )}

          <div className="flex items-center gap-4 font-crimson-pro text-[12px] text-inv-ink-3 flex-wrap">
            <span className="italic text-inv-ink">
              por{" "}
              <strong className="not-italic font-semibold">
                {item.user.firstName} {item.user.lastName}
              </strong>
            </span>
            {item.user.universidad && (
              <span className="font-cormorant italic text-inv-ink-3">
                {item.user.universidad}
              </span>
            )}
            <span>{item.wordCount.toLocaleString("es-CL")} palabras</span>
            <span
              className={`ml-auto inline-flex items-baseline gap-1 italic ${
                citas > 0 ? "text-inv-ocre" : "text-inv-ink-4"
              }`}
            >
              {citas > 0 ? (
                <>
                  Citado{" "}
                  <strong className="font-cormorant text-[16px] font-semibold not-italic">
                    {toRoman(citas)}
                  </strong>{" "}
                  veces
                </>
              ) : (
                <em>aún sin citas</em>
              )}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
