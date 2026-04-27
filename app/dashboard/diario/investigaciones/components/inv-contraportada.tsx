// ─── InvContraportada — cierre editorial ──────────────────────
//
// Aparece al final del Pliego y del Detalle. Latín + meta de la edición.

import { toRoman } from "@/lib/investigaciones-constants";

export function InvContraportada() {
  const anioRoman = toRoman(new Date().getFullYear());
  return (
    <div className="text-center py-12 px-10 border-t-[3px] border-double border-inv-ink mt-12 relative">
      <span
        className="absolute -top-4 left-1/2 -translate-x-1/2 bg-inv-paper px-4 font-cormorant italic text-[22px] text-inv-ocre"
        aria-hidden
      >
        §
      </span>
      <p className="font-cormorant italic text-[20px] sm:text-[22px] text-inv-ink-2 mb-2 tracking-[1px]">
        — Fiat iustitia, ruat caelum —
      </p>
      <p className="font-crimson-pro text-[12px] text-inv-ink-4 tracking-[1px]">
        Studio IURIS · Imprenta · Investigaciones · Santiago de Chile · {anioRoman}
      </p>
    </div>
  );
}
