// ─── InvAside — sidebar del detalle ──────────────────────────
//
// Sprint 1: 3 tarjetas apiladas — métricas, mini-autor, acciones.
// El sparkline (citas por mes) se añade en Sprint 2 cuando el sistema
// de citas internas esté operativo (requiere `getSparklineData`).

import Link from "next/link";
import type { InvSerializedFull } from "@/lib/investigaciones";
import { formatEtapa } from "@/lib/etapa";

export function InvAside({
  investigacion,
  trabajosDelAutor,
}: {
  investigacion: InvSerializedFull;
  trabajosDelAutor: number;
}) {
  const { user } = investigacion;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const citasTotal =
    investigacion.citationsInternal + investigacion.citationsExternal;

  return (
    <aside className="space-y-6 lg:sticky lg:top-6 h-fit">
      {/* ─── Cuadro: Métricas ─── */}
      <div className="bg-inv-paper border border-inv-ink">
        <div className="bg-inv-ink text-inv-paper py-3 px-5 font-cormorant italic text-[14px] tracking-[2px] uppercase text-center">
          — Métricas de impacto —
        </div>
        <div className="px-5 py-5">
          {/* Métrica grande */}
          <div className="text-center pb-4 mb-4 border-b border-inv-rule-2">
            <div className="font-cormorant text-[64px] sm:text-[72px] font-medium leading-none text-inv-ocre tracking-[-2px]">
              {citasTotal}
              <em className="text-[14px] italic text-inv-ink-3 align-top ml-1 not-italic">
                ×
              </em>
            </div>
            <div className="font-cormorant italic text-[13px] text-inv-ink-3 mt-1.5 tracking-[1px]">
              {citasTotal === 1 ? "vez citado" : "veces citado"}
            </div>
          </div>

          {/* Sparkline placeholder — Sprint 2 */}
          {/* Por ahora dejamos el espacio para cuando se enchufe getSparklineData */}

          {/* Filas de métricas */}
          <Metric label="Internas" value={investigacion.citationsInternal} />
          <Metric label="Externas verificadas" value={investigacion.citationsExternal} />
          <Metric label="Lecturas" value={investigacion.views} />
          <Metric label="Palabras" value={investigacion.wordCount} />
        </div>
      </div>

      {/* ─── Cuadro: Mini perfil del autor ─── */}
      <div className="bg-inv-paper border border-inv-ink p-5 text-center relative">
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-inv-paper px-3 font-cormorant italic text-[12px] text-inv-ink-3 tracking-[2px] uppercase">
          — Autor —
        </span>

        <Link href={`/dashboard/perfil/${user.id}`} className="block group">
          <div
            className="inv-sello mx-auto mt-2 mb-3"
            style={{ width: 60, height: 60, fontSize: 22 }}
          >
            {user.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatarUrl}
                alt=""
                className="rounded-full object-cover absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)]"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="font-cormorant text-[18px] font-medium tracking-[-0.2px] mb-1 text-inv-ink group-hover:text-inv-ocre transition-colors">
            {user.firstName} {user.lastName}
          </div>
        </Link>

        {user.universidad && (
          <div className="font-cormorant italic text-[12px] text-inv-ink-3 mb-1">
            {user.universidad}
          </div>
        )}
        {user.etapaActual && (
          <div className="font-crimson-pro text-[10px] text-inv-ocre tracking-[1.5px] uppercase mb-3.5">
            <em>{formatEtapa(user.etapaActual, user.gender)}</em>
          </div>
        )}

        <div className="flex justify-center gap-3.5 py-3 border-y border-inv-rule-2 mb-3">
          <div>
            <div className="font-cormorant text-[19px] font-semibold text-inv-ink leading-none">
              {trabajosDelAutor}
            </div>
            <div className="font-crimson-pro italic text-[10px] text-inv-ink-3 mt-0.5">
              <em>trabajos</em>
            </div>
          </div>
          <div>
            <div className="font-cormorant text-[19px] font-semibold text-inv-ink leading-none">
              {user.hIndex}
            </div>
            <div className="font-crimson-pro italic text-[10px] text-inv-ink-3 mt-0.5">
              <em>índice h</em>
            </div>
          </div>
          <div>
            <div className="font-cormorant text-[19px] font-semibold text-inv-ink leading-none">
              {user.totalCitationsReceived}
            </div>
            <div className="font-crimson-pro italic text-[10px] text-inv-ink-3 mt-0.5">
              <em>citas</em>
            </div>
          </div>
        </div>

        <Link
          href={`/dashboard/perfil/${user.id}`}
          className="font-cormorant italic text-[12px] text-inv-ocre tracking-[1px] cursor-pointer hover:text-inv-ink transition-colors"
        >
          Ver claustro de la autora →
        </Link>
      </div>

      {/* ─── Cuadro: Acciones ─── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="font-crimson-pro text-[11px] tracking-[1.5px] uppercase py-2.5 px-2 bg-inv-paper border border-inv-ink text-inv-ink cursor-pointer transition-colors hover:bg-inv-ink hover:text-inv-paper"
        >
          ★ Citar
        </button>
        <button
          type="button"
          className="font-crimson-pro text-[11px] tracking-[1.5px] uppercase py-2.5 px-2 bg-inv-paper border border-inv-ink text-inv-ink cursor-pointer transition-colors hover:bg-inv-ink hover:text-inv-paper"
        >
          ⤓ PDF
        </button>
        <button
          type="button"
          className="font-crimson-pro text-[11px] tracking-[1.5px] uppercase py-2.5 px-2 bg-inv-paper border border-inv-ink text-inv-ink cursor-pointer transition-colors hover:bg-inv-ink hover:text-inv-paper"
        >
          ⎔ Compartir
        </button>
        <button
          type="button"
          className="font-crimson-pro text-[11px] tracking-[1.5px] uppercase py-2.5 px-2 bg-inv-paper border border-inv-ink text-inv-ink cursor-pointer transition-colors hover:bg-inv-ink hover:text-inv-paper"
        >
          ♡ Guardar
        </button>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-inv-rule-2 last:border-b-0">
      <span className="font-cormorant italic text-[13px] text-inv-ink-3">
        <em>{label}</em>
      </span>
      <span className="font-cormorant text-[18px] font-medium text-inv-ink tabular-nums">
        {value.toLocaleString("es-CL")}
      </span>
    </div>
  );
}

