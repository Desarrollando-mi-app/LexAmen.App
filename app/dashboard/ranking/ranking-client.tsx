"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";

// ─── Types ────────────────────────────────────────────────

interface UniversidadRank {
  rank: number;
  universidad: string;
  studentCount: number;
  totalXp: number;
  avgXp: number;
}

interface SedeRank {
  rank: number;
  sede: string;
  studentCount: number;
  totalXp: number;
  avgXp: number;
}

interface UserRank {
  rank: number;
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  xp: number;
  universityYear: number | null;
  causasGanadas: number;
  tier: string | null;
}

interface MiPosicion {
  universidad: string | null;
  sede: string | null;
  rankInUniversidad: number | null;
  totalInUniversidad: number;
  rankInSede: number | null;
  totalInSede: number;
}

// ─── Component ────────────────────────────────────────────

export function RankingClient() {
  const [view, setView] = useState<"nacional" | "universidad" | "sede">("nacional");
  const [universidades, setUniversidades] = useState<UniversidadRank[]>([]);
  const [sedes, setSedes] = useState<SedeRank[]>([]);
  const [users, setUsers] = useState<UserRank[]>([]);
  const [miPosicion, setMiPosicion] = useState<MiPosicion | null>(null);
  const [selectedUniversidad, setSelectedUniversidad] = useState<string | null>(null);
  const [selectedSede, setSelectedSede] = useState<string | null>(null);
  const [expandedUniversidad, setExpandedUniversidad] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sedeLoading, setSedeLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch mi posicion
  useEffect(() => {
    fetch("/api/ranking/facultad/mi-posicion")
      .then((r) => r.json())
      .then((data) => setMiPosicion(data))
      .catch(() => {});
  }, []);

  // Fetch nacional
  useEffect(() => {
    setLoading(true);
    fetch("/api/ranking/facultad?view=nacional")
      .then((r) => r.json())
      .then((data) => {
        setUniversidades(data.items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch sedes for a university
  const fetchSedes = useCallback(async (universidad: string) => {
    setSedeLoading(true);
    try {
      const res = await fetch(
        `/api/ranking/facultad?view=universidad&u=${encodeURIComponent(universidad)}`
      );
      const data = await res.json();
      setSedes(data.items ?? []);
    } catch {
      setSedes([]);
    } finally {
      setSedeLoading(false);
    }
  }, []);

  // Fetch users for a sede
  const fetchUsers = useCallback(async (universidad: string, sede: string, p = 1) => {
    setUsersLoading(true);
    try {
      const res = await fetch(
        `/api/ranking/facultad?view=sede&u=${encodeURIComponent(universidad)}&s=${encodeURIComponent(sede)}&page=${p}`
      );
      const data = await res.json();
      setUsers(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Handle expand universidad
  function handleExpandUniversidad(universidad: string) {
    if (expandedUniversidad === universidad) {
      setExpandedUniversidad(null);
      setView("nacional");
      return;
    }
    setExpandedUniversidad(universidad);
    setSelectedUniversidad(universidad);
    setView("universidad");
    fetchSedes(universidad);
  }

  // Handle click sede
  function handleClickSede(universidad: string, sede: string) {
    setSelectedUniversidad(universidad);
    setSelectedSede(sede);
    setView("sede");
    fetchUsers(universidad, sede, 1);
  }

  // Back navigation
  function handleBackToNacional() {
    setView("nacional");
    setExpandedUniversidad(null);
    setSelectedUniversidad(null);
    setSelectedSede(null);
  }

  function handleBackToUniversidad() {
    if (selectedUniversidad) {
      setView("universidad");
      setSelectedSede(null);
      fetchSedes(selectedUniversidad);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={100} height={100} className="h-[80px] w-[80px] lg:h-[100px] lg:w-[100px]" />
          <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
            Ranking por Facultad
          </h1>
        </div>
        <p className="mt-1 text-sm text-navy/60">
          Descubre el ranking de universidades y estudiantes de Derecho
        </p>
      </div>

      {/* Mi Posicion Card */}
      {miPosicion && miPosicion.universidad && (
        <div className="mb-6 rounded-[4px] border border-gold/30 bg-gold/5 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">
            Tu posicion
          </h3>
          <div className="mt-2 flex flex-wrap gap-4">
            <div>
              <p className="text-sm text-navy/70">{miPosicion.universidad}</p>
              <p className="text-lg font-bold text-navy font-cormorant">
                #{miPosicion.rankInUniversidad}{" "}
                <span className="text-sm font-normal text-navy/50">
                  de {miPosicion.totalInUniversidad}
                </span>
              </p>
            </div>
            {miPosicion.sede && miPosicion.rankInSede && (
              <div className="border-l border-gold/20 pl-4">
                <p className="text-sm text-navy/70">Sede {miPosicion.sede}</p>
                <p className="text-lg font-bold text-navy font-cormorant">
                  #{miPosicion.rankInSede}{" "}
                  <span className="text-sm font-normal text-navy/50">
                    de {miPosicion.totalInSede}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {view !== "nacional" && (
        <div className="mb-4 flex items-center gap-2 text-sm text-navy/60">
          <button
            onClick={handleBackToNacional}
            className="hover:text-navy transition-colors"
          >
            Nacional
          </button>
          <span>/</span>
          {view === "universidad" && (
            <span className="text-navy font-medium">{selectedUniversidad}</span>
          )}
          {view === "sede" && (
            <>
              <button
                onClick={handleBackToUniversidad}
                className="hover:text-navy transition-colors"
              >
                {selectedUniversidad}
              </button>
              <span>/</span>
              <span className="text-navy font-medium">{selectedSede}</span>
            </>
          )}
        </div>
      )}

      {/* ─── Vista Nacional ──────────────────────────────── */}
      {view === "nacional" && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : universidades.length === 0 ? (
            <div className="rounded-[4px] border border-gz-rule bg-white p-8 text-center text-navy/40">
              No hay datos de universidades aun
            </div>
          ) : (
            universidades.map((u) => (
              <button
                key={u.universidad}
                onClick={() => handleExpandUniversidad(u.universidad)}
                className="w-full rounded-[4px] border border-gz-rule bg-white p-4 text-left transition-all hover:border-gold/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Rank medal */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                      u.rank === 1
                        ? "bg-gz-gold/20 text-gz-gold"
                        : u.rank === 2
                        ? "bg-gz-cream-dark text-gz-ink-light"
                        : u.rank === 3
                        ? "bg-gz-gold/15 text-gz-gold"
                        : "bg-navy/5 text-navy/40"
                    }`}>
                      {u.rank <= 3
                        ? ["🥇", "🥈", "🥉"][u.rank - 1]
                        : `#${u.rank}`}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-navy truncate">
                        {u.universidad}
                      </p>
                      <p className="text-xs text-navy/50">
                        {u.studentCount} {u.studentCount === 1 ? "estudiante" : "estudiantes"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-navy">
                        {u.totalXp.toLocaleString()} XP
                      </p>
                      <p className="text-[11px] text-navy/40">
                        Promedio: {u.avgXp.toLocaleString()} XP
                      </p>
                    </div>
                    <svg
                      className={`h-5 w-5 text-navy/30 transition-transform ${
                        expandedUniversidad === u.universidad ? "rotate-90" : ""
                      }`}
                      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ─── Vista Universidad (sedes) ───────────────────── */}
      {view === "universidad" && (
        <div className="space-y-3">
          {sedeLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : sedes.length === 0 ? (
            <div className="rounded-[4px] border border-gz-rule bg-white p-8 text-center text-navy/40">
              No hay datos de sedes para esta universidad
            </div>
          ) : (
            sedes.map((s) => (
              <button
                key={s.sede}
                onClick={() =>
                  handleClickSede(selectedUniversidad!, s.sede)
                }
                className="w-full rounded-[4px] border border-gz-rule bg-white p-4 text-left transition-all hover:border-gold/30 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                      s.rank === 1
                        ? "bg-gz-gold/20 text-gz-gold"
                        : s.rank === 2
                        ? "bg-gz-cream-dark text-gz-ink-light"
                        : s.rank === 3
                        ? "bg-gz-gold/15 text-gz-gold"
                        : "bg-navy/5 text-navy/40"
                    }`}>
                      {s.rank <= 3
                        ? ["🥇", "🥈", "🥉"][s.rank - 1]
                        : `#${s.rank}`}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy">
                        Sede {s.sede}
                      </p>
                      <p className="text-xs text-navy/50">
                        {s.studentCount} {s.studentCount === 1 ? "estudiante" : "estudiantes"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-navy">
                        {s.totalXp.toLocaleString()} XP
                      </p>
                      <p className="text-[11px] text-navy/40">
                        Promedio: {s.avgXp.toLocaleString()} XP
                      </p>
                    </div>
                    <svg
                      className="h-5 w-5 text-navy/30"
                      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ─── Vista Sede (usuarios) ───────────────────────── */}
      {view === "sede" && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-navy/60">
              {total} {total === 1 ? "estudiante" : "estudiantes"}
            </p>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-[4px] border border-gz-rule bg-white p-8 text-center text-navy/40">
              No hay estudiantes registrados en esta sede
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const initials = `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
                const tierLabel = u.tier ? TIER_LABELS[u.tier] : null;
                const tierEmoji = u.tier ? TIER_EMOJIS[u.tier] : null;

                return (
                  <Link
                    key={u.id}
                    href={`/dashboard/perfil/${u.id}`}
                    className="flex items-center gap-3 rounded-[4px] border border-gz-rule bg-white p-3 transition-all hover:border-gold/30 hover:shadow-sm"
                  >
                    {/* Rank */}
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      u.rank === 1
                        ? "bg-gz-gold/20 text-gz-gold"
                        : u.rank === 2
                        ? "bg-gz-cream-dark text-gz-ink-light"
                        : u.rank === 3
                        ? "bg-gz-gold/15 text-gz-gold"
                        : "bg-navy/5 text-navy/40"
                    }`}>
                      {u.rank <= 3
                        ? ["🥇", "🥈", "🥉"][u.rank - 1]
                        : `#${u.rank}`}
                    </div>

                    {/* Avatar */}
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt={`${u.firstName} ${u.lastName}`}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                        {initials}
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-navy/50">
                        {u.universityYear && (
                          <span>{u.universityYear}° año</span>
                        )}
                        {tierLabel && (
                          <span>{tierEmoji} {tierLabel}</span>
                        )}
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-navy">
                        {u.xp.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-navy/40">XP</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => fetchUsers(selectedUniversidad!, selectedSede!, page - 1)}
                disabled={page <= 1}
                className="rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs font-semibold text-navy/60 transition-colors hover:bg-gz-cream-dark disabled:opacity-30"
              >
                Anterior
              </button>
              <span className="text-xs text-navy/50">
                Pagina {page} de {totalPages}
              </span>
              <button
                onClick={() => fetchUsers(selectedUniversidad!, selectedSede!, page + 1)}
                disabled={page >= totalPages}
                className="rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs font-semibold text-navy/60 transition-colors hover:bg-gz-cream-dark disabled:opacity-30"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
