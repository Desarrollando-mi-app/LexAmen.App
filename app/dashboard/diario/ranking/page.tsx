"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { AutorStats } from "@/lib/diario-ranking";

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
  desglose: AutorStats;
  totalPublicaciones: number;
}

interface RankingResponse {
  ranking: RankingEntry[];
  total: number;
  miPosicion?: number;
  periodo: string;
}

// ─── Score desglose labels ──────────────────────────────────

const DESGLOSE_LABELS: { key: keyof AutorStats; label: string; pts: number }[] = [
  { key: "obiters", label: "Obiter Dictum", pts: 1 },
  { key: "miniAnalisis", label: "Mini Analisis", pts: 3 },
  { key: "analisisCompletos", label: "Analisis Completos", pts: 5 },
  { key: "ensayos", label: "Ensayos", pts: 8 },
  { key: "argumentosExpediente", label: "Argumentos Expediente", pts: 2 },
  { key: "debatesParticipados", label: "Debates Participados", pts: 5 },
  { key: "debatesGanados", label: "Debates Ganados", pts: 10 },
  { key: "apoyosRecibidos", label: "Apoyos Recibidos", pts: 0.5 },
  { key: "citasRecibidas", label: "Citas Recibidas", pts: 2 },
  { key: "mejorAnalisisSemana", label: "Mejor Analisis Semana", pts: 15 },
  { key: "mejorAlegatoExpediente", label: "Mejor Alegato Expediente", pts: 15 },
  { key: "reviewsCompletados", label: "Peer Reviews", pts: 1 },
];

const RAMAS = [
  { value: "", label: "Todas las ramas" },
  { value: "civil", label: "Civil" },
  { value: "penal", label: "Penal" },
  { value: "constitucional", label: "Constitucional" },
  { value: "laboral", label: "Laboral" },
  { value: "comercial", label: "Comercial" },
  { value: "administrativo", label: "Administrativo" },
  { value: "procesal", label: "Procesal" },
  { value: "tributario", label: "Tributario" },
  { value: "internacional", label: "Internacional" },
];

// ─── Component ──────────────────────────────────────────────

export default function RankingAutoresPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [rama, setRama] = useState("");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const limit = 20;

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodo,
        page: String(page),
        limit: String(limit),
      });
      if (rama) params.set("rama", rama);

      const res = await fetch(`/api/diario/ranking-autores?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json: RankingResponse = await res.json();
      setData(json);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [periodo, rama, page]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [periodo, rama]);

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <div className="mx-auto max-w-4xl">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Image
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            width={48}
            height={48}
            className="h-10 w-10"
          />
          <div>
            <h1 className="font-cormorant text-[32px] lg:text-[38px] !font-bold text-gz-ink leading-none">
              Ranking de Autores
            </h1>
            <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mt-1">
              Academia &middot; Studio Iuris
            </p>
          </div>
        </div>
        <div className="h-[2px] bg-gz-ink mt-3" />
        <div className="mt-[3px] h-px bg-gz-ink" />
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Periodo buttons */}
        <div className="flex gap-1 rounded-[4px] border border-gz-rule p-1">
          {(["semana", "mes", "todo"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`rounded-[3px] px-4 py-1.5 font-ibm-mono text-[11px] font-semibold transition-colors ${
                periodo === p
                  ? "border border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                  : "text-gz-ink-mid hover:text-gz-ink"
              }`}
            >
              {p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Todo"}
            </button>
          ))}
        </div>

        {/* Rama dropdown */}
        <select
          value={rama}
          onChange={(e) => setRama(e.target.value)}
          className="rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[12px] text-gz-ink"
        >
          {RAMAS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Mi posicion ── */}
      {data?.miPosicion && (
        <div className="mb-5 rounded-[3px] border border-gz-gold/30 bg-gz-gold/[0.04] px-4 py-3">
          <p className="font-ibm-mono text-[12px] text-gz-ink-mid">
            Tu posicion:{" "}
            <span className="font-bold text-gz-gold">#{data.miPosicion}</span>
            <span className="ml-2 text-gz-ink-light">
              de {data.total} autor{data.total !== 1 ? "es" : ""}
            </span>
          </p>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[64px] animate-pulse rounded-[4px] bg-gz-cream-dark" />
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {!loading && data && data.ranking.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gz-ink">
                <th className="py-2 text-left font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light w-10">
                  #
                </th>
                <th className="py-2 text-left font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
                  Autor
                </th>
                <th className="py-2 text-right font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
                  Score
                </th>
                <th className="py-2 text-right font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light hidden sm:table-cell">
                  Publicaciones
                </th>
                <th className="py-2 text-right font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light hidden md:table-cell">
                  Apoyos
                </th>
                <th className="py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gz-rule">
              {data.ranking.map((entry, i) => {
                const pos = (page - 1) * limit + i + 1;
                const isMe = data.miPosicion === pos;
                const isExpanded = expandedUser === entry.userId;

                return (
                  <tr key={entry.userId} className="group">
                    <td colSpan={6} className="p-0">
                      <div
                        className={`flex items-center gap-0 px-0 py-3 transition-colors ${
                          isMe ? "bg-gz-gold/[0.04]" : ""
                        }`}
                      >
                        {/* Position */}
                        <div className="w-10 shrink-0">
                          <span
                            className={`font-cormorant text-[20px] !font-bold ${
                              pos === 1
                                ? "text-gz-gold"
                                : pos === 2
                                ? "text-gz-ink-mid"
                                : pos === 3
                                ? "text-[#b87333]"
                                : "text-gz-ink-light"
                            }`}
                          >
                            {pos}
                          </span>
                        </div>

                        {/* Avatar + Name + Grado */}
                        <div className="flex flex-1 items-center gap-3 min-w-0">
                          {entry.avatarUrl ? (
                            <Image
                              src={entry.avatarUrl}
                              alt=""
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-gz-cream-dark flex items-center justify-center font-archivo text-[12px] font-bold text-gz-ink-mid shrink-0">
                              {entry.firstName[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-archivo text-[14px] font-semibold text-gz-ink truncate">
                              {entry.firstName} {entry.lastName}
                              {isMe && (
                                <span className="ml-2 font-ibm-mono text-[9px] font-normal text-gz-gold uppercase tracking-[1px]">
                                  Tu
                                </span>
                              )}
                            </p>
                            <p className="font-ibm-mono text-[10px] text-gz-ink-light truncate">
                              {entry.gradoEmoji} Grado {entry.grado} &middot; {entry.gradoNombre}
                            </p>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="shrink-0 text-right w-20">
                          <span className="font-ibm-mono text-[14px] font-bold text-gz-gold">
                            {Math.round(entry.score)}
                          </span>
                          <span className="font-ibm-mono text-[9px] text-gz-ink-light block">
                            pts
                          </span>
                        </div>

                        {/* Publicaciones */}
                        <div className="shrink-0 text-right w-20 hidden sm:block">
                          <span className="font-ibm-mono text-[13px] text-gz-ink">
                            {entry.totalPublicaciones}
                          </span>
                        </div>

                        {/* Apoyos */}
                        <div className="shrink-0 text-right w-16 hidden md:block">
                          <span className="font-ibm-mono text-[13px] text-gz-ink">
                            {entry.desglose.apoyosRecibidos}
                          </span>
                        </div>

                        {/* Expand button */}
                        <div className="w-8 shrink-0 text-center">
                          <button
                            onClick={() =>
                              setExpandedUser(isExpanded ? null : entry.userId)
                            }
                            className="text-gz-ink-light hover:text-gz-ink transition-colors p-1"
                            aria-label="Ver desglose"
                          >
                            <svg
                              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Expanded desglose */}
                      {isExpanded && (
                        <div className="px-10 pb-4">
                          <div className="rounded-[3px] border border-gz-rule bg-white p-4">
                            <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-3">
                              Desglose de puntuacion
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
                              {DESGLOSE_LABELS.map((item) => {
                                const val = entry.desglose[item.key];
                                if (val === 0) return null;
                                return (
                                  <div key={item.key} className="flex items-center justify-between gap-2">
                                    <span className="font-archivo text-[12px] text-gz-ink-mid">
                                      {item.label}
                                    </span>
                                    <span className="font-ibm-mono text-[11px] text-gz-ink font-medium">
                                      {val}{" "}
                                      <span className="text-gz-ink-light text-[9px]">
                                        ({Math.round(val * item.pts)} pts)
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-[3px] px-3 py-1.5 font-archivo text-[12px] text-gz-ink-mid hover:text-gz-ink disabled:opacity-30 transition-colors"
              >
                &larr; Anterior
              </button>
              <span className="font-ibm-mono text-[11px] text-gz-ink-light">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-[3px] px-3 py-1.5 font-archivo text-[12px] text-gz-ink-mid hover:text-gz-ink disabled:opacity-30 transition-colors"
              >
                Siguiente &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.ranking.length === 0 && (
        <div className="py-16 text-center">
          <p className="font-cormorant text-[20px] italic text-gz-ink-light">
            Sin autores en este periodo
          </p>
          <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
            Publica para aparecer en el ranking
          </p>
        </div>
      )}

      {/* ── Back link ── */}
      <div className="mt-8 pt-4 border-t border-gz-rule">
        <Link
          href="/dashboard/diario"
          className="font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
        >
          &larr; Volver a Publicaciones
        </Link>
      </div>
    </div>
  );
}
