"use client";

import { useMemo } from "react";


interface BloqueActividadProps {
  dias: Array<{
    date: string;
    count: number;
    detalle: { fc: number; mcq: number; vf: number; sim: number };
  }>;
  mejorRacha: number;
  diaMasActivo: string;
}

const DAY_LABELS = ["Lun", "", "Mie", "", "Vie", "", ""];

function getOpacity(count: number): number {
  if (count === 0) return 0.06;
  if (count <= 5) return 0.15;
  if (count <= 15) return 0.35;
  if (count <= 30) return 0.6;
  return 1;
}

export function BloqueActividad({
  dias,
  mejorRacha,
  diaMasActivo,
}: BloqueActividadProps) {
  // Build 7 rows x 13 columns grid from the 90-day array
  const grid = useMemo(() => {
    // Pad/trim to exactly 91 days (13 weeks) for a clean grid
    const padded = [...dias];
    if (padded.length === 0) {
      return Array.from({ length: 7 }, () =>
        Array.from({ length: 13 }, () => ({
          date: "",
          count: 0,
          detalle: { fc: 0, mcq: 0, vf: 0, sim: 0 },
        }))
      );
    }

    // Find what day of week the first entry is (0=Mon, 6=Sun in ISO)
    const firstDate = new Date(padded[0].date);
    const firstDow = (firstDate.getDay() + 6) % 7; // Convert Sun=0 to Mon=0

    // Prepend empty days to align to Monday start
    const emptyDay = { date: "", count: 0, detalle: { fc: 0, mcq: 0, vf: 0, sim: 0 } };
    const aligned = [
      ...Array.from({ length: firstDow }, () => emptyDay),
      ...padded,
    ];

    // Pad to fill last column
    const totalCells = 7 * 13;
    while (aligned.length < totalCells) {
      aligned.push(emptyDay);
    }

    // Build rows (7 rows, one per day of week)
    const rows: typeof padded[] = Array.from({ length: 7 }, () => []);
    for (let col = 0; col < 13; col++) {
      for (let row = 0; row < 7; row++) {
        const idx = col * 7 + row;
        rows[row].push(aligned[idx] || emptyDay);
      }
    }

    return rows;
  }, [dias]);

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-gold/40 via-gz-gold to-gz-burgundy" />
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Actividad · últimos 90 días
          </p>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
          Heatmap
        </span>
      </div>

      <div className="p-5">

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: "24px repeat(13, 1fr)",
            gridTemplateRows: "repeat(7, 1fr)",
          }}
        >
          {grid.map((row, rowIdx) => (
            <>
              {/* Day label */}
              <div
                key={`label-${rowIdx}`}
                className="font-ibm-mono text-[9px] text-gz-ink-light flex items-center justify-end pr-1"
              >
                {DAY_LABELS[rowIdx]}
              </div>
              {/* Cells */}
              {row.map((day, colIdx) => (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  className="w-full aspect-square rounded-[2px]"
                  style={{
                    backgroundColor: `rgba(154, 114, 48, ${getOpacity(day.count)})`,
                  }}
                  title={
                    day.date
                      ? `${day.date}: ${day.count} actividades`
                      : undefined
                  }
                />
              ))}
            </>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 justify-center font-ibm-mono text-[11px] text-gz-ink-mid">
        <span>Mejor racha: {mejorRacha} dias</span>
        <span>Dia mas activo: {diaMasActivo}</span>
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-1.5 mt-3 font-ibm-mono text-[9px] text-gz-ink-light">
        <span className="mr-1">Menos</span>
        {[0.06, 0.15, 0.35, 0.6, 1].map((opacity) => (
          <div
            key={opacity}
            className="w-3 h-3 rounded-[2px]"
            style={{
              backgroundColor: `rgba(154, 114, 48, ${opacity})`,
            }}
          />
        ))}
        <span className="ml-1">Más</span>
      </div>
      </div>
    </section>
  );
}
