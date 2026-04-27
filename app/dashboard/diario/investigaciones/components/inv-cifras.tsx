// ─── InvCifras — 4 cifras clave del Pliego ──────────────────
//
// Cifra grande en romanos (decorativa) si arábigo > 0, con label
// arábigo abajo en italic. Si la cifra es pequeña (< 4 dígitos),
// también se muestra como romano grande. Para números muy grandes
// (≥ 4000), mostramos el arábigo grande y el romano cae a una
// versión simplificada.

import { toRoman } from "@/lib/investigaciones-constants";

type Cifra = { roman: string; valor: string; label: string };

function formatCifra(n: number, label: string, romanIdx: string): Cifra {
  // Numbers < 4000 muestran el romano grande arriba
  // Numbers >= 4000 muestran arábigo grande
  const showRoman = n > 0 && n < 4000;
  const valor = showRoman
    ? toRoman(n)
    : n.toLocaleString("es-CL");
  return {
    roman: romanIdx,
    valor,
    label: showRoman ? `${label} · ${n.toLocaleString("es-CL")}` : label,
  };
}

export function InvCifras({
  data,
}: {
  data: { trabajos: number; citaciones: number; autores: number; areas: number };
}) {
  const cifras: Cifra[] = [
    formatCifra(data.trabajos, "trabajos en imprenta", "I"),
    formatCifra(data.citaciones, "citaciones registradas", "II"),
    formatCifra(data.autores, "autores en pluma", "III"),
    formatCifra(data.areas, "áreas del derecho", "IV"),
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 border-y border-inv-ink py-5 mb-10 inv-anim-cifras">
      {cifras.map((c, i) => (
        <div
          key={i}
          className={`text-center px-4 ${
            i < cifras.length - 1
              ? "lg:border-r lg:border-inv-rule"
              : ""
          } ${
            i % 2 === 0 && i < cifras.length - 1
              ? "border-r border-inv-rule lg:border-r"
              : ""
          }`}
        >
          <div className="font-cormorant italic text-[14px] text-inv-ocre mb-1">
            {c.roman}
          </div>
          <div className="font-cormorant text-[38px] font-semibold leading-none text-inv-ink">
            {c.valor}
          </div>
          <div className="font-crimson-pro italic text-[12px] text-inv-ink-3 mt-1.5 tracking-[0.5px]">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
