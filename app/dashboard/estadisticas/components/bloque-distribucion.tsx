"use client";

import { MODULE_COLORS } from "@/lib/estadisticas-chart-config";

interface BloqueDistribucionProps {
  distribucion: Array<{
    modulo: string;
    cantidad: number;
    porcentaje: number;
  }>;
  totalItems: number;
}

export function BloqueDistribucion({
  distribucion,
  totalItems,
}: BloqueDistribucionProps) {
  const sorted = [...distribucion].sort((a, b) => b.cantidad - a.cantidad);
  const maxCantidad = Math.max(...sorted.map((d) => d.cantidad), 1);

  return (
    <div className="bg-white border border-gz-rule rounded-[4px] p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light font-medium">
            Distribución de actividad
          </h3>
          <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-[2px]">
            Por módulo
          </span>
        </div>
        <div className="h-px bg-gz-rule" />
      </div>

      {totalItems === 0 ? (
        <p className="italic text-gz-ink-light font-archivo text-[13px] text-center py-8">
          Aún no hay actividad registrada en este período.
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((d) => {
            const barWidth = (d.cantidad / maxCantidad) * 100;
            const color = MODULE_COLORS[d.modulo] || "#9a7230";

            return (
              <div key={d.modulo}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-[2px]"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-archivo text-[13px] font-medium text-gz-ink">
                      {d.modulo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-ibm-mono text-[11px] text-gz-ink-mid">
                      {d.cantidad}
                    </span>
                    <span className="font-ibm-mono text-[10px] text-gz-ink-light w-10 text-right">
                      {d.porcentaje}%
                    </span>
                  </div>
                </div>
                <div className="h-[6px] bg-gz-cream-dark rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="border-t border-gz-cream-dark pt-2 mt-3">
            <p className="font-ibm-mono text-[11px] text-gz-ink-mid text-center">
              Total: {totalItems} actividades en el período
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
