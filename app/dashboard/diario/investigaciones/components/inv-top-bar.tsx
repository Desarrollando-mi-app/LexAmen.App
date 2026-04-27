// ─── InvTopBar — franja editorial latina ─────────────────────
//
// Decorativa. Aparece arriba del Pliego y del Detalle, dando al
// módulo el aire de revista impresa. La fecha de edición se calcula
// dinámicamente (mes actual en castellano + año en romanos).

import { toRoman } from "@/lib/investigaciones-constants";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function InvTopBar() {
  const now = new Date();
  const mes = MESES[now.getMonth()];
  const anioRoman = toRoman(now.getFullYear());

  return (
    <div className="bg-inv-ink text-inv-paper text-center py-2 px-4 font-crimson-pro italic text-[12px] tracking-[0.5px]">
      <em className="font-cormorant not-italic font-semibold tracking-[1px]">
        — Edición de {mes} · {anioRoman} —
      </em>
      &nbsp;·&nbsp; Studio IURIS &nbsp;·&nbsp;
      <em className="not-italic">Fiat iustitia, ruat caelum</em>
    </div>
  );
}
