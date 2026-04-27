// ─── InvAparte — "Cuadro de honor" — sidebar de más citadas ──

import Link from "next/link";
import { toRomanLower } from "@/lib/investigaciones-constants";
import type { InvSerialized } from "@/lib/investigaciones";

export function InvAparte({ items }: { items: InvSerialized[] }) {
  return (
    <div className="bg-inv-paper border border-inv-ink">
      {/* Header negro */}
      <div className="bg-inv-ink text-inv-paper py-3.5 px-5 text-center border-b-[4px] border-double border-inv-paper">
        <div className="font-cormorant text-[11px] text-inv-ocre-3 tracking-[3px] uppercase mb-1">
          — Cuadro de honor —
        </div>
        <div className="font-cormorant italic text-[22px] font-medium">
          Más citadas
        </div>
      </div>

      <div className="px-[18px] py-[6px]">
        {items.length === 0 ? (
          <p className="font-cormorant italic text-[14px] text-inv-ink-3 text-center py-8">
            Aún no hay investigaciones con citaciones.
          </p>
        ) : (
          items.map((item, idx) => {
            const citas = item.citationsInternal + item.citationsExternal;
            return (
              <Link
                key={item.id}
                href={`/dashboard/diario/investigaciones/${item.id}`}
                className="grid grid-cols-[32px_1fr] gap-3 py-3.5 border-b border-inv-rule-2 last:border-b-0 cursor-pointer group"
              >
                <div className="font-cormorant italic text-[34px] font-medium text-inv-ink-3 leading-none text-center transition-colors group-hover:text-inv-ocre">
                  <em>{toRomanLower(idx + 1)}</em>
                </div>
                <div>
                  <div className="font-cormorant text-[15px] font-medium leading-[1.25] mb-1 text-inv-ink line-clamp-2">
                    {item.titulo}
                  </div>
                  <div className="font-crimson-pro italic text-[11px] text-inv-ink-3 mb-1.5">
                    {item.user.firstName} {item.user.lastName[0]}.
                    {item.user.universidad && <> · {item.user.universidad}</>}
                  </div>
                  <div className="font-crimson-pro text-[12px] text-inv-ocre">
                    <strong className="font-cormorant text-[16px] font-semibold not-italic">
                      {citas}
                    </strong>{" "}
                    {citas === 1 ? "cita" : "citas"}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
