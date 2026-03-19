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
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px]">&#9997;&#65039;</span>
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
          Top Autores
        </p>
      </div>

      {/* Periodo toggle */}
      <div className="mb-3 flex gap-0.5 rounded-[3px] border border-gz-rule p-0.5">
        {(["semana", "mes", "todo"] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`flex-1 rounded-[2px] px-1 py-1 font-ibm-mono text-[9px] font-semibold transition-colors ${
              periodo === p
                ? "bg-gz-gold/[0.1] text-gz-ink"
                : "text-gz-ink-light hover:text-gz-ink"
            }`}
          >
            {p === "semana" ? "Sem" : p === "mes" ? "Mes" : "Todo"}
          </button>
        ))}
      </div>

      <div className="h-px bg-gz-rule mb-3" />

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-gz-cream-dark" />
          ))}
        </div>
      )}

      {/* Ranking list */}
      {!loading && data && data.ranking.length > 0 && (
        <div className="space-y-2.5">
          {data.ranking.map((entry, i) => (
            <div key={entry.userId} className="flex items-center gap-2.5">
              {/* Position */}
              <span
                className={`font-cormorant text-[17px] !font-bold w-4 text-right shrink-0 ${
                  i === 0
                    ? "text-gz-gold"
                    : i === 1
                    ? "text-gz-ink-mid"
                    : i === 2
                    ? "text-[#b87333]"
                    : "text-gz-ink-light"
                }`}
              >
                {i + 1}
              </span>

              {/* Avatar */}
              {entry.avatarUrl ? (
                <Image
                  src={entry.avatarUrl}
                  alt=""
                  width={26}
                  height={26}
                  className="h-[26px] w-[26px] rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-[26px] w-[26px] rounded-full bg-gz-cream-dark flex items-center justify-center font-archivo text-[9px] font-bold text-gz-ink-mid shrink-0">
                  {entry.firstName[0]}
                </div>
              )}

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-archivo text-[12px] font-medium text-gz-ink truncate">
                  {entry.firstName} {entry.lastName.charAt(0)}.
                </p>
                <p className="font-ibm-mono text-[8px] text-gz-ink-light truncate">
                  {entry.gradoEmoji} Grado {entry.grado}
                </p>
              </div>

              {/* Score */}
              <span className="font-ibm-mono text-[11px] font-medium text-gz-gold shrink-0">
                {Math.round(entry.score)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && data && data.ranking.length === 0 && (
        <p className="font-cormorant italic text-[13px] text-gz-ink-light">
          Sin actividad en este periodo
        </p>
      )}

      {/* My position */}
      {!loading && data?.miPosicion && (
        <div className="mt-3 pt-2.5 border-t border-gz-rule">
          <p className="font-ibm-mono text-[10px] text-gz-ink-mid">
            Tu posicion: <span className="font-semibold text-gz-gold">#{data.miPosicion}</span>
            <span className="ml-1 text-gz-ink-light">
              de {data.total}
            </span>
          </p>
        </div>
      )}

      {/* Link */}
      <Link
        href="/dashboard/diario/ranking"
        className="mt-3 block font-archivo text-[11px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
      >
        Ver ranking completo &rarr;
      </Link>
    </div>
  );
}
