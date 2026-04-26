"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_COLORS } from "@/lib/estadisticas-chart-config";

interface BloqueResumenProps {
  resumen: {
    xp: number;
    racha: number;
    tasaAcierto: number;
    diasActivos: number;
    tendencias: {
      tasaCambio: number;
      intentosCambio: number;
    };
    frase: string;
  };
  periodo: string;
  evolucion?: Array<{
    semana: string;
    tasa: number;
    intentos: number;
    flashcards: number;
  }>;
}

const PERIODO_LABEL: Record<string, string> = {
  "7d": "últimos 7 días",
  "30d": "últimos 30 días",
  "90d": "últimos 90 días",
  all: "todo el historial",
};

function TrendChip({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center font-ibm-mono text-[10px] uppercase tracking-[1px] px-2 py-0.5 rounded-full bg-gz-rule/30 text-gz-ink-light">
        — sin cambio
      </span>
    );
  }
  const isUp = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-ibm-mono text-[10px] uppercase tracking-[1px] px-2 py-0.5 rounded-full ${
        isUp
          ? "bg-gz-sage/15 text-gz-sage"
          : "bg-gz-burgundy/15 text-gz-burgundy"
      }`}
    >
      <span className="text-[12px] leading-none">{isUp ? "↗" : "↘"}</span>
      {Math.abs(value)}
      {suffix}
    </span>
  );
}

// Mini area chart (sparkline) — sin ejes, sin grid, solo curva.
function Sparkline({
  data,
  color,
  height = 40,
}: {
  data: { v: number }[];
  color: string;
  height?: number;
}) {
  if (data.length === 0) return null;
  return (
    <div style={{ width: "100%", height }} className="opacity-80">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={false}
            contentStyle={{
              background: CHART_COLORS.navy,
              color: "#fff",
              border: "none",
              borderRadius: 3,
              fontSize: 11,
              padding: "4px 8px",
            }}
            formatter={(value) => [String(value), ""]}
            labelFormatter={() => ""}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#spark-${color.replace("#", "")})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BloqueResumen({
  resumen,
  periodo,
  evolucion = [],
}: BloqueResumenProps) {
  // Sparkline data slices derivadas de evolución
  const sparkTasa = evolucion.map((e) => ({ v: e.tasa }));
  const sparkIntentos = evolucion.map((e) => ({ v: e.intentos }));
  const sparkFlash = evolucion.map((e) => ({ v: e.flashcards }));

  const stats = [
    {
      label: "XP Total",
      value: resumen.xp.toLocaleString("es-CL"),
      sub: "puntos de experiencia",
      spark: null as null | { v: number }[],
      sparkColor: CHART_COLORS.gold,
      trend: null as null | number,
      accent: CHART_COLORS.gold,
    },
    {
      label: "Racha",
      value: String(resumen.racha),
      sub: resumen.racha === 1 ? "día consecutivo" : "días consecutivos",
      spark: sparkFlash.length > 1 ? sparkFlash : null,
      sparkColor: CHART_COLORS.burgundy,
      trend: null,
      accent: CHART_COLORS.burgundy,
    },
    {
      label: "Tasa de Acierto",
      value: `${resumen.tasaAcierto}%`,
      sub: PERIODO_LABEL[periodo] ?? periodo,
      spark: sparkTasa.length > 1 ? sparkTasa : null,
      sparkColor: CHART_COLORS.gold,
      trend: resumen.tendencias.tasaCambio,
      accent: CHART_COLORS.gold,
    },
    {
      label: "Días Activos",
      value: String(resumen.diasActivos),
      sub: PERIODO_LABEL[periodo] ?? periodo,
      spark: sparkIntentos.length > 1 ? sparkIntentos : null,
      sparkColor: CHART_COLORS.navy,
      trend: null,
      accent: CHART_COLORS.navy,
    },
  ];

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      {/* Rail superior tricolor */}
      <div className="h-[4px] w-full bg-gradient-to-r from-gz-burgundy via-gz-gold to-gz-navy" />

      {/* Header editorial */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Resumen ejecutivo
          </p>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
          Vista general
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gz-rule/50">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-5 relative">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2 flex items-center gap-1.5">
              <span
                className="inline-block h-1 w-3 rounded-full"
                style={{ backgroundColor: s.accent }}
              />
              {s.label}
            </p>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p
                className="font-cormorant text-[40px] sm:text-[44px] leading-none font-bold"
                style={{ color: s.accent }}
              >
                {s.value}
              </p>
              {s.trend !== null && (
                <TrendChip value={s.trend} suffix="%" />
              )}
            </div>
            <p className="font-archivo text-[11px] text-gz-ink-mid">{s.sub}</p>
            {s.spark && (
              <div className="mt-3 -mx-1">
                <Sparkline data={s.spark} color={s.sparkColor} height={36} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Frase editorial */}
      <div className="px-5 py-4 border-t border-gz-rule/60 bg-gradient-to-b from-transparent to-gz-cream-dark/20">
        <p className="font-cormorant italic text-[16px] leading-relaxed text-gz-ink-mid text-center max-w-[640px] mx-auto">
          <span className="font-cormorant text-[28px] leading-[0.5] text-gz-gold/50 align-middle mr-1">
            &ldquo;
          </span>
          {resumen.frase}
          <span className="font-cormorant text-[28px] leading-[0.5] text-gz-gold/50 align-middle ml-1">
            &rdquo;
          </span>
        </p>
      </div>
    </section>
  );
}
