// ─── InvSparkline ──────────────────────────────────────────────
//
// Sparkline en SVG puro: muestra citas por mes en los últimos 12 meses.
// No requiere librería de charts. Eje Y implícito (escalado al máximo).
// Muestra el total bajo el sparkline y el rango temporal en pie.

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function formatMonth(yyyymm: string): string {
  // "2025-05" → "may 25"
  const [yearStr, monthStr] = yyyymm.split("-");
  const m = Number(monthStr) - 1;
  if (Number.isNaN(m) || m < 0 || m > 11) return yyyymm;
  const yy = yearStr.slice(2);
  return `${MESES_CORTOS[m]} ${yy}`;
}

export function InvSparkline({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((acc, d) => acc + d.count, 0);
  if (total === 0) {
    return (
      <div className="py-3 mb-4 border-b border-inv-rule-2 text-center font-cormorant italic text-[12px] text-inv-ink-3">
        Sin citas en los últimos 12 meses.
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 220;
  const h = 44;
  const stepX = data.length > 1 ? w / (data.length - 1) : w;

  const points = data
    .map((d, i) => {
      const x = i * stepX;
      const y = h - (d.count / max) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  // Área bajo la curva
  const areaPath = `M0,${h} L${points
    .split(" ")
    .map((p) => p)
    .join(" L")} L${(data.length - 1) * stepX},${h} Z`;

  const first = data[0]?.month;
  const last = data[data.length - 1]?.month;

  return (
    <div className="py-3 mb-4 border-b border-inv-rule-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-cormorant italic text-[11px] tracking-[1.5px] uppercase text-inv-ink-3">
          12 meses
        </span>
        <span className="font-cormorant text-[14px] tabular-nums text-inv-ink">
          {total} {total === 1 ? "cita" : "citas"}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        preserveAspectRatio="none"
        aria-label="Citas recibidas por mes"
        role="img"
      >
        <path d={areaPath} fill="currentColor" className="text-inv-ocre/15" />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-inv-ocre"
        />
        {data.map((d, i) => {
          if (d.count === 0) return null;
          const x = i * stepX;
          const y = h - (d.count / max) * (h - 4) - 2;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={1.6}
              fill="currentColor"
              className="text-inv-ocre"
            />
          );
        })}
      </svg>
      {first && last && (
        <div className="flex justify-between mt-1 font-cormorant italic text-[10px] text-inv-ink-4">
          <span>{formatMonth(first)}</span>
          <span>{formatMonth(last)}</span>
        </div>
      )}
    </div>
  );
}
