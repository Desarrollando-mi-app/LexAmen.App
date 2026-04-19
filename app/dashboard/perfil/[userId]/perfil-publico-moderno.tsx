"use client";

/**
 * VARIANT B — MODERN / LINKEDIN-INSPIRED
 * ──────────────────────────────────────
 * Card-based layout with a tall cover banner, offset avatar (overlap),
 * chip-dense header, sticky tab bar, and feed-style publications.
 * Keeps editorial palette (cream/ink/gold/burgundy, Cormorant + Archivo + IBM Mono)
 * so it reads as "LinkedIn, pero para Studio IURIS" — not a Silicon Valley app.
 * Rounded-[3px] corners, gold CTAs, burgundy for competitive signals.
 */

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BADGE_RULES } from "@/lib/badge-constants";
import { TIER_LABELS, TIER_EMOJIS, getGradoInfo } from "@/lib/league";
import { ReportModal } from "@/app/components/report-modal";

// ─── Types ───────────────────────────────────────────────

interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  sede: string | null;
  universityYear: number | null;
  avatarUrl: string | null;
  coverUrl?: string | null;
  bio: string | null;
  cvAvailable: boolean;
  region: string | null;
  corte: string | null;
  xp: number;
  causasGanadas: number;
  causasPerdidas: number;
  winRate: number;
  tier: string | null;
  grado?: number;
  memberSince: string;
  etapaActual: string | null;
  anioIngreso: number | null;
  anioEgreso: number | null;
  anioJura: number | null;
  empleoActual: string | null;
  cargoActual: string | null;
  linkedinUrl: string | null;
}

interface ColegaPreview {
  id: string; firstName: string; lastName: string;
  universidad: string | null; tier: string | null; xp: number;
}

type PublicationKind = "obiter" | "analisis" | "ensayo" | "debate" | "columna";

interface Publication {
  id: string; kind: PublicationKind;
  titulo: string | null; contenido: string | null;
  materia: string | null; tipo: string | null; tribunal: string | null;
  resumen: string | null;
  apoyosCount: number; citasCount: number; guardadosCount: number; viewsCount: number;
  createdAt: string;
}

interface PerfilModernoProps {
  user: ProfileUser;
  isOwnProfile: boolean;
  colegaStatus: string;
  requestId: string | null;
  colegaCount: number;
  earnedBadges: string[];
  colegasPreview: ColegaPreview[];
  publications: Publication[];
  obiterCount: number;
  obiterCitasReceived: number;
  obiterApoyosReceived: number;
  cvRequestStatus?: string | null;
  especialidadesCalculadas?: Array<{ materia: string; porcentaje: number }>;
  trayectoria?: Array<{ tipo: string; anio: number; detalle?: string }>;
  topBadges?: Array<{ slug: string; emoji: string; label: string; tier: string }>;
}

// ─── Helpers ─────────────────────────────────────────────

function toRoman(num: number): string {
  const map: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let r = "", n = Math.max(0, Math.floor(num));
  for (const [v, s] of map) { while (n >= v) { r += s; n -= v; } }
  return r || "I";
}

function etapaLabel(e: string | null): string | null {
  if (!e) return null;
  if (e === "estudiante") return "Estudiante";
  if (e === "egresado") return "Egresado/a";
  if (e === "abogado") return "Abogado/a";
  return e;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `${dd}d`;
  return new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

// Map etapa to an accent color (prominence by user type)
function etapaAccent(etapa: string | null): { dot: string; label: string } {
  if (etapa === "abogado") return { dot: "bg-gz-burgundy", label: "text-gz-burgundy" };
  if (etapa === "egresado") return { dot: "bg-gz-gold", label: "text-gz-gold" };
  if (etapa === "estudiante") return { dot: "bg-gz-navy", label: "text-gz-navy" };
  return { dot: "bg-gz-ink-mid", label: "text-gz-ink-mid" };
}

// Cover gradient fallback — palette-safe lookup by etapa, angle varied by grado.
// Keeps navy/burgundy/ink/gold as the only pigments (no out-of-palette hues).
function proceduralCover(grado: number | undefined, etapa: string | null): string {
  const stops: [string, string] =
    etapa === "abogado"
      ? ["var(--gz-burgundy)", "var(--gz-navy)"]
      : etapa === "egresado"
      ? ["var(--gz-navy)", "var(--gz-ink)"]
      : etapa === "estudiante"
      ? ["var(--gz-ink)", "var(--gz-navy)"]
      : ["var(--gz-ink-mid)", "var(--gz-ink)"];
  const angle = 110 + (((grado ?? 1) * 23) % 60); // 110°–170° range, still diagonal
  return `linear-gradient(${angle}deg, ${stops[0]} 0%, ${stops[1]} 100%)`;
}

// ─── Component ───────────────────────────────────────────

export function PerfilModerno({
  user,
  isOwnProfile,
  colegaStatus: initialStatus,
  requestId: initialRequestId,
  colegaCount,
  earnedBadges,
  colegasPreview,
  publications,
  obiterCount,
  obiterApoyosReceived,
  obiterCitasReceived,
  cvRequestStatus,
  especialidadesCalculadas,
  trayectoria,
  topBadges,
}: PerfilModernoProps) {
  const [colegaStatus, setColegaStatus] = useState(initialStatus);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"publicaciones" | "trayectoria" | "logros" | "comunidad" | "cv">("publicaciones");
  const [pubFilter, setPubFilter] = useState<string>("TODOS");
  const [mutualCount, setMutualCount] = useState(0);

  useEffect(() => {
    if (isOwnProfile) return;
    fetch(`/api/user/${user.id}/colegas-comun`)
      .then((r) => r.json())
      .then((data) => { if (data.count > 0) setMutualCount(data.count); })
      .catch(() => {});
  }, [user.id, isOwnProfile]);

  const gradoInfo = user.grado ? getGradoInfo(user.grado) : null;
  const gradoRoman = user.grado ? toRoman(user.grado) : null;
  const tierLabel = user.tier ? TIER_LABELS[user.tier] ?? user.tier : null;
  const tierEmoji = user.tier ? TIER_EMOJIS[user.tier] ?? "" : "";
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const etapa = etapaLabel(user.etapaActual);
  const accent = etapaAccent(user.etapaActual);
  const totalCausas = user.causasGanadas + user.causasPerdidas;

  const filteredPubs = useMemo(() => {
    if (pubFilter === "TODOS") return publications;
    return publications.filter((p) => p.kind === pubFilter);
  }, [publications, pubFilter]);

  const pubCounts = useMemo(() => ({
    total: publications.length,
    obiter: publications.filter((p) => p.kind === "obiter").length,
    analisis: publications.filter((p) => p.kind === "analisis").length,
    ensayo: publications.filter((p) => p.kind === "ensayo").length,
    debate: publications.filter((p) => p.kind === "debate").length,
    columna: publications.filter((p) => p.kind === "columna").length,
  }), [publications]);

  async function handleSendRequest() {
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Error");
      if (data.autoAccepted) { setColegaStatus("accepted"); toast.success("Son colegas ahora"); }
      else { setColegaStatus("pending_sent"); setRequestId(data.requestId); toast.success("Solicitud enviada"); }
    } catch { toast.error("Error de conexión"); } finally { setLoading(false); }
  }

  async function handleCancelRequest() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/colegas/${requestId}`, { method: "DELETE" });
      if (res.ok) { setColegaStatus("none"); setRequestId(null); toast.success("Solicitud cancelada"); }
    } catch { toast.error("Error de conexión"); } finally { setLoading(false); }
  }

  async function handleAcceptRequest() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/respond", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setColegaStatus("accepted"); toast.success("Solicitud aceptada"); }
      else { toast.error(data.error || `Error ${res.status}`); }
    } catch { toast.error("Error de conexión"); } finally { setLoading(false); }
  }

  async function handleDeclineRequest() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/respond", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "decline" }),
      });
      if (res.ok) { setColegaStatus("declined"); toast.success("Solicitud declinada"); }
    } catch { toast.error("Error de conexión"); } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
      <div className="mx-auto max-w-[1200px] px-3 sm:px-5 pt-4 pb-16 space-y-3">

        {/* ═══ HEADER CARD ═════════════════════════════════════ */}
        <section className="rounded-[3px] border border-gz-rule bg-gz-cream overflow-hidden">
          {/* Cover — tall, bleeds edge-to-edge */}
          <div
            className="h-[220px] sm:h-[260px] relative"
            style={
              user.coverUrl
                ? { backgroundImage: `url(${user.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: proceduralCover(user.grado, user.etapaActual) }
            }
          >
            {/* Roman numeral watermark */}
            {gradoRoman && (
              <div className="absolute inset-0 flex items-center justify-end pr-6 sm:pr-12 pointer-events-none">
                <div className="font-cormorant text-[140px] sm:text-[220px] italic text-gz-cream/10 leading-none select-none">
                  {gradoRoman}
                </div>
              </div>
            )}
            {/* Top chips */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {gradoInfo && (
                  <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-cream/20 backdrop-blur-sm text-gz-cream border border-gz-cream/30 px-2.5 py-1 rounded-[3px]">
                    Grado {gradoRoman} · {gradoInfo.nombre}
                  </span>
                )}
                {tierLabel && (
                  <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-gold text-gz-cream px-2.5 py-1 rounded-[3px]">
                    {tierEmoji} {tierLabel}
                  </span>
                )}
              </div>
              {isOwnProfile && (
                <button
                  className="font-ibm-mono text-[9px] uppercase tracking-[2px] bg-gz-ink/40 hover:bg-gz-ink/60 backdrop-blur-sm text-gz-cream border border-gz-cream/30 px-2.5 py-1 rounded-[3px] cursor-pointer transition-colors inline-flex items-center gap-1.5"
                  onClick={() => toast.info("Sube una portada desde Configuración → Perfil")}
                  aria-label="Editar portada"
                >
                  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M11.5 2.5l2 2L5 13l-3 1 1-3 8.5-8.5z" />
                  </svg>
                  Portada
                </button>
              )}
            </div>
            {/* Bottom flourish */}
            <div className="absolute bottom-3 left-5 font-ibm-mono text-[9px] uppercase tracking-[4px] text-gz-cream/60">
              Studio IURIS
            </div>
          </div>

          {/* Identity block */}
          <div className="px-4 sm:px-6 pb-5 relative">
            {/* Avatar — overlaps cover */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-[68px] sm:-mt-[72px] mb-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5 min-w-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-[140px] h-[140px] rounded-[3px] border-[5px] border-gz-cream object-cover shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-[140px] h-[140px] rounded-[3px] border-[5px] border-gz-cream bg-gradient-to-br from-gz-navy to-gz-burgundy flex items-center justify-center font-cormorant text-5xl font-semibold text-gz-cream shadow-md shrink-0">
                    {initials}
                  </div>
                )}
                <div className="sm:pb-2 min-w-0">
                  {etapa && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                      <span className={`font-ibm-mono text-[10px] uppercase tracking-[2px] font-semibold ${accent.label}`}>
                        {etapa}
                        {user.etapaActual === "estudiante" && user.universityYear ? ` · ${user.universityYear}º año` : ""}
                      </span>
                    </div>
                  )}
                  <h1 className="font-cormorant text-3xl sm:text-[40px] font-semibold leading-[1.05] text-gz-ink">
                    {user.firstName} {user.lastName}
                  </h1>
                  {user.bio && (
                    <p className="font-archivo text-sm text-gz-ink-mid mt-1.5 line-clamp-2 max-w-2xl leading-snug">
                      {user.bio}
                    </p>
                  )}
                  {/* Meta chips row */}
                  <div className="flex items-center gap-x-3 gap-y-1.5 mt-2.5 flex-wrap font-archivo text-[13px] text-gz-ink-mid">
                    {user.universidad && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold">Univ.</span>
                        {user.universidad}{user.sede ? ` · ${user.sede}` : ""}
                      </span>
                    )}
                    {user.empleoActual && user.etapaActual === "abogado" && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-burgundy">Ejerce</span>
                        {user.cargoActual ? `${user.cargoActual}, ` : ""}{user.empleoActual}
                      </span>
                    )}
                    {user.region && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">Región</span>
                        {user.region}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-gz-gold font-semibold">{colegaCount}</span> colega{colegaCount !== 1 ? "s" : ""}
                      {mutualCount > 0 && <span className="text-gz-ink-light">· {mutualCount} mutuo{mutualCount !== 1 ? "s" : ""}</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0 flex-wrap">
                {isOwnProfile ? (
                  <>
                    <Link
                      href="/dashboard/perfil/configuracion"
                      className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-ink-mid transition-colors cursor-pointer"
                    >
                      Editar perfil
                    </Link>
                    <button
                      onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast.success("Enlace copiado"))}
                      className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule-dark px-3 py-2.5 rounded-[3px] hover:bg-gz-cream-dark transition-colors cursor-pointer"
                    >
                      Compartir
                    </button>
                  </>
                ) : (
                  <>
                    {colegaStatus === "none" && (
                      <button
                        onClick={handleSendRequest}
                        disabled={loading}
                        className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-gold text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-gold-bright transition-colors cursor-pointer disabled:opacity-50"
                      >
                        + Agregar colega
                      </button>
                    )}
                    {colegaStatus === "pending_sent" && (
                      <button
                        onClick={handleCancelRequest}
                        disabled={loading}
                        className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-ink-mid text-gz-ink-mid px-4 py-2.5 rounded-[3px] hover:bg-gz-cream-dark transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Solicitud enviada · Cancelar
                      </button>
                    )}
                    {colegaStatus === "pending_received" && (
                      <>
                        <button
                          onClick={handleAcceptRequest}
                          disabled={loading}
                          className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-sage text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-ink transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Aceptar
                        </button>
                        <button
                          onClick={handleDeclineRequest}
                          disabled={loading}
                          className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule text-gz-ink-mid px-4 py-2.5 rounded-[3px] hover:bg-gz-cream-dark transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Declinar
                        </button>
                      </>
                    )}
                    {colegaStatus === "accepted" && (
                      <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-sage text-gz-sage bg-gz-sage/5 px-4 py-2.5 rounded-[3px]">
                        ✓ Colega
                      </span>
                    )}
                    {colegaStatus === "declined" && (
                      <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule text-gz-ink-light px-4 py-2.5 rounded-[3px]">
                        Solicitud declinada
                      </span>
                    )}
                    <button className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-gold text-gz-gold px-4 py-2.5 rounded-[3px] hover:bg-gz-gold/10 transition-colors cursor-pointer">
                      Mensaje
                    </button>
                    <ReportModal
                      reportadoId={user.id}
                      trigger={
                        <button
                          aria-label="Reportar perfil"
                          className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule-dark px-3 py-2.5 rounded-[3px] hover:bg-gz-cream-dark cursor-pointer"
                          title="Reportar"
                        >
                          ⋯
                        </button>
                      }
                    />
                  </>
                )}
              </div>
            </div>

            {/* Stat strip — minimal, inline */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 border-t border-gz-rule pt-3">
              <Stat label="XP" value={user.xp.toLocaleString("es-CL")} />
              <Stat label="Grado" value={gradoRoman ?? "—"} accent={gradoInfo?.nombre} color="text-gz-gold" />
              <Stat label="Causas" value={totalCausas > 0 ? `${user.causasGanadas}–${user.causasPerdidas}` : "—"} accent={totalCausas > 0 ? `${user.winRate}% W` : undefined} />
              <Stat label="Colegas" value={colegaCount.toString()} />
              <Stat label="Liga" value={tierLabel ?? "—"} color="text-gz-burgundy" />
            </div>
          </div>
        </section>

        {/* ═══ TAB BAR (sticky — offset below GzMasthead z-40) ═ */}
        <nav
          role="tablist"
          aria-label="Secciones del perfil"
          className="rounded-[3px] border border-gz-rule bg-gz-cream sticky top-[120px] z-20 shadow-sm"
        >
          <div className="flex items-center gap-0.5 px-2 overflow-x-auto">
            <Tab active={activeTab === "publicaciones"} label="Publicaciones" count={pubCounts.total} onClick={() => setActiveTab("publicaciones")} />
            <Tab active={activeTab === "trayectoria"} label="Trayectoria" count={trayectoria?.length ?? 0} onClick={() => setActiveTab("trayectoria")} />
            <Tab active={activeTab === "logros"} label="Logros" count={earnedBadges.length} onClick={() => setActiveTab("logros")} />
            <Tab active={activeTab === "comunidad"} label="Comunidad" count={colegaCount} onClick={() => setActiveTab("comunidad")} />
            {user.cvAvailable && <Tab active={activeTab === "cv"} label="CV" onClick={() => setActiveTab("cv")} />}
          </div>
        </nav>

        {/* ═══ GRID ═════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

          {/* ─── MAIN ─────────────────────────────────────────── */}
          <section className="lg:col-span-8 space-y-3">
            {activeTab === "publicaciones" && (
              <>
                {/* Compose */}
                {isOwnProfile && (
                  <div className="rounded-[3px] border border-gz-rule bg-gz-cream p-4">
                    <div className="flex gap-3 items-center">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-11 h-11 rounded-[3px] object-cover shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-[3px] bg-gz-navy text-gz-cream flex items-center justify-center text-xs font-semibold shrink-0">{initials}</div>
                      )}
                      <Link
                        href="/dashboard/diario"
                        className="flex-1 px-4 py-3 rounded-[3px] border border-gz-rule text-gz-ink-light hover:bg-gz-cream-dark/40 cursor-pointer text-sm font-archivo"
                      >
                        Comparte un dictamen, {user.firstName}…
                      </Link>
                    </div>
                    <div className="flex gap-1 mt-3 flex-wrap">
                      <ComposeChip href="/dashboard/diario?tipo=obiter" color="text-gz-gold" glyph="§" label="Obiter" />
                      <ComposeChip href="/dashboard/diario?tipo=analisis" color="text-gz-navy" glyph="¶" label="Análisis" />
                      <ComposeChip href="/dashboard/diario/ensayos" color="text-gz-sage" glyph="◆" label="Ensayo" />
                      <ComposeChip href="/dashboard/diario/debates" color="text-gz-burgundy" glyph="‡" label="Debate" />
                      <ComposeChip href="/dashboard/diario/columnas" color="text-gz-ink-mid" glyph="◇" label="Columna" />
                    </div>
                  </div>
                )}

                {/* Filter row */}
                <div className="rounded-[3px] border border-gz-rule bg-gz-cream px-3 py-2 flex items-center gap-2 overflow-x-auto">
                  <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light shrink-0">Tipo:</span>
                  <FilterPill active={pubFilter === "TODOS"} onClick={() => setPubFilter("TODOS")} label="Todos" count={pubCounts.total} />
                  <FilterPill active={pubFilter === "obiter"} onClick={() => setPubFilter("obiter")} label="Obiter" count={pubCounts.obiter} />
                  <FilterPill active={pubFilter === "analisis"} onClick={() => setPubFilter("analisis")} label="Análisis" count={pubCounts.analisis} />
                  <FilterPill active={pubFilter === "ensayo"} onClick={() => setPubFilter("ensayo")} label="Ensayo" count={pubCounts.ensayo} />
                  <FilterPill active={pubFilter === "debate"} onClick={() => setPubFilter("debate")} label="Debate" count={pubCounts.debate} />
                  <FilterPill active={pubFilter === "columna"} onClick={() => setPubFilter("columna")} label="Columnas" count={pubCounts.columna} />
                </div>

                {filteredPubs.length === 0 ? (
                  <div className="rounded-[3px] border border-gz-rule bg-gz-cream p-10 text-center">
                    <p className="font-cormorant italic text-2xl text-gz-ink-mid mb-1">
                      {isOwnProfile ? "Aún no has publicado" : "Sin publicaciones"}
                    </p>
                    <p className="font-archivo text-sm text-gz-ink-light">
                      {isOwnProfile ? "Comparte tu primer Obiter Dictum." : `${user.firstName} no ha publicado aún.`}
                    </p>
                  </div>
                ) : (
                  filteredPubs.map((p) => (
                    <FeedCard
                      key={p.id}
                      pub={p}
                      authorName={`${user.firstName} ${user.lastName}`}
                      authorInitials={initials}
                      authorAvatar={user.avatarUrl}
                      authorEtapa={etapa}
                      authorUniv={user.universidad}
                    />
                  ))
                )}
              </>
            )}

            {activeTab === "trayectoria" && (
              <div className="rounded-[3px] border border-gz-rule bg-gz-cream p-5">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className="font-cormorant text-2xl font-semibold">Trayectoria</h3>
                  {isOwnProfile && (
                    <Link href="/dashboard/perfil/configuracion#trayectoria" className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-gold text-gz-gold px-3 py-1.5 rounded-[3px] hover:bg-gz-gold/10 cursor-pointer">
                      + Agregar
                    </Link>
                  )}
                </div>
                {trayectoria && trayectoria.length > 0 ? (
                  <ol className="relative space-y-5">
                    {trayectoria.map((t, i) => (
                      <li key={i} className="flex gap-4">
                        <div className="shrink-0 w-14 text-right">
                          <div className="font-cormorant text-2xl font-semibold text-gz-gold leading-tight">{t.anio}</div>
                        </div>
                        <div className="flex-1 pb-4 border-b border-gz-rule last:border-0">
                          <div className="font-archivo font-semibold text-gz-ink">{trayectoriaLabel(t.tipo)}</div>
                          {t.detalle && <div className="font-archivo text-sm text-gz-ink-mid mt-0.5">{t.detalle}</div>}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="font-archivo text-sm text-gz-ink-light italic">Sin trayectoria registrada.</p>
                )}
              </div>
            )}

            {activeTab === "logros" && (
              <div className="rounded-[3px] border border-gz-rule bg-gz-cream p-5">
                <h3 className="font-cormorant text-2xl font-semibold mb-4">Logros · {earnedBadges.length}</h3>
                {earnedBadges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {BADGE_RULES.filter((b) => earnedBadges.includes(b.slug)).map((b) => (
                      <div key={b.slug} className="rounded-[3px] border border-gz-rule p-3 flex items-center gap-3 hover:border-gz-gold transition-colors cursor-pointer" title={b.description}>
                        <div className={`w-11 h-11 rounded-[3px] flex items-center justify-center text-xl shrink-0 ${badgeTierClass(b.tier)}`}>
                          {b.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="font-archivo text-sm font-semibold leading-tight">{b.label}</div>
                          <div className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mt-0.5">{b.tier}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-archivo text-sm text-gz-ink-light italic">Aún sin logros.</p>
                )}
              </div>
            )}

            {activeTab === "cv" && user.cvAvailable && (
              <div className="rounded-[3px] border border-gz-rule bg-gz-cream p-6 text-center">
                <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
                  Curriculum Vitae
                </div>
                <p className="font-cormorant text-2xl text-gz-ink mb-2">
                  {isOwnProfile
                    ? "Tu CV está disponible bajo solicitud."
                    : cvRequestStatus === "APPROVED"
                    ? "Tu solicitud fue aprobada."
                    : cvRequestStatus === "PENDING"
                    ? "Solicitud en trámite."
                    : cvRequestStatus === "REJECTED"
                    ? "Solicitud rechazada."
                    : "CV disponible bajo solicitud."}
                </p>
                <p className="font-archivo text-sm text-gz-ink-mid mb-5 max-w-md mx-auto">
                  {isOwnProfile
                    ? "Otros colegas pueden requerir acceso. Aprobarás cada solicitud individualmente."
                    : cvRequestStatus === "APPROVED"
                    ? `Puedes descargar el CV de ${user.firstName} desde el menú de colegas.`
                    : cvRequestStatus === "PENDING"
                    ? `${user.firstName} recibió tu solicitud. Te avisaremos cuando responda.`
                    : cvRequestStatus === "REJECTED"
                    ? `${user.firstName} no autorizó el acceso esta vez.`
                    : `Envía una solicitud a ${user.firstName} para revisar su CV completo.`}
                </p>
                {!isOwnProfile && !cvRequestStatus && (
                  <Link
                    href={`/dashboard/perfil/${user.id}?tab=cv#solicitar`}
                    className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-gold text-gz-cream px-5 py-2.5 rounded-[3px] hover:bg-gz-gold-bright transition-colors cursor-pointer inline-block"
                  >
                    Solicitar acceso
                  </Link>
                )}
              </div>
            )}

            {activeTab === "comunidad" && (
              <div className="rounded-[3px] border border-gz-rule bg-gz-cream p-5">
                <h3 className="font-cormorant text-2xl font-semibold mb-4">Colegas · {colegaCount}</h3>
                {colegasPreview.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {colegasPreview.map((c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/perfil/${c.id}`}
                        className="flex items-center gap-3 p-3 rounded-[3px] border border-gz-rule hover:border-gz-gold hover:bg-gz-cream-dark/20 transition-colors"
                      >
                        <div className="w-11 h-11 rounded-[3px] bg-gradient-to-br from-gz-navy to-gz-burgundy flex items-center justify-center text-xs font-semibold text-gz-cream shrink-0">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-archivo text-sm font-semibold text-gz-ink truncate">{c.firstName} {c.lastName}</div>
                          {c.universidad && <div className="font-archivo text-xs text-gz-ink-mid truncate">{c.universidad}</div>}
                        </div>
                        <div className="font-ibm-mono text-[10px] text-gz-gold shrink-0">{c.xp.toLocaleString("es-CL")}</div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="font-archivo text-sm text-gz-ink-light italic">Aún sin colegas.</p>
                )}
              </div>
            )}
          </section>

          {/* ─── SIDEBAR ──────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-3">

            {/* Acerca de */}
            <SidebarCard title="Acerca de" action={isOwnProfile ? { label: "Editar", href: "/dashboard/perfil/configuracion" } : undefined}>
              {user.bio ? (
                <p className="font-cormorant italic text-[15px] text-gz-ink leading-snug">«{user.bio}»</p>
              ) : (
                <p className="font-archivo text-sm text-gz-ink-light italic">Sin biografía aún.</p>
              )}
              <dl className="space-y-1.5 mt-3 pt-3 border-t border-gz-rule font-archivo text-[13px]">
                {user.universidad && <Info label="Universidad" value={user.sede ? `${user.universidad} · ${user.sede}` : user.universidad} />}
                {user.region && <Info label="Región" value={user.region} />}
                {user.corte && <Info label="Corte" value={user.corte} />}
                <Info label="Miembro" value={new Date(user.memberSince).toLocaleDateString("es-CL", { month: "long", year: "numeric" })} />
                {user.linkedinUrl && (
                  <div className="pt-1">
                    <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline">
                      LinkedIn →
                    </a>
                  </div>
                )}
              </dl>
            </SidebarCard>

            {/* Especialidades */}
            {especialidadesCalculadas && especialidadesCalculadas.length > 0 && (
              <SidebarCard title="Especialidades" eyebrow="top 5 · por XP">
                <ul className="space-y-2.5">
                  {especialidadesCalculadas.slice(0, 5).map((esp, i) => {
                    const colors = ["bg-gz-gold", "bg-gz-burgundy", "bg-gz-navy", "bg-gz-sage", "bg-gz-rule-dark"];
                    return (
                      <li key={esp.materia}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-archivo text-sm font-medium truncate">{esp.materia}</span>
                          <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid shrink-0">{esp.porcentaje}%</span>
                        </div>
                        <div className="h-1.5 bg-gz-cream-dark rounded-[3px] overflow-hidden">
                          <div className={`h-full ${colors[i] ?? "bg-gz-rule-dark"} rounded-[3px] transition-all`} style={{ width: `${esp.porcentaje}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SidebarCard>
            )}

            {/* Colegas preview */}
            <SidebarCard
              title={`Colegas · ${colegaCount}`}
              action={colegaCount > 0 ? { label: "Ver todos", onClick: () => setActiveTab("comunidad") } : undefined}
            >
              {colegasPreview.length > 0 ? (
                <div className="space-y-2">
                  {colegasPreview.slice(0, 4).map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/perfil/${c.id}`}
                      className="flex items-center gap-2.5 hover:bg-gz-cream-dark/30 -mx-2 px-2 py-1.5 rounded-[3px] cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-[3px] bg-gradient-to-br from-gz-navy to-gz-burgundy flex items-center justify-center text-[10px] font-semibold text-gz-cream shrink-0">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-archivo text-[13px] font-medium truncate">{c.firstName} {c.lastName}</div>
                        <div className="font-archivo text-[11px] text-gz-ink-mid truncate">{c.universidad ?? "—"}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="font-archivo text-sm text-gz-ink-light italic">Aún sin colegas.</p>
              )}
              {mutualCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gz-rule font-archivo text-xs text-gz-ink-mid">
                  <span className="text-gz-gold font-semibold">{mutualCount}</span> colega{mutualCount !== 1 ? "s" : ""} mutuo{mutualCount !== 1 ? "s" : ""}
                </div>
              )}
            </SidebarCard>

            {/* Badges destacados */}
            {topBadges && topBadges.length > 0 && (
              <SidebarCard
                title={`Logros destacados · ${earnedBadges.length}`}
                action={{ label: "Ver todos", onClick: () => setActiveTab("logros") }}
              >
                <div className="grid grid-cols-3 gap-2">
                  {topBadges.slice(0, 6).map((b) => (
                    <div key={b.slug} className="text-center cursor-pointer group" title={b.label}>
                      <div className={`aspect-square rounded-[3px] flex items-center justify-center text-2xl shadow-sm group-hover:scale-[1.03] transition-transform ${badgeTierClass(b.tier)}`}>
                        {b.emoji}
                      </div>
                      <div className="font-ibm-mono text-[8px] text-gz-ink-mid mt-1.5 uppercase tracking-[1px] line-clamp-1">{b.label}</div>
                    </div>
                  ))}
                </div>
              </SidebarCard>
            )}

            {/* Engagement mini */}
            {obiterCount > 0 && (
              <SidebarCard title="Obiter · Engagement">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniStat value={obiterCount} label="Obiter" color="text-gz-gold" />
                  <MiniStat value={obiterApoyosReceived} label="Apoyos" color="text-gz-burgundy" />
                  <MiniStat value={obiterCitasReceived} label="Citas" color="text-gz-navy" />
                </div>
              </SidebarCard>
            )}

          </aside>
        </div>
      </div>
    </main>
  );
}

// ─── Subcomponents ───────────────────────────────────────

function Stat({ label, value, accent, color }: { label: string; value: string; accent?: string; color?: string }) {
  return (
    <div className="px-3 py-1.5">
      <div className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">{label}</div>
      <div className={`font-cormorant text-xl font-semibold leading-tight ${color ?? "text-gz-ink"}`}>
        {value}
        {accent && <span className="font-archivo text-[11px] text-gz-ink-mid ml-1 font-normal">{accent}</span>}
      </div>
    </div>
  );
}

function MiniStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div className={`font-cormorant text-2xl font-semibold leading-tight ${color}`}>{value}</div>
      <div className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid mt-0.5">{label}</div>
    </div>
  );
}

function Tab({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`font-ibm-mono text-[10px] uppercase tracking-[2px] px-4 py-3 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
        active ? "border-gz-gold text-gz-ink" : "border-transparent text-gz-ink-mid hover:text-gz-ink"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 && <span className={`ml-1 ${active ? "text-gz-gold" : "text-gz-ink-light"}`}>{count}</span>}
    </button>
  );
}

function FilterPill({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`font-ibm-mono text-[10px] uppercase tracking-[1.5px] px-3 py-1.5 rounded-[3px] border whitespace-nowrap cursor-pointer transition-colors ${
        active ? "bg-gz-ink text-gz-cream border-gz-ink" : "border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark/40"
      }`}
    >
      {label} <span className={active ? "text-gz-gold" : "text-gz-ink-light"}>{count}</span>
    </button>
  );
}

function ComposeChip({ href, color, glyph, label }: { href: string; color: string; glyph: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 px-3 py-2 rounded-[3px] hover:bg-gz-cream-dark/40 cursor-pointer font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-mid">
      <span className={color}>{glyph}</span> {label}
    </Link>
  );
}

function SidebarCard({
  title, eyebrow, action, children,
}: {
  title: string; eyebrow?: string;
  action?: { label: string; href?: string; onClick?: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[3px] border border-gz-rule bg-gz-cream p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink">{title}</h3>
        {eyebrow && <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">{eyebrow}</span>}
        {action && (
          action.href ? (
            <Link href={action.href} className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline ml-auto">{action.label}</Link>
          ) : (
            <button onClick={action.onClick} className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline cursor-pointer ml-auto">{action.label}</button>
          )
        )}
      </div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light shrink-0">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function FeedCard({
  pub, authorName, authorInitials, authorAvatar, authorEtapa, authorUniv,
}: {
  pub: Publication; authorName: string; authorInitials: string; authorAvatar: string | null;
  authorEtapa: string | null; authorUniv: string | null;
}) {
  const kindMeta: Record<PublicationKind, { label: string; href: string; color: string; bg: string; glyph: string }> = {
    obiter: { label: "Obiter Dictum", href: `/dashboard/diario/${pub.id}`, color: "text-gz-gold", bg: "bg-gz-gold/10", glyph: "§" },
    analisis: { label: "Análisis de Sentencia", href: `/dashboard/diario/analisis/${pub.id}`, color: "text-gz-navy", bg: "bg-gz-navy/10", glyph: "¶" },
    ensayo: { label: "Ensayo", href: `/dashboard/diario/ensayos/${pub.id}`, color: "text-gz-sage", bg: "bg-gz-sage/10", glyph: "◆" },
    debate: { label: "Debate Jurídico", href: `/dashboard/diario/debates/${pub.id}`, color: "text-gz-burgundy", bg: "bg-gz-burgundy/10", glyph: "‡" },
    columna: { label: "Columna de Opinión", href: `/dashboard/diario/columnas/${pub.id}`, color: "text-gz-ink-mid", bg: "bg-gz-ink/5", glyph: "◇" },
  };
  const meta = kindMeta[pub.kind];

  return (
    <article className="rounded-[3px] border border-gz-rule bg-gz-cream p-4 hover:border-gz-rule-dark transition-colors">
      {/* Author row */}
      <header className="flex items-center gap-3 mb-3">
        {authorAvatar ? (
          <img src={authorAvatar} alt="" className="w-10 h-10 rounded-[3px] object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-[3px] bg-gz-navy text-gz-cream flex items-center justify-center text-xs font-semibold shrink-0">
            {authorInitials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-archivo text-sm font-semibold truncate">{authorName}</div>
          <div className="font-archivo text-[11px] text-gz-ink-mid truncate">
            {authorEtapa && <span>{authorEtapa}</span>}
            {authorUniv && <span> · {authorUniv}</span>}
          </div>
        </div>
        <span className={`font-ibm-mono text-[10px] uppercase tracking-[1.5px] ${meta.bg} ${meta.color} px-2 py-1 rounded-[3px] shrink-0 flex items-center gap-1`}>
          <span>{meta.glyph}</span> {meta.label.split(" ")[0]}
        </span>
      </header>

      {/* Body */}
      {pub.kind === "obiter" ? (
        <blockquote className="font-cormorant text-xl italic leading-snug text-gz-ink pl-4 border-l-[3px] border-gz-gold my-2">
          {pub.contenido}
        </blockquote>
      ) : (
        <Link href={meta.href} className="block hover:opacity-80 transition-opacity">
          <h4 className="font-cormorant text-2xl font-semibold leading-tight text-gz-ink mb-2">{pub.titulo}</h4>
          {pub.tribunal && (
            <div className="inline-block font-ibm-mono text-[10px] uppercase tracking-[1.5px] bg-gz-cream-dark/60 px-2 py-0.5 rounded-[3px] mb-2">
              {pub.tribunal}
            </div>
          )}
          {pub.resumen && (
            <p className="font-archivo text-sm text-gz-ink-mid leading-relaxed line-clamp-3">{pub.resumen}</p>
          )}
        </Link>
      )}

      {/* Footer */}
      <footer className="flex items-center gap-4 mt-3 pt-3 border-t border-gz-rule font-archivo text-xs text-gz-ink-mid">
        <span className="flex items-center gap-1"><span className="text-gz-burgundy">♥</span> {pub.apoyosCount}</span>
        <span className="flex items-center gap-1"><span className="text-gz-gold">❝</span> {pub.citasCount}</span>
        {pub.viewsCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">Lect.</span>
            {pub.viewsCount}
          </span>
        )}
        <span className="ml-auto text-gz-ink-light">{timeAgo(pub.createdAt)}</span>
        <Link href={meta.href} className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline">Ver →</Link>
      </footer>
    </article>
  );
}

function trayectoriaLabel(tipo: string): string {
  if (tipo === "ingreso") return "Ingreso a la universidad";
  if (tipo === "egreso") return "Egreso";
  if (tipo === "jura") return "Juramento como abogado/a";
  if (tipo === "empleo") return "Empleo actual";
  return tipo;
}

function badgeTierClass(tier: string): string {
  if (tier === "unique") return "bg-gradient-to-br from-gz-burgundy to-gz-navy text-gz-cream";
  if (tier === "special") return "bg-gradient-to-br from-gz-navy to-gz-sage text-gz-cream";
  if (tier === "gold") return "bg-gradient-to-br from-gz-gold-bright to-gz-gold text-gz-cream";
  if (tier === "silver") return "bg-gradient-to-br from-gz-rule-dark to-gz-ink-mid text-gz-cream";
  if (tier === "bronze") return "bg-gradient-to-br from-gz-burgundy/70 to-gz-burgundy text-gz-cream";
  return "bg-gz-cream border-2 border-dashed border-gz-rule-dark text-gz-ink-mid";
}
