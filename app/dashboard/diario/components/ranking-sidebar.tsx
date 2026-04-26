"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────────

type Periodo = "semana" | "mes" | "todo";

interface RankingEntry {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  grado: number;
  gradoEmoji: string;
  gradoNombre: string;
  score: number;
  totalPublicaciones: number;
}

interface RankingResponse {
  ranking: RankingEntry[];
  total: number;
  miPosicion?: number;
  periodo: string;
}

// ─── Component ──────────────────────────────────────────────

export function RankingSidebar() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/diario/ranking-autores?limit=5&periodo=${periodo}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error();
      const json: RankingResponse = await res.json();
      setData(json);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  return (
    <div className="rounded-[3px] border border-gz-rule bg-white overflow-hidden">
      {/* Rail superior gold */}
      <div className="h-[3px] bg-gz-gold" />

      <div className="p-4">
        {/* Header — kicker editorial */}
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-gold">
            Top autores del diario
          </span>
        </div>

        {/* Periodo toggle — pill editorial estilo estadísticas */}
        <div className="mb-3 inline-flex w-full rounded-full border border-gz-rule overflow-hidden bg-white">
          {(["semana", "mes", "todo"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`flex-1 font-ibm-mono text-[9px] uppercase tracking-[1.5px] px-2 py-1.5 transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                periodo === p
                  ? "bg-gz-navy text-white font-semibold"
                  : "text-gz-ink-mid hover:bg-gz-cream-dark/60 hover:text-gz-ink"
              }`}
            >
              {p === "semana" ? "Sem" : p === "mes" ? "Mes" : "Todo"}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="h-4 w-4 bg-gz-cream-dark rounded animate-pulse" />
                <div className="h-7 w-7 rounded-full bg-gz-cream-dark animate-pulse" />
                <div className="flex-1 h-3 rounded bg-gz-cream-dark animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Ranking list */}
        {!loading && data && data.ranking.length > 0 && (
          <ol className="space-y-2.5">
            {data.ranking.map((entry, i) => {
              // Top 3 con tratamiento especial — medalla editorial
              const medalColor =
                i === 0
                  ? "text-gz-gold"
                  : i === 1
                  ? "text-gz-ink-mid"
                  : i === 2
                  ? "text-[#b87333]"
                  : "text-gz-ink-light";

              return (
                <li key={entry.userId}>
                  <Link
                    href={`/dashboard/perfil/${entry.userId}`}
                    className="flex items-center gap-2.5 group cursor-pointer rounded-[2px] -mx-1 px-1 py-0.5 transition-colors hover:bg-gz-cream-dark/40"
                  >
                    {/* Numeral romano editorial */}
                    <span
                      className={`font-cormorant text-[18px] !font-bold leading-none w-5 text-right shrink-0 ${medalColor}`}
                    >
                      {i + 1}
                    </span>

                    {/* Avatar */}
                    {entry.avatarUrl ? (
                      <Image
                        src={entry.avatarUrl}
                        alt=""
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full object-cover shrink-0 ring-1 ring-gz-rule/60"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gz-cream-dark flex items-center justify-center font-archivo text-[10px] font-bold text-gz-ink-mid shrink-0 ring-1 ring-gz-rule/60">
                        {entry.firstName[0]}
                      </div>
                    )}

                    {/* Name + grado */}
                    <div className="flex-1 min-w-0">
                      <p className="font-archivo text-[12px] font-semibold text-gz-ink truncate leading-tight group-hover:text-gz-navy transition-colors">
                        {entry.firstName} {entry.lastName.charAt(0)}.
                      </p>
                      <p className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light truncate">
                        Grado {entry.grado}
                      </p>
                    </div>

                    {/* Score */}
                    <span className="font-ibm-mono text-[11px] font-bold text-gz-gold shrink-0 tabular-nums">
                      {Math.round(entry.score)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}

        {/* Empty */}
        {!loading && data && data.ranking.length === 0 && (
          <p className="font-cormorant italic text-[13px] text-gz-ink-light leading-relaxed">
            Sin actividad en este periodo.
          </p>
        )}

        {/* My position — destacado */}
        {!loading && data?.miPosicion && (
          <div className="mt-3 pt-2.5 border-t border-gz-rule/60 flex items-center justify-between">
            <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid">
              Tu posición
            </span>
            <span className="font-ibm-mono text-[10px] tabular-nums">
              <span className="font-bold text-gz-gold">#{data.miPosicion}</span>
              <span className="ml-1 text-gz-ink-light">/ {data.total}</span>
            </span>
          </div>
        )}

        {/* Link */}
        <Link
          href="/dashboard/diario/ranking"
          className="mt-3 block font-archivo text-[11px] font-semibold text-gz-gold border-b border-gz-gold/40 pb-0.5 transition-colors hover:text-gz-ink hover:border-gz-ink cursor-pointer"
        >
          Ver ranking completo →
        </Link>
      </div>
    </div>
  );
}
