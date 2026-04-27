// ─── InvDestacado — Ejemplar destacado con aside negro ─────
//
// 2 columnas: contenido + aside negro con cita destacada.
// La cita destacada en aside es híbrida: si la investigación tiene
// `featuredQuoteCitationId`, se resuelve esa Citacion (sprint 2);
// en sprint 1 mostramos un fallback descriptivo.
// Los datos cuantitativos (palabras, lecturas, citas) van en arábigos.

import Link from "next/link";
import {
  TIPOS_INVESTIGACION_LABELS,
  AREAS_DERECHO_LABELS_CORTOS,
  toRoman,
} from "@/lib/investigaciones-constants";
import type { InvSerialized } from "@/lib/investigaciones";

export function InvDestacado({
  investigacion,
}: {
  investigacion: InvSerialized | null;
}) {
  if (!investigacion) return null;

  const { user } = investigacion;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const tipoLabel =
    TIPOS_INVESTIGACION_LABELS[
      investigacion.tipo as keyof typeof TIPOS_INVESTIGACION_LABELS
    ] ?? investigacion.tipo;
  const areaLabel =
    AREAS_DERECHO_LABELS_CORTOS[
      investigacion.area as keyof typeof AREAS_DERECHO_LABELS_CORTOS
    ] ?? investigacion.area;
  const citasTotal =
    investigacion.citationsInternal + investigacion.citationsExternal;

  return (
    <div className="mb-12 inv-anim-destacado">
      {/* Rótulo decorativo */}
      <div className="text-center font-cormorant italic text-[13px] text-inv-ink-3 tracking-[2px] mb-5 uppercase">
        <span className="text-inv-ocre">— </span>
        Ejemplar destacado · Pliego del mes
        <span className="text-inv-ocre"> —</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-0 border border-inv-ink bg-inv-paper">
        {/* Columna contenido */}
        <div className="p-8 lg:p-9 lg:border-r lg:border-inv-ink flex flex-col">
          <div className="font-cormorant italic text-[13px] text-inv-ocre tracking-[2px] uppercase mb-3.5">
            <span className="not-italic text-inv-ink-4 mr-1.5">I ·</span>
            {tipoLabel} · {areaLabel}
          </div>

          <h2 className="font-cormorant text-[34px] sm:text-[38px] font-medium leading-[1.12] mb-4 tracking-[-0.5px] text-inv-ink">
            {investigacion.titulo}
          </h2>

          <div className="font-crimson-pro italic text-[15px] text-inv-ink-2 mb-4 pb-3.5 border-b border-inv-rule-2">
            por{" "}
            <strong className="not-italic font-semibold text-inv-ink">
              {user.firstName} {user.lastName}
            </strong>
            {user.universidad && <> · {user.universidad}</>}
            {user.etapaActual && (
              <>
                {" "}
                ·{" "}
                <em>
                  {capitalize(user.etapaActual)}
                </em>
              </>
            )}
          </div>

          <p className="inv-dest-abstract font-crimson-pro text-[16px] leading-[1.65] text-inv-ink-2 mb-6 flex-1">
            {investigacion.abstract.length > 360
              ? investigacion.abstract.slice(0, 360) + "…"
              : investigacion.abstract}
          </p>

          <div className="flex gap-5 items-center pb-5 border-b border-inv-rule-2 mb-5 flex-wrap">
            <span className="font-crimson-pro text-[12px] text-inv-ink-3">
              <strong className="font-cormorant text-[18px] font-semibold text-inv-ink mr-1">
                {investigacion.wordCount.toLocaleString("es-CL")}
              </strong>
              palabras
            </span>
            <span className="font-crimson-pro text-[12px] text-inv-ink-3">
              <strong className="font-cormorant text-[18px] font-semibold text-inv-ink mr-1">
                {investigacion.views.toLocaleString("es-CL")}
              </strong>
              lecturas
            </span>
            {investigacion.citationsExternal > 0 && (
              <span className="font-crimson-pro text-[12px] text-inv-ink-3">
                <strong className="font-cormorant text-[18px] font-semibold text-inv-ink mr-1">
                  {toRoman(investigacion.citationsExternal)}
                </strong>
                citas externas verificadas
              </span>
            )}
          </div>

          <Link
            href={`/dashboard/diario/investigaciones/${investigacion.id}`}
            className="font-crimson-pro text-[14px] tracking-[1px] text-inv-ocre cursor-pointer self-start border-b border-inv-ocre pb-0.5 hover:text-inv-ink hover:border-inv-ink transition-colors"
          >
            Leer en imprenta →
          </Link>
        </div>

        {/* Aside negro */}
        <div className="bg-inv-ink text-inv-paper p-8 lg:p-9 flex flex-col justify-between relative">
          <span
            className="absolute top-4 right-4 w-[60px] h-[60px] rounded-full border border-[rgba(247,243,234,0.25)]"
            aria-hidden
          />
          <span
            className="absolute top-8 right-9 text-[20px] text-inv-ocre-3"
            aria-hidden
          >
            ★
          </span>

          <div>
            <div className="font-cormorant text-[12px] tracking-[3px] text-inv-ocre-3 mb-2.5 uppercase italic">
              — Sello editorial —
            </div>
            <p
              className="font-cormorant italic text-[20px] sm:text-[22px] leading-[1.4] mb-6 text-inv-paper"
            >
              <span className="text-inv-ocre-3 not-italic text-[36px] align-[-8px] mr-1">
                «
              </span>
              {investigacion.deck ??
                investigacion.abstract.slice(0, 140) + "…"}
              <span className="text-inv-ocre-3 not-italic text-[36px] align-[-8px] ml-1">
                »
              </span>
            </p>
            <div className="font-crimson-pro text-[12px] text-[rgba(247,243,234,0.5)] tracking-[1px] pt-3.5 border-t border-[rgba(247,243,234,0.15)]">
              <em>
                — {user.firstName} {user.lastName[0]}.
                {user.universidad && <>, {user.universidad}</>}
              </em>
            </div>
          </div>

          <div className="mt-6">
            <div className="h-px bg-[rgba(247,243,234,0.2)] mb-4" />
            <div className="font-cormorant text-[12px] tracking-[3px] text-inv-ocre-3 mb-2 uppercase italic">
              — Veces citado —
            </div>
            <div className="font-cormorant text-[78px] sm:text-[88px] font-medium leading-none text-inv-ocre-3">
              {citasTotal > 0 ? toRoman(citasTotal) : "—"}
            </div>
            <div className="font-crimson-pro italic text-[14px] text-[rgba(247,243,234,0.7)] mt-1 flex items-center gap-2">
              {/* Avatar del autor */}
              <span
                className="inv-sello inline-flex items-center justify-center"
                style={{ width: 28, height: 28, fontSize: 11 }}
              >
                {user.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="rounded-full object-cover absolute inset-0 w-full h-full"
                  />
                ) : (
                  initials
                )}
              </span>
              {citasTotal === 0 ? (
                <span>Aún sin citaciones</span>
              ) : (
                <span>
                  por {investigacion.citationsInternal} trabajos en Studio IURIS
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}
