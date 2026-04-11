"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getGradoInfo } from "@/lib/league";

// ─── Types ──────────────────────────────────────────────

interface CausaUser {
  rank: number;
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  grado: number;
  universidad: string | null;
  causasGanadas: number;
  causasJugadas: number;
  porcentajeVictoria: number;
}

interface RegionItem { rank: number; region: string; totalUsuarios: number; totalGanadas: number }
interface UnivItem { rank: number; universidad: string; totalUsuarios: number; totalGanadas: number; sedeCount: number }
interface SedeItem { rank: number; sede: string; totalUsuarios: number; totalGanadas: number }

type TabId = "nacional" | "region" | "universidad";

const TABS: { id: TabId; label: string }[] = [
  { id: "nacional", label: "Nacional" },
  { id: "region", label: "Por Región" },
  { id: "universidad", label: "Por Facultad" },
];

// ─── Helpers ────────────────────────────────────────────

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

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const medals = ["🥇", "🥈", "🥉"];
    return <span className="text-base">{medals[rank - 1]}</span>;
  }
  return <span className="font-ibm-mono text-[11px] text-gz-ink-light tabular-nums">#{rank}</span>;
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="rounded-sm border border-gz-rule px-3 py-1.5 font-archivo text-[11px] text-gz-ink-mid transition-colors hover:bg-gz-cream-dark disabled:opacity-30">Anterior</button>
      <span className="font-ibm-mono text-[10px] text-gz-ink-light">{page} / {totalPages}</span>
      <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="rounded-sm border border-gz-rule px-3 py-1.5 font-archivo text-[11px] text-gz-ink-mid transition-colors hover:bg-gz-cream-dark disabled:opacity-30">Siguiente</button>
    </div>
  );
}

// ─── User Row (causas-specific) ─────────────────────────

function CausaUserRow({ user }: { user: CausaUser }) {
  const g = getGradoInfo(user.grado);
  return (
    <Link href={`/dashboard/perfil/${user.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-gz-rule/50 transition-colors hover:bg-gz-gold/[0.04]">
      <span className="w-8 text-center"><RankBadge rank={user.rank} /></span>
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover border border-gz-rule flex-shrink-0" />
      ) : (
        <span className="h-8 w-8 rounded-full bg-gz-cream-dark flex items-center justify-center text-[10px] font-bold text-gz-ink-light flex-shrink-0">
          {getInitials(user.firstName, user.lastName)}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-archivo text-[13px] font-medium text-gz-ink truncate">{user.firstName} {user.lastName}</p>
        <div className="flex items-center gap-2 text-[10px] text-gz-ink-light">
          {user.universidad && <span className="truncate">{user.universidad}</span>}
          {g && <span>{g.emoji} G{g.grado}</span>}
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-right">
          <p className="font-ibm-mono text-[12px] font-medium text-gz-ink tabular-nums">{user.causasGanadas}</p>
          <p className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light">Ganadas</p>
        </div>
        <div className="text-right">
          <p className={`font-ibm-mono text-[12px] font-medium tabular-nums ${
            user.porcentajeVictoria >= 60 ? "text-green-600" : user.porcentajeVictoria >= 40 ? "text-gz-gold" : "text-gz-burgundy"
          }`}>{user.porcentajeVictoria}%</p>
          <p className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light">Win Rate</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Group Row ──────────────────────────────────────────

function GroupRow({ rank, label, count, totalGanadas, onClick, subtitle }: {
  rank: number; label: string; count: number; totalGanadas: number; onClick: () => void; subtitle?: string;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gz-rule/50 text-left transition-colors hover:bg-gz-gold/[0.04]">
      <span className="w-8 text-center"><RankBadge rank={rank} /></span>
      <div className="flex-1 min-w-0">
        <p className="font-archivo text-[13px] font-semibold text-gz-ink truncate">{label}</p>
        <p className="font-ibm-mono text-[10px] text-gz-ink-light">
          {count} {count === 1 ? "estudiante" : "estudiantes"}
          {subtitle && <span className="ml-2 text-gz-ink-light/60">· {subtitle}</span>}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-ibm-mono text-[12px] font-medium text-gz-ink tabular-nums">{totalGanadas}</p>
        <p className="font-ibm-mono text-[9px] text-gz-ink-light">causas ganadas</p>
      </div>
    </button>
  );
}

// ═══ MAIN COMPONENT ═════════════════════════════════════

export function RankingCausasClient() {
  const [activeTab, setActiveTab] = useState<TabId>("nacional");

  // Nacional
  const [nacLoading, setNacLoading] = useState(false);
  const [nacUsers, setNacUsers] = useState<CausaUser[]>([]);
  const [nacPage, setNacPage] = useState(1);
  const [nacTotalPages, setNacTotalPages] = useState(1);
  const [nacMiPos, setNacMiPos] = useState<number | null>(null);

  // Region
  const [regLoading, setRegLoading] = useState(false);
  const [regiones, setRegiones] = useState<RegionItem[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionUsers, setRegionUsers] = useState<CausaUser[]>([]);
  const [regionUsersLoading, setRegionUsersLoading] = useState(false);
  const [regionUsersPage, setRegionUsersPage] = useState(1);
  const [regionUsersTotalPages, setRegionUsersTotalPages] = useState(1);

  // Universidad
  const [univLoading, setUnivLoading] = useState(false);
  const [universidades, setUniversidades] = useState<UnivItem[]>([]);
  const [selectedUniv, setSelectedUniv] = useState<string | null>(null);
  const [sedes, setSedes] = useState<SedeItem[]>([]);
  const [sedeLoading, setSedeLoading] = useState(false);
  const [selectedSede, setSelectedSede] = useState<string | null>(null);
  const [sedeUsers, setSedeUsers] = useState<CausaUser[]>([]);
  const [sedeUsersLoading, setSedeUsersLoading] = useState(false);
  const [sedeUsersPage, setSedeUsersPage] = useState(1);
  const [sedeUsersTotalPages, setSedeUsersTotalPages] = useState(1);

  // ─── Fetch functions ──────────────────────────────────

  const fetchNacional = useCallback(async (p = 1) => {
    setNacLoading(true);
    try {
      const res = await fetch(`/api/ranking/causas?vista=nacional&page=${p}`);
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
      const res = await fetch("/api/ranking/causas?vista=regiones");
      const data = await res.json();
      setRegiones(data.items ?? []);
    } catch { /* */ }
    setRegLoading(false);
  }, []);

  const fetchRegionUsers = useCallback(async (reg: string, p = 1) => {
    setRegionUsersLoading(true);
    try {
      const res = await fetch(`/api/ranking/causas?vista=region&region=${encodeURIComponent(reg)}&page=${p}`);
      const data = await res.json();
      setRegionUsers(data.items ?? []);
      setRegionUsersPage(data.page ?? 1);
      setRegionUsersTotalPages(data.totalPages ?? 1);
    } catch { /* */ }
    setRegionUsersLoading(false);
  }, []);

  const fetchUniversidades = useCallback(async () => {
    setUnivLoading(true);
    try {
      const res = await fetch("/api/ranking/causas?vista=universidades");
      const data = await res.json();
      setUniversidades(data.items ?? []);
    } catch { /* */ }
    setUnivLoading(false);
  }, []);

  const fetchSedes = useCallback(async (univ: string) => {
    setSedeLoading(true);
    try {
      const res = await fetch(`/api/ranking/causas?vista=universidad&universidad=${encodeURIComponent(univ)}`);
      const data = await res.json();
      setSedes(data.items ?? []);
    } catch { /* */ }
    setSedeLoading(false);
  }, []);

  const fetchSedeUsers = useCallback(async (univ: string, s: string, p = 1) => {
    setSedeUsersLoading(true);
    try {
      const res = await fetch(`/api/ranking/causas?vista=sede&universidad=${encodeURIComponent(univ)}&sede=${encodeURIComponent(s)}&page=${p}`);
      const data = await res.json();
      setSedeUsers(data.items ?? []);
      setSedeUsersPage(data.page ?? 1);
      setSedeUsersTotalPages(data.totalPages ?? 1);
    } catch { /* */ }
    setSedeUsersLoading(false);
  }, []);

  // ─── Auto-fetch ───────────────────────────────────────

  useEffect(() => {
    if (activeTab === "nacional" && nacUsers.length === 0) fetchNacional();
  }, [activeTab, nacUsers.length, fetchNacional]);

  useEffect(() => {
    if (activeTab === "region" && regiones.length === 0) fetchRegiones();
  }, [activeTab, regiones.length, fetchRegiones]);

  useEffect(() => {
    if (activeTab === "universidad" && universidades.length === 0) fetchUniversidades();
  }, [activeTab, universidades.length, fetchUniversidades]);

  // ─── Breadcrumbs ──────────────────────────────────────

  function renderBreadcrumbs() {
    const crumbs: { label: string; onClick?: () => void }[] = [];

    if (activeTab === "region") {
      crumbs.push({ label: "Regiones", onClick: () => { setSelectedRegion(null); } });
      if (selectedRegion) crumbs.push({ label: selectedRegion });
    }
    if (activeTab === "universidad") {
      crumbs.push({ label: "Universidades", onClick: () => { setSelectedUniv(null); setSelectedSede(null); } });
      if (selectedUniv) {
        crumbs.push({ label: selectedUniv, onClick: () => { setSelectedSede(null); fetchSedes(selectedUniv); } });
        if (selectedSede) crumbs.push({ label: selectedSede });
      }
    }

    if (crumbs.length === 0) return null;
    return (
      <div className="mb-3 flex items-center gap-1 font-ibm-mono text-[10px] text-gz-ink-light">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="mx-1">›</span>}
            {c.onClick ? (
              <button onClick={c.onClick} className="hover:text-gz-gold transition-colors underline">{c.label}</button>
            ) : (
              <span className="text-gz-ink">{c.label}</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div>
    <div className="px-4 sm:px-6 pt-8 pb-4">
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium mb-1">
        Competencias · Causas
      </p>
        <div className="flex items-center gap-3">
          <img src="/brand/logo-sello.svg" alt="Studio Iuris" className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
          <h1 className="font-cormorant text-[28px] lg:text-[36px] font-bold text-gz-ink">
            Ranking de Causas
          </h1>
        </div>
        <div className="border-b-2 border-gz-rule-dark mt-3" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gz-rule mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 font-archivo text-[12px] font-semibold uppercase tracking-[1px] border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-gz-gold text-gz-gold"
                : "border-transparent text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Breadcrumbs */}
      {renderBreadcrumbs()}

      {/* ═══ NACIONAL ═══ */}
      {activeTab === "nacional" && (
        <div>
          {nacMiPos && (
            <div className="mb-4 px-4 py-3 rounded-sm border border-gz-gold/30" style={{ backgroundColor: "color-mix(in srgb, var(--gz-gold) 8%, var(--gz-cream))" }}>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-1">Tu Posición Nacional</p>
              <p className="font-cormorant text-2xl font-bold text-gz-ink">#{nacMiPos}</p>
            </div>
          )}
          <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
            {nacLoading ? <Spinner /> : nacUsers.length === 0 ? <EmptyState text="No hay datos de causas aún" /> : nacUsers.map((u) => <CausaUserRow key={u.id} user={u} />)}
          </div>
          <Pagination page={nacPage} totalPages={nacTotalPages} onPageChange={(p) => fetchNacional(p)} />
        </div>
      )}

      {/* ═══ REGION ═══ */}
      {activeTab === "region" && !selectedRegion && (
        <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
          {regLoading ? <Spinner /> : regiones.length === 0 ? <EmptyState text="No hay datos por región" /> : regiones.map((r) => (
            <GroupRow key={r.region} rank={r.rank} label={r.region} count={r.totalUsuarios} totalGanadas={r.totalGanadas} onClick={() => { setSelectedRegion(r.region); fetchRegionUsers(r.region); }} />
          ))}
        </div>
      )}

      {activeTab === "region" && selectedRegion && (
        <div>
          <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
            {regionUsersLoading ? <Spinner /> : regionUsers.length === 0 ? <EmptyState text="No hay datos para esta región" /> : regionUsers.map((u) => <CausaUserRow key={u.id} user={u} />)}
          </div>
          <Pagination page={regionUsersPage} totalPages={regionUsersTotalPages} onPageChange={(p) => fetchRegionUsers(selectedRegion, p)} />
        </div>
      )}

      {/* ═══ UNIVERSIDAD ═══ */}
      {activeTab === "universidad" && !selectedUniv && (
        <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
          {univLoading ? <Spinner /> : universidades.length === 0 ? <EmptyState text="No hay datos por facultad" /> : universidades.map((u) => (
            <GroupRow key={u.universidad} rank={u.rank} label={u.universidad} count={u.totalUsuarios} totalGanadas={u.totalGanadas} onClick={() => { setSelectedUniv(u.universidad); fetchSedes(u.universidad); }} subtitle={`${u.sedeCount} sedes`} />
          ))}
        </div>
      )}

      {activeTab === "universidad" && selectedUniv && !selectedSede && (
        <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
          {sedeLoading ? <Spinner /> : sedes.length === 0 ? <EmptyState text="No hay sedes con datos" /> : sedes.map((s) => (
            <GroupRow key={s.sede} rank={s.rank} label={s.sede} count={s.totalUsuarios} totalGanadas={s.totalGanadas} onClick={() => { setSelectedSede(s.sede); fetchSedeUsers(selectedUniv, s.sede); }} />
          ))}
        </div>
      )}

      {activeTab === "universidad" && selectedUniv && selectedSede && (
        <div>
          <div className="border border-gz-rule rounded-sm overflow-hidden" style={{ backgroundColor: "var(--gz-cream)" }}>
            {sedeUsersLoading ? <Spinner /> : sedeUsers.length === 0 ? <EmptyState text="No hay datos para esta sede" /> : sedeUsers.map((u) => <CausaUserRow key={u.id} user={u} />)}
          </div>
          <Pagination page={sedeUsersPage} totalPages={sedeUsersTotalPages} onPageChange={(p) => fetchSedeUsers(selectedUniv, selectedSede, p)} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 relative">
        <div className="border-t-2 border-gz-rule" />
        <div className="border-t border-gz-rule mt-[3px]" />
        <p className="text-center mt-3 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
          Studio Iuris · Ranking de Causas · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
