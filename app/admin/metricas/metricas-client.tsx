"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface MetricsData {
  studyChart: { date: string; flashcards: number; mcq: number; vf: number }[];
  competitionChart: { date: string; causas: number }[];
  accuracy: { mcq: number; mcqTotal: number; tf: number; tfTotal: number };
  topUsers: {
    id: string;
    firstName: string;
    lastName: string;
    xp: number;
    avatarUrl: string | null;
  }[];
  retention: { thisWeek: number; lastWeek: number };
}

const PERIOD_OPTIONS = [
  { value: 7, label: "7 días" },
  { value: 14, label: "14 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
];

export function MetricasClient() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/metrics?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy font-display italic">Métricas</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-navy/5" />
          ))}
        </div>
      </div>
    );
  }

  const retentionChange =
    data.retention.lastWeek > 0
      ? Math.round(
          ((data.retention.thisWeek - data.retention.lastWeek) /
            data.retention.lastWeek) *
            100
        )
      : 0;

  const fmtDate = (v: string) => {
    const d = new Date(v);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy font-display italic">
          Métricas
        </h1>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                days === opt.value
                  ? "bg-gold text-white"
                  : "text-navy/60 hover:text-navy"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Precisión MCQ</p>
          <p className="mt-1 text-2xl font-bold text-navy">{data.accuracy.mcq}%</p>
          <p className="text-[10px] text-navy/40">
            {data.accuracy.mcqTotal.toLocaleString("es-CL")} intentos
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Precisión V/F</p>
          <p className="mt-1 text-2xl font-bold text-navy">{data.accuracy.tf}%</p>
          <p className="text-[10px] text-navy/40">
            {data.accuracy.tfTotal.toLocaleString("es-CL")} intentos
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Usuarios activos (7d)</p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {data.retention.thisWeek}
          </p>
          <p
            className={`text-[10px] font-medium ${
              retentionChange >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {retentionChange >= 0 ? "+" : ""}
            {retentionChange}% vs semana anterior
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs text-navy/50">Sem. anterior</p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {data.retention.lastWeek}
          </p>
          <p className="text-[10px] text-navy/40">usuarios activos</p>
        </div>
      </div>

      {/* ── Study Activity Chart ───────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          Actividad de estudio
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.studyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,36,22,0.08)" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
              />
              <YAxis
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(v) =>
                  new Date(String(v)).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                  })
                }
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid rgba(44,36,22,0.12)",
                  fontSize: "13px",
                }}
              />
              <Legend />
              <Bar
                dataKey="flashcards"
                name="Flashcards"
                fill="#8B4513"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="mcq"
                name="MCQ"
                fill="#C9A84C"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="vf"
                name="V/F"
                fill="#2C2416"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Causas Chart ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          Causas creadas
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.competitionChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,36,22,0.08)" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
              />
              <YAxis
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(v) =>
                  new Date(String(v)).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                  })
                }
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid rgba(44,36,22,0.12)",
                  fontSize: "13px",
                }}
              />
              <Line
                type="monotone"
                dataKey="causas"
                stroke="#C9A84C"
                strokeWidth={2}
                dot={{ r: 3, fill: "#C9A84C" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Top 10 Users ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          Top 10 por XP
        </h2>
        <ul className="divide-y divide-border">
          {data.topUsers.map((u, i) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5">
              <span className="w-6 text-right text-sm font-bold text-navy/40">
                {i + 1}
              </span>
              {u.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                  {u.firstName[0]?.toUpperCase()}
                </span>
              )}
              <span className="flex-1 text-sm font-medium text-navy">
                {u.firstName} {u.lastName}
              </span>
              <span className="text-sm font-mono text-navy/60">
                {u.xp.toLocaleString("es-CL")} XP
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
