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
} from "recharts";

interface KPIs {
  totalUsers: number;
  newUsersMonth: number;
  newUsersWeek: number;
  premiumUsers: number;
  activeUsersWeek: number;
  totalContent: number;
  totalFlashcards: number;
  totalMCQs: number;
  totalTrueFalse: number;
  totalCausas: number;
  totalCausaRooms: number;
  totalAyudantias: number;
  totalBadges: number;
  totalReports: number;
  pendingReports: number;
}

interface ActivityItem {
  id: string;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  adminName: string;
}

interface StatsData {
  kpis: KPIs;
  chartData: { date: string; registros: number }[];
  recentActivity: ActivityItem[];
}

const KPI_CARDS: {
  key: keyof KPIs;
  label: string;
  icon: string;
  color: string;
}[] = [
  { key: "totalUsers", label: "Usuarios totales", icon: "👥", color: "bg-blue-50 text-blue-700" },
  { key: "newUsersMonth", label: "Nuevos (30d)", icon: "📈", color: "bg-green-50 text-green-700" },
  { key: "activeUsersWeek", label: "Activos (7d)", icon: "🔥", color: "bg-orange-50 text-orange-700" },
  { key: "premiumUsers", label: "Premium", icon: "⭐", color: "bg-yellow-50 text-yellow-700" },
  { key: "totalContent", label: "Contenido total", icon: "📚", color: "bg-purple-50 text-purple-700" },
  { key: "totalCausas", label: "Causas jugadas", icon: "⚔️", color: "bg-red-50 text-red-700" },
  { key: "totalAyudantias", label: "Ayudantías activas", icon: "🎓", color: "bg-teal-50 text-teal-700" },
  { key: "pendingReports", label: "Reportes pendientes", icon: "🚩", color: "bg-rose-50 text-rose-700" },
];

export function ResumenClient() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy font-display italic">Resumen</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-navy/5"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-navy/5" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-navy/60 py-12">
        Error al cargar estadísticas
      </p>
    );
  }

  const { kpis, chartData, recentActivity } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy font-display italic">
        Resumen
      </h1>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-border bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm ${card.color}`}
              >
                {card.icon}
              </span>
              <span className="text-xs font-medium text-navy/60">
                {card.label}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-navy font-display">
              {kpis[card.key]?.toLocaleString("es-CL")}
            </p>
          </div>
        ))}
      </div>

      {/* ── Registrations Chart ────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          Registros últimos 30 días
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(44,36,22,0.08)" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => {
                  const d = new Date(String(v));
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
              />
              <YAxis
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={(v) => {
                  const d = new Date(String(v));
                  return d.toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                  });
                }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid rgba(44,36,22,0.12)",
                  fontSize: "13px",
                }}
              />
              <Line
                type="monotone"
                dataKey="registros"
                stroke="#8B4513"
                strokeWidth={2}
                dot={{ r: 3, fill: "#8B4513" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Content Breakdown ──────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-sm font-medium text-navy/60">Flashcards</p>
          <p className="mt-1 text-xl font-bold text-navy">
            {kpis.totalFlashcards.toLocaleString("es-CL")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-sm font-medium text-navy/60">MCQs</p>
          <p className="mt-1 text-xl font-bold text-navy">
            {kpis.totalMCQs.toLocaleString("es-CL")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-sm font-medium text-navy/60">V/F</p>
          <p className="mt-1 text-xl font-bold text-navy">
            {kpis.totalTrueFalse.toLocaleString("es-CL")}
          </p>
        </div>
      </div>

      {/* ── Recent Activity ────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          Actividad reciente
        </h2>
        {recentActivity.length === 0 ? (
          <p className="py-8 text-center text-sm text-navy/40">
            Sin actividad registrada aún
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy">
                    {item.action}
                    {item.target && (
                      <span className="text-navy/50"> → {item.target}</span>
                    )}
                  </p>
                  <p className="text-xs text-navy/40">
                    {item.adminName} ·{" "}
                    {new Date(item.createdAt).toLocaleString("es-CL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
