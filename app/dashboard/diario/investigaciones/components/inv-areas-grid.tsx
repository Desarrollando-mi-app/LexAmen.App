// ─── InvAreasGrid — grid 4×N de áreas con romanos I-N ───────

import Link from "next/link";
import {
  AREAS_DERECHO_LABELS,
  AREAS_DERECHO_LABELS_CORTOS,
  toRoman,
} from "@/lib/investigaciones-constants";

export function InvAreasGrid({
  areas,
}: {
  areas: { area: string; count: number }[];
}) {
  if (areas.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 border border-inv-ink mb-12 bg-inv-paper inv-anim-areas">
      {areas.map((a, i) => {
        const label =
          AREAS_DERECHO_LABELS_CORTOS[
            a.area as keyof typeof AREAS_DERECHO_LABELS_CORTOS
          ] ??
          AREAS_DERECHO_LABELS[
            a.area as keyof typeof AREAS_DERECHO_LABELS
          ] ??
          a.area;
        return (
          <Link
            key={a.area}
            href={`/dashboard/diario/investigaciones?area=${a.area}`}
            className="block p-5 border-r border-b border-inv-rule cursor-pointer transition-colors hover:bg-inv-paper-2 last:border-r-0"
          >
            <div className="font-cormorant italic text-[11px] text-inv-ocre tracking-[2px] mb-1">
              {toRoman(i + 1)}
            </div>
            <div className="font-cormorant text-[18px] sm:text-[19px] font-medium mb-1 tracking-[-0.3px] text-inv-ink">
              {label}
            </div>
            <div className="font-crimson-pro italic text-[12px] text-inv-ink-3">
              {a.count} {a.count === 1 ? "trabajo" : "trabajos"} en imprenta
            </div>
          </Link>
        );
      })}
    </div>
  );
}
