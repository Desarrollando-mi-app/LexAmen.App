"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS } from "@/lib/estadisticas-chart-config";

interface BloqueRamasComparadoProps {
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
}

// Mapeo libro → rama jurídica
function libroRama(libro: string): "civil" | "procesal" | "organico" | "otro" {
  if (libro.startsWith("LIBRO_") && libro.endsWith("_CPC")) return "procesal";
  if (libro.startsWith("LIBRO_I_CPC") || libro.startsWith("LIBRO_II_CPC") ||
      libro.startsWith("LIBRO_III_CPC") || libro.startsWith("LIBRO_IV_CPC")) return "procesal";
  if (libro === "TITULO_PRELIMINAR" || libro === "TITULO_FINAL" ||
      libro === "MENSAJE" || libro.startsWith("LIBRO_I") ||
      libro.startsWith("LIBRO_II") || libro.startsWith("LIBRO_III") ||
      libro.startsWith("LIBRO_IV")) return "civil";
  return "organico";
}

const RAMA_COLORS = {
  civil: CHART_COLORS.gold,
  procesal: CHART_COLORS.navy,
  organico: CHART_COLORS.sage,
} as const;

const RAMA_LABEL = {
  civil: "Civil",
  procesal: "Procesal",
  organico: "Orgánico",
} as const;

interface RamaTooltipPayload {
  payload: {
    rama: string;
    intentos: number;
    correctos: number;
    tasa: number;
    color: string;
  };
}

function RamaTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: RamaTooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gz-navy text-white p-3 rounded-[3px] shadow-lg font-archivo text-[12px] min-w-[140px]">
      <p className="mb-1.5 font-semibold flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: d.color }}
        />
        {d.rama}
      </p>
      <p>
        <span className="opacity-70">Intentos:</span> {d.intentos}
      </p>
      <p>
        <span className="opacity-70">Correctos:</span> {d.correctos}
      </p>
      <p style={{ color: CHART_COLORS.goldBright }}>
        <span className="opacity-70 text-white">Acierto:</span> {d.tasa}%
      </p>
    </div>
  );
}

export function BloqueRamasComparado({
  competencias,
}: BloqueRamasComparadoProps) {
  // Agregar por rama
  type Acc = { intentos: number; correctos: number; flashcards: number; flashDom: number };
  const buckets: Record<"civil" | "procesal" | "organico", Acc> = {
    civil: { intentos: 0, correctos: 0, flashcards: 0, flashDom: 0 },
    procesal: { intentos: 0, correctos: 0, flashcards: 0, flashDom: 0 },
    organico: { intentos: 0, correctos: 0, flashcards: 0, flashDom: 0 },
  };

  for (const c of competencias) {
    const r = libroRama(c.libro);
    if (r === "otro") continue;
    buckets[r].intentos += c.mcqTotal + c.vfTotal;
    buckets[r].correctos += c.mcqCorrect + c.vfCorrect;
    buckets[r].flashcards += c.fcTotal;
    buckets[r].flashDom += c.fcDom;
  }

  const data = (Object.keys(buckets) as Array<keyof typeof buckets>).map((k) => {
    const b = buckets[k];
    const tasa = b.intentos > 0 ? Math.round((b.correctos / b.intentos) * 100) : 0;
    return {
      rama: RAMA_LABEL[k],
      intentos: b.intentos,
      correctos: b.correctos,
      tasa,
      flashcards: b.flashcards,
      flashDom: b.flashDom,
      color: RAMA_COLORS[k],
    };
  });

  const totalIntentos = data.reduce((s, d) => s + d.intentos, 0);
  const isEmpty = totalIntentos === 0;

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      {/* Rail superior */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-gold via-gz-navy to-gz-sage" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Rendimiento por rama
          </p>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
          Civil · Procesal · Orgánico
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        {isEmpty ? (
          <p className="italic text-gz-ink-light font-archivo text-[13px] text-center py-12">
            Aún no hay intentos suficientes para comparar entre ramas.
            <br />
            Completa MCQ y V/F en distintos libros para ver el desglose.
          </p>
        ) : (
          <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-center">
            {/* Composed chart */}
            <div className="min-h-[260px]">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart
                  data={data}
                  margin={{ top: 10, right: 16, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    stroke={CHART_COLORS.creamDark}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="rama"
                    tick={{ fontSize: 12, fill: CHART_COLORS.ink, fontFamily: "Cormorant Garamond, serif", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: CHART_COLORS.rule }}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: CHART_COLORS.inkLight }}
                    tickLine={false}
                    axisLine={{ stroke: CHART_COLORS.rule }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: CHART_COLORS.inkLight }}
                    tickLine={false}
                    axisLine={{ stroke: CHART_COLORS.rule }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip content={<RamaTooltip />} cursor={{ fill: "rgba(154,114,48,0.06)" }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, fontFamily: "Archivo, sans-serif", color: CHART_COLORS.inkMid }}
                    iconType="circle"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="intentos"
                    name="Intentos"
                    radius={[3, 3, 0, 0]}
                    barSize={42}
                  >
                    {data.map((d, i) => (
                      <Cell key={i} fill={d.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="tasa"
                    name="% Acierto"
                    stroke={CHART_COLORS.burgundy}
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: CHART_COLORS.burgundy, strokeWidth: 0 }}
                    activeDot={{ r: 7, fill: CHART_COLORS.burgundy }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Resumen lateral */}
            <div className="space-y-3">
              {data.map((d) => {
                const dominio =
                  d.flashcards > 0
                    ? Math.round((d.flashDom / d.flashcards) * 100)
                    : 0;
                return (
                  <div
                    key={d.rama}
                    className="rounded-[4px] border border-gz-rule/60 p-3 relative overflow-hidden"
                    style={{ borderLeft: `3px solid ${d.color}` }}
                  >
                    <p className="font-cormorant text-[16px] font-bold text-gz-ink leading-none mb-1">
                      {d.rama}
                    </p>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span
                        className="font-cormorant text-[22px] font-bold leading-none"
                        style={{ color: d.color }}
                      >
                        {d.tasa}%
                      </span>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                        acierto
                      </span>
                    </div>
                    <div className="font-ibm-mono text-[10px] text-gz-ink-mid space-y-0.5">
                      <p>
                        <span className="text-gz-ink-light">Intentos:</span>{" "}
                        {d.intentos.toLocaleString("es-CL")}
                      </p>
                      <p>
                        <span className="text-gz-ink-light">Correctos:</span>{" "}
                        {d.correctos.toLocaleString("es-CL")}
                      </p>
                      <p>
                        <span className="text-gz-ink-light">Flashcards:</span>{" "}
                        {d.flashDom}/{d.flashcards}{" "}
                        <span className="text-gz-ink-light/70">({dominio}% dom.)</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

