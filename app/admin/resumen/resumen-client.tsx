"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────

interface DashboardData {
  usuarios: {
    total: number;
    hoy: number;
    semana: number;
    mes: number;
    activosHoy: number;
    activosSemana: number;
  };
  planes: { gratis: number; estudiante: number; pro: number };
  contenido: {
    flashcards: number;
    mcq: number;
    vf: number;
    definiciones: number;
    fillBlank: number;
    errorId: number;
    orderSeq: number;
    matchCol: number;
    casoPractico: number;
    dictado: number;
    timeline: number;
    totalEstudio: number;
  };
  publicaciones: {
    obiters: number;
    analisisMini: number;
    analisisCompleto: number;
    ensayos: number;
    argumentosExpediente: number;
    debates: number;
    total: number;
  };
  liga: {
    ligasActivas: number;
    gradoPromedio: number;
    topGrado: { userId: string; nombre: string; grado: number } | null;
  };
  pendientes: {
    noticiasPendientes: number;
    propuestasExpediente: number;
    debatesPorAvanzar: number;
  };
  registrosPorDia: { fecha: string; count: number }[];
  xpPorDia: { fecha: string; total: number }[];
  actividadReciente: {
    tipo: string;
    descripcion: string;
    userName: string;
    createdAt: string;
  }[];
}

// ── Helpers ────────────────────────────────────────────────

function fmtNum(n: number) {
  return n.toLocaleString("es-CL");
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

// ── Component ──────────────────────────────────────────────

export function ResumenClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy font-display italic">
          Resumen
        </h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-navy/5"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-navy/5" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl bg-navy/5" />
          <div className="h-64 animate-pulse rounded-xl bg-navy/5" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-navy/60 py-12">
        Error al cargar estadisticas
      </p>
    );
  }

  const {
    usuarios,
    planes,
    contenido,
    publicaciones,
    liga,
    pendientes,
    registrosPorDia,
    xpPorDia,
    actividadReciente,
  } = data;

  const totalPendientes =
    pendientes.noticiasPendientes +
    pendientes.propuestasExpediente +
    pendientes.debatesPorAvanzar;

  const retencion =
    usuarios.total > 0
      ? Math.round((usuarios.activosSemana / usuarios.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy font-display italic">
        Resumen
      </h1>

      {/* ── Top metric cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Usuarios"
          value={fmtNum(usuarios.total)}
          sub={`+${fmtNum(usuarios.hoy)} hoy`}
          accent="bg-blue-50 text-blue-700"
        />
        <MetricCard
          label="Activos Hoy"
          value={fmtNum(usuarios.activosHoy)}
          sub={`${fmtNum(usuarios.activosSemana)} esta semana`}
          accent="bg-green-50 text-green-700"
        />
        <MetricCard
          label="Retencion 7d"
          value={`${retencion}%`}
          sub={`${fmtNum(usuarios.activosSemana)} de ${fmtNum(usuarios.total)}`}
          accent="bg-amber-50 text-amber-700"
        />
        <MetricCard
          label="Planes Premium"
          value={fmtNum(planes.estudiante + planes.pro)}
          sub={`${fmtNum(planes.estudiante)} est. / ${fmtNum(planes.pro)} pro`}
          accent="bg-purple-50 text-purple-700"
        />
      </div>

      {/* ── Registration Chart ───────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          Registros - ultimos 30 dias
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={registrosPorDia}>
              <XAxis
                dataKey="fecha"
                tickFormatter={fmtDate}
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
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
                  fontFamily: "var(--font-archivo)",
                }}
              />
              <Bar
                dataKey="count"
                name="Registros"
                fill="#8B4513"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row: Pendientes + Actividad Reciente ─────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pendientes */}
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy font-display italic">
              Pendientes
            </h2>
            {totalPendientes > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                {totalPendientes}
              </span>
            )}
          </div>
          <ul className="space-y-3">
            <PendienteItem
              label="Noticias por aprobar"
              count={pendientes.noticiasPendientes}
              href="/admin/noticias"
            />
            <PendienteItem
              label="Propuestas expediente"
              count={pendientes.propuestasExpediente}
              href="/admin/expedientes"
            />
            <PendienteItem
              label="Debates por avanzar"
              count={pendientes.debatesPorAvanzar}
              href="/admin/debates"
            />
          </ul>
        </div>

        {/* Actividad Reciente */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
            Actividad Reciente
          </h2>
          {actividadReciente.length === 0 ? (
            <p className="py-8 text-center text-sm text-navy/40">
              Sin actividad registrada aun
            </p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {actividadReciente.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0"
                >
                  <span
                    className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                      item.tipo === "registro"
                        ? "bg-green-400"
                        : "bg-amber-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-navy truncate">
                      <span className="font-medium">{item.userName}</span>{" "}
                      <span className="text-navy/60">{item.descripcion}</span>
                    </p>
                    <p className="text-xs text-navy/40 font-mono">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Row: Contenido Estudio + Publicaciones ───────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Contenido Estudio */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
            Contenido de Estudio
          </h2>
          <div className="space-y-2">
            <CountRow label="Flashcards" value={contenido.flashcards} />
            <CountRow label="MCQ" value={contenido.mcq} />
            <CountRow label="Verdadero/Falso" value={contenido.vf} />
            <CountRow label="Definiciones" value={contenido.definiciones} />
            <CountRow label="Completar" value={contenido.fillBlank} />
            <CountRow label="Identificar Error" value={contenido.errorId} />
            <CountRow label="Ordenar Secuencia" value={contenido.orderSeq} />
            <CountRow label="Parear Columnas" value={contenido.matchCol} />
            <CountRow label="Caso Practico" value={contenido.casoPractico} />
            <CountRow label="Dictado" value={contenido.dictado} />
            <CountRow label="Linea de Tiempo" value={contenido.timeline} />
            <div className="border-t border-border pt-2 mt-2">
              <CountRow
                label="Total"
                value={contenido.totalEstudio}
                bold
              />
            </div>
          </div>
        </div>

        {/* Publicaciones */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
            Publicaciones
          </h2>
          <div className="space-y-2">
            <CountRow label="Obiters" value={publicaciones.obiters} />
            <CountRow
              label="Analisis Mini"
              value={publicaciones.analisisMini}
            />
            <CountRow
              label="Analisis Completo"
              value={publicaciones.analisisCompleto}
            />
            <CountRow label="Ensayos" value={publicaciones.ensayos} />
            <CountRow
              label="Args. Expediente"
              value={publicaciones.argumentosExpediente}
            />
            <CountRow label="Debates" value={publicaciones.debates} />
            <div className="border-t border-border pt-2 mt-2">
              <CountRow
                label="Total"
                value={publicaciones.total}
                bold
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Row: Liga + Planes ───────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Liga */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
            La Vida del Derecho
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy/60">Ligas activas</span>
              <span className="text-sm font-semibold text-navy font-mono">
                {fmtNum(liga.ligasActivas)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy/60">Grado promedio</span>
              <span className="text-sm font-semibold text-navy font-mono">
                {liga.gradoPromedio}
              </span>
            </div>
            {liga.topGrado && (
              <div className="rounded-lg bg-amber-50 p-3 mt-2">
                <p className="text-xs text-amber-700 font-medium mb-1">
                  Mayor grado
                </p>
                <p className="text-sm font-semibold text-navy">
                  {liga.topGrado.nombre}
                </p>
                <p className="text-xs text-navy/60 font-mono">
                  Grado {liga.topGrado.grado}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Planes */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
            Distribucion de Planes
          </h2>
          <div className="space-y-3">
            <PlanBar
              label="Gratis"
              count={planes.gratis}
              total={usuarios.total}
              color="bg-gray-400"
            />
            <PlanBar
              label="Estudiante"
              count={planes.estudiante}
              total={usuarios.total}
              color="bg-blue-500"
            />
            <PlanBar
              label="Pro"
              count={planes.pro}
              total={usuarios.total}
              color="bg-amber-500"
            />
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-navy/60">Conversion premium</span>
              <span className="font-semibold text-navy font-mono">
                {usuarios.total > 0
                  ? (
                      ((planes.estudiante + planes.pro) / usuarios.total) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── XP Chart ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          XP otorgado - ultimos 30 dias
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={xpPorDia}>
              <XAxis
                dataKey="fecha"
                tickFormatter={fmtDate}
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(44,36,22,0.4)"
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
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
                  fontFamily: "var(--font-archivo)",
                }}
              />
              <Bar
                dataKey="total"
                name="XP"
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs font-medium text-navy/60 mb-1">{label}</p>
      <p className="text-2xl font-bold text-navy font-display">{value}</p>
      <p className={`mt-1 text-xs font-medium rounded-md inline-block px-1.5 py-0.5 ${accent}`}>
        {sub}
      </p>
    </div>
  );
}

function CountRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-sm ${bold ? "font-semibold text-navy" : "text-navy/60"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm font-mono ${bold ? "font-bold text-navy" : "font-semibold text-navy"}`}
      >
        {fmtNum(value)}
      </span>
    </div>
  );
}

function PendienteItem({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-navy/5 transition-colors"
      >
        <span className="text-sm text-navy">{label}</span>
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${
            count > 0
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {count}
        </span>
      </a>
    </li>
  );
}

function PlanBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-navy/60">{label}</span>
        <span className="text-sm font-semibold text-navy font-mono">
          {fmtNum(count)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-navy/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
