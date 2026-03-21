"use client";

import { useEffect, useState, useCallback } from "react";

interface TierInfo {
  tier: string;
  memberCount: number;
  avgXp: number;
  topUser: { firstName: string; lastName: string; weeklyXp: number } | null;
}

interface LeagueHistoryItem {
  id: string;
  tier: string;
  weekStart: string;
  weekEnd: string;
  memberCount: number;
}

interface GradoDistribution {
  nivel: string;
  nivelLabel: string;
  count: number;
  percent: number;
}

interface TopUser {
  id: string;
  firstName: string;
  lastName: string;
  grado: number;
  xp: number;
}

interface LigasData {
  currentWeek: {
    weekStart: string;
    weekEnd: string;
  } | null;
  tiers: TierInfo[];
  history: LeagueHistoryItem[];
  gradoDistribution?: GradoDistribution[];
  topUsers?: TopUser[];
  gradoPromedio?: number;
}

const TIER_EMOJIS: Record<string, string> = {
  CARTON: "📦",
  HIERRO: "⛓️",
  BRONCE: "🥉",
  COBRE: "🪙",
  PLATA: "🥈",
  ORO: "🥇",
  DIAMANTE: "💎",
  PLATINO: "🏅",
  JURISCONSULTO: "⚖️",
};

const NIVEL_COLORS: Record<string, string> = {
  "LA ESCUELA": "bg-amber-400",
  "LA PRÁCTICA": "bg-orange-500",
  "EL ESTRADO": "bg-blue-600",
  "LA MAGISTRATURA": "bg-red-800",
  "EL CONSEJO": "bg-gray-900",
};

export function LigasClient() {
  const [data, setData] = useState<LigasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [gradoUserId, setGradoUserId] = useState("");
  const [newGrado, setNewGrado] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ligas");
      if (res.ok) setData(await res.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processWeek = async () => {
    if (!confirm("¿Procesar la semana actual? Esto asignará rangos y moverá usuarios entre ligas.")) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/ligas", { method: "POST" });
      if (res.ok) fetchData();
      else alert("Error al procesar semana");
    } catch {
      alert("Error de red");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-navy font-display italic">Ligas</h1>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-navy/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy font-display italic">
          Ligas
        </h1>
        <button
          onClick={processWeek}
          disabled={processing}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {processing ? "Procesando..." : "Procesar semana"}
        </button>
      </div>

      {/* ── Current Week Info ────────────────────────────── */}
      {data.currentWeek && (
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-sm text-navy/60">Semana actual</p>
          <p className="mt-1 text-lg font-bold text-navy">
            {new Date(data.currentWeek.weekStart).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
            })}{" "}
            →{" "}
            {new Date(data.currentWeek.weekEnd).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      )}

      {/* ── Tiers Grid ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.tiers.map((t) => (
          <div
            key={t.tier}
            className="rounded-xl border border-border bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{TIER_EMOJIS[t.tier] ?? "🏆"}</span>
              <h3 className="text-base font-bold text-navy">{t.tier}</h3>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-navy/50">Miembros</span>
                <span className="font-bold text-navy">{t.memberCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-navy/50">XP promedio</span>
                <span className="font-mono text-navy/70">
                  {Math.round(t.avgXp).toLocaleString("es-CL")}
                </span>
              </div>
              {t.topUser && (
                <div className="flex justify-between text-sm">
                  <span className="text-navy/50">Líder</span>
                  <span className="text-navy font-medium truncate max-w-[120px]">
                    {t.topUser.firstName} {t.topUser.lastName} ({t.topUser.weeklyXp} XP)
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Grade Distribution ─────────────────────────── */}
      {data.gradoDistribution && data.gradoDistribution.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-1 text-lg font-semibold text-navy font-display italic">
            Distribución de Grados
          </h2>
          {data.gradoPromedio !== undefined && (
            <p className="mb-4 text-sm text-navy/50">
              Grado promedio: <span className="font-bold text-navy">{data.gradoPromedio.toFixed(1)}</span>
            </p>
          )}
          <div className="space-y-3">
            {data.gradoDistribution.map((d) => (
              <div key={d.nivel} className="flex items-center gap-3">
                <span className="w-36 text-sm font-medium text-navy truncate">{d.nivelLabel}</span>
                <div className="flex-1 h-6 rounded bg-navy/5 overflow-hidden">
                  <div
                    className={`h-full rounded ${NIVEL_COLORS[d.nivelLabel] ?? "bg-navy/30"} transition-all`}
                    style={{ width: `${Math.max(d.percent, 2)}%` }}
                  />
                </div>
                <span className="w-20 text-right text-sm font-mono text-navy/60">
                  {d.count} ({d.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Users ──────────────────────────────────── */}
      {data.topUsers && data.topUsers.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
            Top Usuarios por Grado
          </h2>
          <div className="space-y-2">
            {data.topUsers.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 font-bold text-navy/40">{i + 1}.</span>
                <span className="font-medium text-navy">{u.firstName} {u.lastName}</span>
                <span className="rounded bg-gold/10 px-2 py-0.5 text-xs font-bold text-gold">G{u.grado}</span>
                <span className="ml-auto font-mono text-navy/50">{u.xp.toLocaleString("es-CL")} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Manual Grade Adjust ────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-navy font-display italic">
          Ajustar Grado Manual
        </h2>
        <p className="mb-4 text-xs text-navy/50">
          ⚠ Esto sobrescribe el grado calculado. Usar con precaución.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-navy/60 mb-1">User ID</label>
            <input
              type="text"
              value={gradoUserId}
              onChange={(e) => setGradoUserId(e.target.value)}
              placeholder="ID del usuario"
              className="rounded-lg border border-border px-3 py-2 text-sm text-navy w-64"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy/60 mb-1">Nuevo Grado (1-33)</label>
            <input
              type="number"
              min={1}
              max={33}
              value={newGrado}
              onChange={(e) => setNewGrado(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-navy w-24"
            />
          </div>
          <button
            disabled={!gradoUserId || !newGrado || adjusting}
            onClick={async () => {
              if (!confirm(`¿Cambiar grado del usuario a ${newGrado}?`)) return;
              setAdjusting(true);
              try {
                const res = await fetch(`/api/admin/users/${gradoUserId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ grado: parseInt(newGrado) }),
                });
                if (res.ok) {
                  alert("Grado actualizado");
                  setGradoUserId("");
                  setNewGrado("");
                  fetchData();
                } else {
                  const data = await res.json();
                  alert(data.error || "Error");
                }
              } catch {
                alert("Error de red");
              } finally {
                setAdjusting(false);
              }
            }}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50"
          >
            {adjusting ? "..." : "Aplicar"}
          </button>
        </div>
      </div>

      {/* ── History ──────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-navy font-display italic">
          Historial de ligas
        </h2>
        {data.history.length === 0 ? (
          <p className="py-8 text-center text-sm text-navy/40">
            Sin historial aún
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-navy/60">
                    Liga
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-navy/60">
                    Semana
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-navy/60">
                    Miembros
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.history.map((h) => (
                  <tr key={h.id} className="hover:bg-navy/[0.02]">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        {TIER_EMOJIS[h.tier] ?? "🏆"} {h.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-navy/60">
                      {new Date(h.weekStart).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      →{" "}
                      {new Date(h.weekEnd).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-3 py-2 font-mono text-navy/70">
                      {h.memberCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
