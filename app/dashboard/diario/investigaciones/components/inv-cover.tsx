// ─── InvCover — Portada del Pliego ──────────────────────────
//
// Encabezado tipográfico de la sección. "Pliego IV · MMXXVI" con el
// número de pliego = mes actual (1..12 → I..XII) y año en romanos.

import Link from "next/link";
import { toRoman } from "@/lib/investigaciones-constants";

export function InvCover() {
  const now = new Date();
  const pliegoNum = toRoman(now.getMonth() + 1);
  const anioRoman = toRoman(now.getFullYear());

  return (
    <div className="text-center pt-6 pb-9 border-b-[3px] border-double border-inv-ink mb-10 inv-anim-cover">
      <div className="font-cormorant text-[14px] text-inv-ocre tracking-[4px] mb-1.5">
        PLIEGO {pliegoNum} · {anioRoman}
      </div>
      <h1 className="font-cormorant text-[64px] font-medium leading-none mb-3 tracking-[-1px] text-inv-ink">
        <em>Investigaciones</em>
      </h1>
      <p className="font-cormorant italic text-[19px] text-inv-ink-2 max-w-[640px] mx-auto leading-[1.45] mb-6">
        Memorias, artículos doctrinales y comentarios de los juristas de
        Studio IURIS. Publicación abierta con sistema de citación interna y
        métricas reputacionales.
      </p>
      <div className="flex gap-3.5 justify-center flex-wrap">
        <Link
          href="/dashboard/diario/investigaciones/nueva"
          className="inline-block bg-inv-ink text-inv-paper font-crimson-pro text-[14px] px-7 py-3 tracking-[1px] cursor-pointer transition-colors border border-inv-ink hover:bg-inv-ocre hover:border-inv-ocre"
        >
          Enviar a la imprenta
        </Link>
        <button
          type="button"
          className="inline-block bg-transparent text-inv-ink font-crimson-pro text-[14px] px-7 py-3 tracking-[1px] cursor-pointer border border-inv-ink hover:bg-inv-ink hover:text-inv-paper transition-colors"
        >
          Cómo se cita
        </button>
      </div>
    </div>
  );
}
