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

interface LigasData {
  currentWeek: {
    weekStart: string;
    weekEnd: string;
  } | null;
  tiers: TierInfo[];
  history: LeagueHistoryItem[];
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

export function LigasClient() {
  const [data, setData] = useState<LigasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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
