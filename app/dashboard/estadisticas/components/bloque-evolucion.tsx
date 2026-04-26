"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/lib/estadisticas-chart-config";

interface BloqueEvolucionProps {
  evolucion: Array<{
    semana: string;
    tasa: number;
    intentos: number;
    flashcards: number;
  }>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    payload: { semana: string; tasa: number; intentos: number; flashcards: number };
  }>;
  label?: string;
}

function EvolucionTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-gz-navy text-white p-3 rounded-[3px] shadow-lg font-archivo text-[12px]">
      <p className="mb-1 opacity-80">Semana del {data.semana}</p>
      <p style={{ color: CHART_COLORS.goldBright }}>Tasa: {data.tasa}%</p>
      <p className="text-white">Flashcards: {data.flashcards}</p>
      <p className="text-white/60">Intentos: {data.intentos}</p>
    </div>
  );
}

export function BloqueEvolucion({ evolucion }: BloqueEvolucionProps) {
  const isEmpty =
    !evolucion ||
    evolucion.length === 0 ||
    evolucion.every((e) => e.intentos === 0);

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-gold to-gz-navy" />
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-navy" />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Evolución de rendimiento
          </p>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
          Tasa semanal
        </span>
      </div>

      <div className="p-5">

      {isEmpty ? (
        <p className="italic text-gz-ink-light font-archivo text-[13px] text-center py-8">
          Aun no hay datos de rendimiento. Completa ejercicios durante varias
          semanas para ver tu evolucion.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={evolucion}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                stroke={CHART_COLORS.creamDark}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="semana"
                tick={{ fontSize: 10, fill: CHART_COLORS.inkLight }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.rule }}
              />
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: CHART_COLORS.inkLight }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.rule }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: CHART_COLORS.inkLight }}
                tickLine={false}
                axisLine={{ stroke: CHART_COLORS.rule }}
              />
              <Tooltip content={<EvolucionTooltip />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="tasa"
                stroke={CHART_COLORS.gold}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.gold, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CHART_COLORS.goldBright }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="flashcards"
                stroke={CHART_COLORS.navy}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-3 font-archivo text-[11px] text-gz-ink-mid">
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-[2px]"
                style={{ backgroundColor: CHART_COLORS.gold }}
              />
              <span>Tasa de acierto</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-[2px]"
                style={{
                  backgroundColor: CHART_COLORS.navy,
                  backgroundImage:
                    "repeating-linear-gradient(90deg, transparent, transparent 4px, white 4px, white 6px)",
                }}
              />
              <span>Flashcards revisadas</span>
            </div>
          </div>
        </>
      )}
      </div>
    </section>
  );
}
