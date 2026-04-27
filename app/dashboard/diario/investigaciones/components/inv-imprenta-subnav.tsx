// ─── InvImprentaSubNav — sub-nav decorativo "III · Imprenta" ──
//
// Marca dónde está el usuario dentro del pilar Imprenta del Diario.
// No reemplaza la navegación del dashboard — vive como ornamento
// editorial dentro de la página de Investigaciones.

import Link from "next/link";

type Active =
  | "obiter"
  | "analisis"
  | "investigaciones"
  | "expediente"
  | "ensayos";

const SECCIONES: { key: Active; label: string; href: string }[] = [
  { key: "obiter", label: "Obiter Dictum", href: "/dashboard/diario" },
  {
    key: "analisis",
    label: "Análisis de fallos",
    href: "/dashboard/diario?tab=analisis",
  },
  {
    key: "investigaciones",
    label: "Investigaciones",
    href: "/dashboard/diario/investigaciones",
  },
  {
    key: "expediente",
    label: "Expediente Abierto",
    href: "/dashboard/diario?tab=expediente",
  },
  {
    key: "ensayos",
    label: "Ensayos",
    href: "/dashboard/diario?tab=ensayos",
  },
];

export function InvImprentaSubNav({ active }: { active: Active }) {
  return (
    <div className="bg-inv-paper-2 border-b border-inv-rule px-6 sm:px-10 py-3 text-center">
      <span className="font-cormorant italic text-[14px] text-inv-ink-3 mr-4 pr-4 border-r border-inv-rule">
        <span className="font-cormorant text-[12px] text-inv-ocre tracking-[1px] mr-1.5 not-italic">
          III ·
        </span>
        Imprenta
      </span>
      <span className="inline-flex flex-wrap items-center gap-0">
        {SECCIONES.map((s, i) => {
          const isActive = s.key === active;
          return (
            <Link
              key={s.key}
              href={s.href}
              className={`font-crimson-pro text-[12px] tracking-[1px] px-3 sm:px-4 py-1 transition-colors cursor-pointer ${
                i < SECCIONES.length - 1
                  ? "border-r border-inv-rule-2"
                  : ""
              } ${
                isActive
                  ? "text-inv-ink font-semibold italic"
                  : "text-inv-ink-3 hover:text-inv-ocre"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </span>
    </div>
  );
}
