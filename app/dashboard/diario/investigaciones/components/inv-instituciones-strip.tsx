// ─── InvInstitucionesStrip — top instituciones más estudiadas ──

import Link from "next/link";

export function InvInstitucionesStrip({
  instituciones,
}: {
  instituciones: {
    institucionId: number;
    nombre: string;
    grupo: string;
    trabajos: number;
    citas: number;
  }[];
}) {
  if (instituciones.length === 0) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 border border-inv-ink mb-12 bg-inv-paper">
      {instituciones.map((inst) => (
        <Link
          key={inst.institucionId}
          href={`/dashboard/diario/investigaciones?institucionId=${inst.institucionId}`}
          className="block p-5 border-r border-b border-inv-rule cursor-pointer hover:bg-inv-paper-2 transition-colors last:border-r-0"
        >
          <div className="font-cormorant text-[16px] font-medium mb-1 text-inv-ink">
            {inst.nombre}
          </div>
          <div className="font-crimson-pro italic text-[11px] text-inv-ink-3">
            {inst.trabajos}{" "}
            {inst.trabajos === 1 ? "trabajo" : "trabajos"} ·{" "}
            {inst.citas} {inst.citas === 1 ? "cita" : "citas"}
          </div>
        </Link>
      ))}
    </div>
  );
}
