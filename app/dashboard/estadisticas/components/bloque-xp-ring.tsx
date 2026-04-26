"use client";

import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/estadisticas-chart-config";

interface BloqueXpRingProps {
  competencias: Array<{
    libro: string;
    label: string;
    score: number;
    fcDom: number;
    fcTotal: number;
    mcqCorrect: number;
    mcqTotal: number;
    vfCorrect: number;
    vfTotal: number;
  }>;
  xpTotal: number;
}

// Paleta editorial extendida para libros (gold/burgundy/navy/sage/ink + variaciones)
const PALETTE = [
  CHART_COLORS.gold,
  CHART_COLORS.burgundy,
  CHART_COLORS.navy,
  CHART_COLORS.sage,
  "#c49a50", // gold bright
  "#8a3d4a", // burgundy soft
  "#3a4a72", // navy soft
  "#5a7a55", // sage soft
  "#9a7230", // gold otra
  "#6b1d2a",
  "#1e4080",
];

interface RingTooltipPayload {
  payload: {
    label: string;
    score: number;
    intentos: number;
    color: string;
  };
}

function RingTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: RingTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gz-navy text-white p-3 rounded-[3px] shadow-lg font-archivo text-[12px] min-w-[180px]">
      <p className="mb-1.5 font-semibold flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: d.color }}
        />
        {d.label}
      </p>
      <p style={{ color: CHART_COLORS.goldBright }}>
        Dominio: {d.score}%
      </p>
      <p>
        <span className="opacity-70">Intentos:</span> {d.intentos}
      </p>
    </div>
  );
}

export function BloqueXpRing({ competencias, xpTotal }: BloqueXpRingProps) {
  const ranked = [...competencias]
    .filter((c) => c.score > 0 || c.mcqTotal + c.vfTotal + c.fcTotal > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8); // top 8 libros

  const data = ranked.map((c, i) => ({
    label: c.label.length > 28 ? c.label.slice(0, 26) + "…" : c.label,
    fullLabel: c.label,
    score: c.score,
    intentos: c.mcqTotal + c.vfTotal,
    color: PALETTE[i % PALETTE.length],
  }));

  const isEmpty = data.length === 0;
  const promedio =
    data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.score, 0) / data.length)
      : 0;

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      {/* Rail superior */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-gold to-gz-burgundy" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Composición de dominio
          </p>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
          Top 8 libros
        </span>
      </div>

      <div className="p-5">
        {isEmpty ? (
          <p className="italic text-gz-ink-light font-archivo text-[13px] text-center py-12">
            Aún no hay dominio medible. Completa flashcards y MCQ en distintos
            libros para ver tu composición.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr] gap-5 items-center">
            {/* Radial chart */}
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart
                  data={data}
                  innerRadius="25%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  cx="50%"
                  cy="50%"
                  barSize={11}
                >
                  <RadialBar
                    background={{ fill: CHART_COLORS.creamDark }}
                    dataKey="score"
                    cornerRadius={4}
                  />
                  <Tooltip content={<RingTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
              {/* Centro: XP total + promedio dominio */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="font-ibm-mono text-[8px] uppercase tracking-[2px] text-gz-ink-light leading-none">
                  XP total
                </p>
                <p className="font-cormorant text-[28px] font-bold text-gz-gold leading-none">
                  {xpTotal.toLocaleString("es-CL")}
                </p>
                <p className="font-ibm-mono text-[9px] text-gz-ink-mid mt-1">
                  prom. {promedio}%
                </p>
              </div>
            </div>

            {/* Leyenda lateral */}
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
              {data.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-gz-cream-dark/40 last:border-b-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="font-archivo text-[11px] text-gz-ink truncate">
                      {d.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-12 h-1 rounded-full bg-gz-cream-dark overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, d.score)}%`,
                          backgroundColor: d.color,
                        }}
                      />
                    </div>
                    <span
                      className="font-ibm-mono text-[10px] font-semibold w-8 text-right tabular-nums"
                      style={{ color: d.color }}
                    >
                      {d.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
