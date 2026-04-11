"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getGradoInfo } from "@/lib/league";

/* ─── Types ─── */

interface UniversidadRank {
  rank: number;
  universidad: string;
  studentCount: number;
  sedeCount: number;
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
  universityYear?: number | null;
  causasGanadas?: number;
  tier: string | null;
  grado?: number;
  universidad?: string | null;
}

interface RegionRank {
  rank: number;
  region: string;
  totalUsuarios: number;
  totalXp: number;
  promedioXp: number;
}

interface CorteRank {
  rank: number;
  corte: string;
  totalUsuarios: number;
  totalXp: number;
  promedioXp: number;
}

interface MateriaUserRank {
  rank: number;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
  xpMateria: number;
}

interface MiPosicion {
  universidad: string | null;
  sede: string | null;
  rankInUniversidad: number | null;
  totalInUniversidad: number;
  rankInSede: number | null;
  totalInSede: number;
}

/* ─── Ramas for materia tab ─── */
const RAMAS = [
  { key: "DERECHO_CIVIL", label: "Derecho Civil" },
  { key: "DERECHO_PROCESAL", label: "Derecho Procesal" },
  { key: "COT", label: "Código Orgánico de Tribunales" },
];

type TabId = "nacional" | "region" | "universidad" | "materia";

const TABS: { id: TabId; label: string }[] = [
  { id: "nacional", label: "Nacional" },
  { id: "region", label: "Por Región" },
  { id: "universidad", label: "Por Facultad" },
  { id: "materia", label: "Por Materia" },
];

/* ─── Helpers ─── */

function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gz-gold border-t-transparent" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-gz-rule rounded-sm p-8 text-center font-archivo text-[13px] text-gz-ink-light italic" style={{ backgroundColor: "var(--gz-cream)" }}>
      {text}
    </div>
  );
}

/* ─── Rank Badge ─── */
function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const medals = ["🥇", "🥈", "🥉"];
    return <span className="text-base">{medals[rank - 1]}</span>;
  }
  return (
    <span className="font-ibm-mono text-[11px] text-gz-ink-light tabular-nums">
      #{rank}
    </span>
  );
}

/* ─── User Row ─── */
function UserRow({ user, showUniv = false }: { user: UserRank | MateriaUserRank; showUniv?: boolean }) {
  const id = "id" in user ? user.id : (user as MateriaUserRank).userId;
  const xp = "xp" in user ? user.xp : (user as MateriaUserRank).xpMateria;
  const tier = "tier" in user ? (user as UserRank).tier : null;

  return (
    <Link
      href={`/dashboard/perfil/${id}`}
      className="flex items-center gap-3 px-4 py-3 border-b border-gz-rule/50 transition-colors hover:bg-gz-gold/[0.04]"
    >
      <span className="w-8 text-center">
        <RankBadge rank={user.rank} />
      </span>

      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-gz-rule flex-shrink-0" />
      ) : (
        <span className="h-8 w-8 rounded-full bg-gz-cream-dark flex items-center justify-center text-[10px] font-bold text-gz-ink-light flex-shrink-0">
          {getInitials(user.firstName, user.lastName)}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-archivo text-[13px] font-medium text-gz-ink truncate">
          {user.firstName} {user.lastName}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-gz-ink-light">
          {showUniv && user.universidad && <span className="truncate">{user.universidad}</span>}
          {(() => {
            const g = "grado" in user && (user as UserRank).grado
              ? getGradoInfo((user as UserRank).grado!)
              : tier
              ? getGradoInfo(1)
              : null;
            return g ? (
              <span>{g.emoji} Grado {g.grado} · {g.nombre}</span>
            ) : null;
          })()}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-ibm-mono text-[12px] font-medium text-gz-ink tabular-nums">
          {xp.toLocaleString()}
        </p>
        <p className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light">XP</p>
      </div>
    </Link>
  );
}

/* ─── Group Row (Universidad / Region / Corte / Sede) ─── */
function GroupRow({
  rank,
  label,
  count,
  totalXp,
  avgXp,
  onClick,
  subtitle,
}: {
  rank: number;
  label: string;
  count: number;
  totalXp: number;
  avgXp: number;
  onClick: () => void;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gz-rule/50 text-left transition-colors hover:bg-gz-gold/[0.04]"
    >
      <span className="w-8 text-center">
        <RankBadge rank={rank} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-archivo text-[13px] font-semibold text-gz-ink truncate">
          {label}
        </p>
        <p className="font-ibm-mono text-[10px] text-gz-ink-light">
          {count} {count === 1 ? "estudiante" : "estudiantes"}
          {subtitle && <span className="ml-2 text-gz-ink-light/60">· {subtitle}</span>}
        </p>
      </div>

      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="font-ibm-mono text-[12px] font-medium text-gz-ink tabular-nums">
          {totalXp.toLocaleString()} XP
        </p>
        <p className="font-ibm-mono text-[9px] text-gz-ink-light">
          Prom: {avgXp.toLocaleString()}
        </p>
      </div>

      <span className="text-gz-ink-light text-[10px] ml-1">›</span>
    </button>
  );
}

/* ─── Pagination ─── */
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-sm border border-gz-rule px-3 py-1.5 font-archivo text-[11px] text-gz-ink-mid transition-colors hover:bg-gz-cream-dark disabled:opacity-30"
      >
        Anterior
      </button>
      <span className="font-ibm-mono text-[10px] text-gz-ink-light">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-sm border border-gz-rule px-3 py-1.5 font-archivo text-[11px] text-gz-ink-mid transition-colors hover:bg-gz-cream-dark disabled:opacity-30"
      >
        Siguiente
      </button>
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */

export function RankingClient({ visibleEnRanking }: { visibleEnRanking: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>("nacional");

  // ─── Nacional state ───
  const [nacLoading, setNacLoading] = useState(false);
  const [nacUsers, setNacUsers] = useState<UserRank[]>([]);
  const [nacPage, setNacPage] = useState(1);
  const [nacTotalPages, setNacTotalPages] = useState(1);
  const [nacMiPos, setNacMiPos] = useState<number | null>(null);

  // ─── Region state ───
  const [regLoading, setRegLoading] = useState(false);
  const [regiones, setRegiones] = useState<RegionRank[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [cortes, setCortes] = useState<CorteRank[]>([]);
  const [corteLoading, setCorteLoading] = useState(false);
  const [selectedCorte, setSelectedCorte] = useState<string | null>(null);
  const [corteUsers, setCorteUsers] = useState<UserRank[]>([]);
  const [corteUsersLoading, setCorteUsersLoading] = useState(false);
  const [corteUsersPage, setCorteUsersPage] = useState(1);
  const [corteUsersTotalPages, setCorteUsersTotalPages] = useState(1);
  const [corteMiPos, setCorteMiPos] = useState<number | null>(null);

  // ─── Universidad state ───
  const [univLoading, setUnivLoading] = useState(false);
  const [universidades, setUniversidades] = useState<UniversidadRank[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<string | null>(null);
  const [sedes, setSedes] = useState<SedeRank[]>([]);
  const [sedeLoading, setSedeLoading] = useState(false);
  const [selectedSede, setSelectedSede] = useState<string | null>(null);
  const [sedeUsers, setSedeUsers] = useState<UserRank[]>([]);
  const [sedeUsersLoading, setSedeUsersLoading] = useState(false);
  const [sedeUsersPage, setSedeUsersPage] = useState(1);
  const [sedeUsersTotalPages, setSedeUsersTotalPages] = useState(1);
  const [miPosicion, setMiPosicion] = useState<MiPosicion | null>(null);

  // ─── Materia state ───
  const [selectedRama, setSelectedRama] = useState<string | null>(null);
  const [matLoading, setMatLoading] = useState(false);
  const [matUsers, setMatUsers] = useState<MateriaUserRank[]>([]);
  const [matPage, setMatPage] = useState(1);
  const [matTotalPages, setMatTotalPages] = useState(1);
  const [matMiPos, setMatMiPos] = useState<number | null>(null);

  // ─── Fetch functions ───

  const fetchNacional = useCallback(async (p = 1) => {
    setNacLoading(true);
    try {
      const res = await fetch(`/api/ranking/region?vista=usuarios&page=${p}`);
      const data = await res.json();
      setNacUsers(data.items ?? []);
      setNacPage(data.page ?? 1);
      setNacTotalPages(data.totalPages ?? 1);
      setNacMiPos(data.miPosicion ?? null);
    } catch { /* */ }
    setNacLoading(false);
  }, []);

  const fetchRegiones = useCallback(async () => {
    setRegLoading(true);
    try {
      const res = await fetch("/api/ranking/region?vista=nacional");
      const data = await res.json();
      setRegiones(data.items ?? []);
    } catch { /* */ }
    setRegLoading(false);
  }, []);

  const fetchCortes = useCallback(async (region: string) => {
    setCorteLoading(true);
    try {
      const res = await fetch(`/api/ranking/region?vista=region&region=${encodeURIComponent(region)}`);
      const data = await res.json();
      setCortes(data.items ?? []);
    } catch { /* */ }
    setCorteLoading(false);
  }, []);

  const fetchCorteUsers = useCallback(async (corte: string, p = 1) => {
    setCorteUsersLoading(true);
    try {
      const res = await fetch(`/api/ranking/region?vista=corte&corte=${encodeURIComponent(corte)}&page=${p}`);
      const data = await res.json();
      setCorteUsers(data.items ?? []);
      setCorteUsersPage(data.page ?? 1);
      setCorteUsersTotalPages(data.totalPages ?? 1);
      setCorteMiPos(data.miPosicion ?? null);
    } catch { /* */ }
    setCorteUsersLoading(false);
  }, []);

  const fetchUniversidades = useCallback(async () => {
    setUnivLoading(true);
    try {
      const res = await fetch("/api/ranking/facultad?view=nacional");
      const data = await res.json();
      setUniversidades(data.items ?? []);
    } catch { /* */ }
    setUnivLoading(false);
  }, []);

  const fetchSedes = useCallback(async (univ: string) => {
    setSedeLoading(true);
    try {
      const res = await fetch(`/api/ranking/facultad?view=universidad&u=${encodeURIComponent(univ)}`);
      const data = await res.json();
      setSedes(data.items ?? []);
    } catch { /* */ }
    setSedeLoading(false);
  }, []);

  const fetchSedeUsers = useCallback(async (univ: string, sede: string, p = 1) => {
    setSedeUsersLoading(true);
    try {
      const res = await fetch(`/api/ranking/facultad?view=sede&u=${encodeURIComponent(univ)}&s=${encodeURIComponent(sede)}&page=${p}`);
      const data = await res.json();
      setSedeUsers(data.items ?? []);
      setSedeUsersPage(data.page ?? 1);
      setSedeUsersTotalPages(data.totalPages ?? 1);
    } catch { /* */ }
    setSedeUsersLoading(false);
  }, []);

  const fetchMateria = useCallback(async (rama: string, p = 1) => {
    setMatLoading(true);
    try {
      const res = await fetch(`/api/ranking/materia?rama=${encodeURIComponent(rama)}&page=${p}`);
      const data = await res.json();
      setMatUsers(data.ranking ?? []);
      setMatPage(data.page ?? 1);
      setMatTotalPages(data.totalPages ?? 1);
      setMatMiPos(data.miPosicion ?? null);
    } catch { /* */ }
    setMatLoading(false);
  }, []);

  // ─── Auto-fetch on tab change ───

  useEffect(() => {
    if (activeTab === "nacional" && nacUsers.length === 0) fetchNacional();
  }, [activeTab, nacUsers.length, fetchNacional]);

  useEffect(() => {
    if (activeTab === "region" && regiones.length === 0) fetchRegiones();
  }, [activeTab, regiones.length, fetchRegiones]);

  useEffect(() => {
    if (activeTab === "universidad" && universidades.length === 0) {
      fetchUniversidades();
      fetch("/api/ranking/facultad/mi-posicion")
        .then((r) => r.json())
        .then((data) => setMiPosicion(data))
        .catch(() => {});
    }
  }, [activeTab, universidades.length, fetchUniversidades]);


  // ─── Tab change reset ───
  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    // Reset drill-down states
    if (tab !== "region") {
      setSelectedRegion(null);
      setSelectedCorte(null);
    }
    if (tab !== "universidad") {
      setSelectedUniv(null);
      setSelectedSede(null);
    }
  }

  // ─── Breadcrumb ───
  function renderBreadcrumb() {
    const crumbs: { label: string; onClick?: () => void }[] = [];

    if (activeTab === "region") {
      if (selectedRegion) {
        crumbs.push({ label: "Regiones", onClick: () => { setSelectedRegion(null); setSelectedCorte(null); } });
        if (selectedCorte) {
          crumbs.push({ label: selectedRegion, onClick: () => { setSelectedCorte(null); } });
          crumbs.push({ label: `Corte de ${selectedCorte}` });
        } else {
          crumbs.push({ label: selectedRegion });
        }
      }
    }

    if (activeTab === "universidad") {
      if (selectedUniv) {
        crumbs.push({ label: "Facultades", onClick: () => { setSelectedUniv(null); setSelectedSede(null); } });
        if (selectedSede) {
          crumbs.push({ label: selectedUniv, onClick: () => { setSelectedSede(null); fetchSedes(selectedUniv); } });
          crumbs.push({ label: `Sede ${selectedSede}` });
        } else {
          crumbs.push({ label: selectedUniv });
        }
      }
    }

    if (crumbs.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 mb-4 font-archivo text-[11px] text-gz-ink-light">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gz-rule">/</span>}
            {c.onClick ? (
              <button onClick={c.onClick} className="hover:text-gz-gold transition-colors">
                {c.label}
              </button>
            ) : (
              <span className="text-gz-ink font-medium">{c.label}</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="px-4 lg:px-10 pt-8 pb-4">

        {/* ═══ HEADER — full bleed ═══ */}
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium mb-1">
            Clasificación General
          </p>
          <div className="flex items-center gap-3">
            <img src="/brand/logo-sello.svg" alt="Studio Iuris" className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
            <h1 className="font-cormorant text-[28px] lg:text-[36px] font-bold text-gz-ink">
              Ranking
            </h1>
          </div>
      </div>
      <div className="h-[2px]" style={{ backgroundColor: "var(--gz-rule-dark)" }} />
      <div className="mx-auto max-w-4xl px-4 lg:px-10 py-6">

        {/* Visibility notice */}
        {!visibleEnRanking && (
          <div className="mb-4 flex items-center gap-2 rounded-sm border border-gz-gold/30 bg-gz-gold/[0.06] px-4 py-2.5">
            <span className="text-sm">👁️‍🗨️</span>
            <p className="font-archivo text-[12px] text-gz-ink-mid">
              No apareces en el ranking.{" "}
              <Link href="/dashboard/perfil" className="text-gz-gold underline underline-offset-2 hover:text-gz-gold-bright">
                Cambiar en Preferencias
              </Link>
            </p>
          </div>
        )}

        {/* ═══ TABS ═══ */}
        <div className="flex items-center justify-center gap-0 mb-6 border-b border-gz-rule">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                px-4 lg:px-6 py-2.5 font-archivo text-[11px] uppercase tracking-[1.5px] font-medium
                transition-colors border-b-2 -mb-[1px]
                ${activeTab === tab.id
                  ? "border-gz-gold text-gz-gold"
                  : "border-transparent text-gz-ink-light hover:text-gz-ink-mid"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ BREADCRUMB ═══ */}
        {renderBreadcrumb()}

        {/* ═══ TAB: NACIONAL ═══ */}
        {activeTab === "nacional" && (
          <div>
            {nacMiPos && (
              <div className="mb-4 px-4 py-3 rounded-sm border border-gz-gold/30" style={{ backgroundColor: "color-mix(in srgb, var(--gz-gold) 8%, var(--gz-cream))" }}>
                <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-1">Tu Posición Nacional</p>
                <p className="font-cormorant text-2xl font-bold text-gz-ink">#{nacMiPos}</p>
              </div>
            )}

            <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
              {nacLoading ? <Spinner /> : nacUsers.length === 0 ? (
                <EmptyState text="No hay datos aún" />
              ) : (
                nacUsers.map((u) => <UserRow key={u.id} user={u} showUniv />)
              )}
            </div>
            <Pagination page={nacPage} totalPages={nacTotalPages} onPageChange={(p) => fetchNacional(p)} />
          </div>
        )}

        {/* ═══ TAB: POR REGIÓN ═══ */}
        {activeTab === "region" && (
          <div>
            {!selectedRegion ? (
              // ─ Lista de regiones ─
              <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
                {regLoading ? <Spinner /> : regiones.length === 0 ? (
                  <EmptyState text="No hay datos regionales aún. Los usuarios deben configurar su región en el perfil." />
                ) : (
                  regiones.map((r) => (
                    <GroupRow
                      key={r.region}
                      rank={r.rank}
                      label={r.region}
                      count={r.totalUsuarios}
                      totalXp={r.totalXp}
                      avgXp={r.promedioXp}
                      onClick={() => { setSelectedRegion(r.region); fetchCortes(r.region); }}
                    />
                  ))
                )}
              </div>
            ) : !selectedCorte ? (
              // ─ Cortes de la región ─
              <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
                {corteLoading ? <Spinner /> : cortes.length === 0 ? (
                  <EmptyState text="No hay datos de cortes para esta región" />
                ) : (
                  cortes.map((c) => (
                    <GroupRow
                      key={c.corte}
                      rank={c.rank}
                      label={`Corte de ${c.corte}`}
                      count={c.totalUsuarios}
                      totalXp={c.totalXp}
                      avgXp={c.promedioXp}
                      onClick={() => { setSelectedCorte(c.corte); fetchCorteUsers(c.corte); }}
                    />
                  ))
                )}
              </div>
            ) : (
              // ─ Usuarios de la corte ─
              <div>
                {corteMiPos && (
                  <div className="mb-4 px-4 py-3 rounded-sm border border-gz-gold/30" style={{ backgroundColor: "color-mix(in srgb, var(--gz-gold) 8%, var(--gz-cream))" }}>
                    <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-1">Tu Posición en Corte de {selectedCorte}</p>
                    <p className="font-cormorant text-2xl font-bold text-gz-ink">#{corteMiPos}</p>
                  </div>
                )}
                <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
                  {corteUsersLoading ? <Spinner /> : corteUsers.length === 0 ? (
                    <EmptyState text="No hay estudiantes en esta corte" />
                  ) : (
                    corteUsers.map((u) => <UserRow key={u.id} user={u} showUniv />)
                  )}
                </div>
                <Pagination page={corteUsersPage} totalPages={corteUsersTotalPages} onPageChange={(p) => fetchCorteUsers(selectedCorte!, p)} />
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: POR UNIVERSIDAD ═══ */}
        {activeTab === "universidad" && (
          <div>
            {/* Mi Posición card */}
            {miPosicion && miPosicion.universidad && !selectedUniv && (
              <div className="mb-4 px-4 py-3 rounded-sm border border-gz-gold/30" style={{ backgroundColor: "color-mix(in srgb, var(--gz-gold) 8%, var(--gz-cream))" }}>
                <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-1">Tu Posición</p>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="font-archivo text-[11px] text-gz-ink-mid">{miPosicion.universidad}</p>
                    <p className="font-cormorant text-xl font-bold text-gz-ink">
                      #{miPosicion.rankInUniversidad}{" "}
                      <span className="font-archivo text-[11px] font-normal text-gz-ink-light">de {miPosicion.totalInUniversidad}</span>
                    </p>
                  </div>
                  {miPosicion.sede && miPosicion.rankInSede && (
                    <div className="border-l border-gz-gold/30 pl-4">
                      <p className="font-archivo text-[11px] text-gz-ink-mid">Sede {miPosicion.sede}</p>
                      <p className="font-cormorant text-xl font-bold text-gz-ink">
                        #{miPosicion.rankInSede}{" "}
                        <span className="font-archivo text-[11px] font-normal text-gz-ink-light">de {miPosicion.totalInSede}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selectedUniv ? (
              // ─ Lista de universidades ─
              <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
                {univLoading ? <Spinner /> : universidades.length === 0 ? (
                  <EmptyState text="No hay datos de facultades aún" />
                ) : (
                  universidades.map((u) => (
                    <GroupRow
                      key={u.universidad}
                      rank={u.rank}
                      label={u.universidad}
                      count={u.studentCount}
                      totalXp={u.totalXp}
                      avgXp={u.avgXp}
                      onClick={() => { setSelectedUniv(u.universidad); fetchSedes(u.universidad); }}
                      subtitle={u.sedeCount > 0 ? `${u.sedeCount} sede${u.sedeCount !== 1 ? "s" : ""}` : undefined}
                    />
                  ))
                )}
              </div>
            ) : !selectedSede ? (
              // ─ Sedes ─
              <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
                {sedeLoading ? <Spinner /> : sedes.length === 0 ? (
                  <EmptyState text="No hay datos de sedes" />
                ) : (
                  sedes.map((s) => (
                    <GroupRow
                      key={s.sede}
                      rank={s.rank}
                      label={`Sede ${s.sede}`}
                      count={s.studentCount}
                      totalXp={s.totalXp}
                      avgXp={s.avgXp}
                      onClick={() => { setSelectedSede(s.sede); fetchSedeUsers(selectedUniv!, s.sede); }}
                    />
                  ))
                )}
              </div>
            ) : (
              // ─ Usuarios de la sede ─
              <div>
                <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
                  {sedeUsersLoading ? <Spinner /> : sedeUsers.length === 0 ? (
                    <EmptyState text="No hay estudiantes en esta sede" />
                  ) : (
                    sedeUsers.map((u) => <UserRow key={u.id} user={u} />)
                  )}
                </div>
                <Pagination page={sedeUsersPage} totalPages={sedeUsersTotalPages} onPageChange={(p) => fetchSedeUsers(selectedUniv!, selectedSede!, p)} />
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB: POR MATERIA ═══ */}
        {activeTab === "materia" && (
          <div>
            {/* Rama selector */}
            <div className="flex flex-wrap gap-2 mb-5">
              {RAMAS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => { setSelectedRama(r.key); fetchMateria(r.key); }}
                  className={`
                    px-4 py-2 rounded-sm border font-archivo text-[12px] transition-colors
                    ${selectedRama === r.key
                      ? "border-gz-gold bg-gz-gold/10 text-gz-gold font-semibold"
                      : "border-gz-rule text-gz-ink-mid hover:border-gz-gold/30 hover:text-gz-ink"
                    }
                  `}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {!selectedRama ? (
              <EmptyState text="Selecciona una materia para ver el ranking" />
            ) : (
              <div>
                {matMiPos && (
                  <div className="mb-4 px-4 py-3 rounded-sm border border-gz-gold/30" style={{ backgroundColor: "color-mix(in srgb, var(--gz-gold) 8%, var(--gz-cream))" }}>
                    <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-1">Tu Posición en {RAMAS.find((r) => r.key === selectedRama)?.label}</p>
                    <p className="font-cormorant text-2xl font-bold text-gz-ink">#{matMiPos}</p>
                  </div>
                )}
                <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
                  {matLoading ? <Spinner /> : matUsers.length === 0 ? (
                    <EmptyState text="No hay datos para esta materia aún" />
                  ) : (
                    matUsers.map((u) => <UserRow key={u.userId} user={u} showUniv />)
                  )}
                </div>
                <Pagination page={matPage} totalPages={matTotalPages} onPageChange={(p) => fetchMateria(selectedRama!, p)} />
              </div>
            )}
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="mt-10 relative">
          <div className="border-t-2 border-gz-rule" />
          <div className="border-t border-gz-rule mt-[3px]" />
          <p className="text-center mt-3 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
            Tu Causa · Ranking · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </main>
  );
}
