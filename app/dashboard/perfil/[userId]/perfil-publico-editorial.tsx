"use client";

/**
 * VARIANT A — EDITORIAL / NEWSPAPER
 * ─────────────────────────────────
 * Broadsheet metaphor: the profile is printed as a front page.
 * Masthead with volume/issue · nameplate · deckhead · two-column meta rail.
 * Rules heavier, gutters generous, gold used sparingly as a ledger accent.
 * Tabs rendered as section tabs in a "section strip" (Artes · Deportes · Opinión).
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BADGE_RULES } from "@/lib/badge-constants";
import { TIER_LABELS, TIER_EMOJIS, getGradoInfo } from "@/lib/league";
import { ReportModal } from "@/app/components/report-modal";
import { AreasRadar } from "./areas-radar";

// ─── Types (shared shape with perfil-publico.tsx) ────────

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

interface PerfilEditorialProps {
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
  especialidadesDeclaradas?: string[];
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
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const dd = Math.floor(h / 24);
  if (dd < 30) return `hace ${dd}d`;
  return new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

// Roman month number for masthead (I = enero)
function mastheadDate(): { day: string; month: string; year: string } {
  const now = new Date();
  return {
    day: String(now.getDate()).padStart(2, "0"),
    month: toRoman(now.getMonth() + 1),
    year: String(now.getFullYear()),
  };
}

// ─── Component ───────────────────────────────────────────

export function PerfilEditorial({
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
  especialidadesDeclaradas,
  trayectoria,
  topBadges,
}: PerfilEditorialProps) {
  const [colegaStatus, setColegaStatus] = useState(initialStatus);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"publicaciones" | "trayectoria" | "logros" | "comunidad" | "cv">("publicaciones");
  const [pubFilter, setPubFilter] = useState<string>("TODOS");
  const [showCvModal, setShowCvModal] = useState(false);
  const [cvMessage, setCvMessage] = useState("");
  const [cvLoading, setCvLoading] = useState(false);
  const [cvStatus, setCvStatus] = useState<string | null | undefined>(cvRequestStatus);

  const gradoInfo = user.grado ? getGradoInfo(user.grado) : null;
  const gradoRoman = user.grado ? toRoman(user.grado) : null;
  const tierLabel = user.tier ? TIER_LABELS[user.tier] ?? user.tier : null;
  const tierEmoji = user.tier ? TIER_EMOJIS[user.tier] ?? "" : "";
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const etapa = etapaLabel(user.etapaActual);
  const totalCausas = user.causasGanadas + user.causasPerdidas;
  const md = mastheadDate();
  const volNum = user.grado ? toRoman(user.grado) : "I";
  const issueNum = toRoman(Math.max(1, user.xp % 999 || 1));

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

  // ─ Colega handlers (same API as perfil-publico) ──────
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

  async function handleCvRequest() {
    setCvLoading(true);
    try {
      const res = await fetch("/api/cv-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: user.id, message: cvMessage || null }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Error al enviar solicitud");
      setCvStatus("pending");
      setShowCvModal(false);
      setCvMessage("");
      toast.success("Solicitud de CV enviada");
    } catch { toast.error("Error de conexión"); } finally { setCvLoading(false); }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-4 pb-16">

        {/* ═══ MASTHEAD ════════════════════════════════════════ */}
        <header className="border-t-[3px] border-b border-gz-ink pt-3 pb-2 mb-0">
          <div className="flex items-baseline justify-between gap-4">
            <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-mid">
              Studio IURIS · Perfil Público
            </div>
            <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-mid hidden sm:block">
              Vol. {volNum} · Núm. {issueNum}
            </div>
            <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-mid">
              {md.day} · {md.month} · {md.year}
            </div>
          </div>
        </header>

        {/* ═══ NAMEPLATE ═══════════════════════════════════════ */}
        <section
          className="border-b-[3px] border-gz-ink py-6 sm:py-10 relative"
          style={
            user.coverUrl
              ? {
                  // rgba fallback (no color-mix) — cream is #F5F0E6 ≈ rgb(245,240,230)
                  backgroundImage: `linear-gradient(to bottom, rgba(245,240,230,0.88), rgba(245,240,230,1) 90%), url(${user.coverUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          {/* Faint rule flourish top */}
          <div className="absolute top-2 left-0 right-0 h-px bg-gz-rule" />

          <div className="text-center">
            {etapa && (
              <div className="font-ibm-mono text-[10px] uppercase tracking-[4px] text-gz-gold mb-3">
                {user.etapaActual === "estudiante" && user.universityYear ? (
                  <>— {etapa} · {toRoman(user.universityYear)}º año —</>
                ) : user.etapaActual === "egresado" && user.anioEgreso ? (
                  <>— {etapa} · Egresó {user.anioEgreso} —</>
                ) : user.etapaActual === "abogado" && user.empleoActual ? (
                  <>— {etapa}{user.cargoActual ? ` · ${user.cargoActual}` : ""} · {user.empleoActual} —</>
                ) : (
                  <>— {etapa} —</>
                )}
              </div>
            )}
            <h1 className="font-cormorant text-4xl sm:text-5xl lg:text-7xl font-semibold leading-[0.95] text-gz-ink tracking-[-0.01em]">
              {user.firstName} <span className="italic font-normal">{user.lastName}</span>
            </h1>
            <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink-mid mt-4">
              {user.universidad && <span>{user.universidad}</span>}
              {user.sede && <span> · {user.sede}</span>}
              {user.region && <span> · {user.region}</span>}
            </div>
          </div>

          {/* Corner ornaments */}
          <div className="absolute top-4 left-4 font-cormorant italic text-2xl text-gz-gold opacity-60">§</div>
          <div className="absolute top-4 right-4 font-cormorant italic text-2xl text-gz-gold opacity-60">§</div>
        </section>

        {/* ═══ IDENTITY RAIL (avatar + ledger) ════════════════ */}
        <section className="grid grid-cols-12 gap-0 border-b border-gz-ink">
          {/* Avatar column — no border-radius (woodcut / portrait feel) */}
          <div className="col-span-12 sm:col-span-3 border-r border-gz-rule p-5 flex sm:flex-col items-center sm:items-start gap-4 sm:gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-[88px] h-[88px] sm:w-full sm:h-auto sm:aspect-square object-cover border border-gz-ink shrink-0"
                style={{ filter: "sepia(0.12) contrast(1.02)" }}
              />
            ) : (
              <div className="w-[88px] h-[88px] sm:w-full sm:aspect-square bg-gz-ink text-gz-cream flex items-center justify-center font-cormorant text-4xl sm:text-6xl shrink-0 border border-gz-ink">
                {initials}
              </div>
            )}
            <div className="sm:w-full">
              <div className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">Retrato</div>
              <div className="font-cormorant italic text-gz-ink-mid text-sm leading-tight">
                Grabado de<br />{user.firstName.split(" ")[0]}
              </div>
            </div>
          </div>

          {/* Ledger — deckhead + meta */}
          <div className="col-span-12 sm:col-span-9 p-5 sm:p-6">
            {/* Deckhead */}
            <div className="font-cormorant italic text-2xl sm:text-3xl leading-tight text-gz-ink-mid mb-5 max-w-3xl">
              {gradoInfo
                ? <>De grado <span className="not-italic font-semibold text-gz-ink">{gradoRoman}</span> — {gradoInfo.nombre}.{tierLabel ? <> Ocupa por ahora el tier <span className="not-italic font-semibold text-gz-gold">{tierLabel}</span> en La Liga de la Toga.</> : ""}</>
                : <>Miembro del claustro iurístico desde {new Date(user.memberSince).getFullYear()}.</>}
            </div>

            {/* Ledger grid — 4 cells, thin rules */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-l border-gz-rule">
              <LedgerCell label="Experiencia" value={user.xp.toLocaleString("es-CL")} unit="XP" />
              <LedgerCell label="Grado" value={gradoRoman ?? "—"} unit={gradoInfo?.nombre ?? ""} emphasis="gold" />
              <LedgerCell
                label="Causas"
                value={totalCausas > 0 ? `${user.causasGanadas}–${user.causasPerdidas}` : "—"}
                unit={totalCausas > 0 ? `${user.winRate}%` : ""}
              />
              <LedgerCell label="Colegas" value={colegaCount.toString()} unit={tierLabel ? `${tierEmoji} ${tierLabel}` : ""} />
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between gap-3 flex-wrap mt-5 pt-4 border-t border-gz-rule">
              <div className="flex items-center gap-4 text-xs font-archivo text-gz-ink-mid flex-wrap">
                {user.anioIngreso && <span>Ingreso <span className="text-gz-ink">{user.anioIngreso}</span></span>}
                {user.anioEgreso && <span>· Egreso <span className="text-gz-ink">{user.anioEgreso}</span></span>}
                {user.anioJura && <span>· Juró <span className="text-gz-ink">{user.anioJura}</span></span>}
                {user.corte && <span>· {user.corte}</span>}
              </div>

              <div className="flex gap-2">
                {isOwnProfile ? (
                  <Link
                    href="/dashboard/perfil/configuracion"
                    className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-ink text-gz-ink px-4 py-2 hover:bg-gz-ink hover:text-gz-cream transition-colors cursor-pointer"
                  >
                    Editar edición
                  </Link>
                ) : (
                  <>
                    {colegaStatus === "none" && (
                      <button
                        onClick={handleSendRequest}
                        disabled={loading}
                        className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink text-gz-cream px-4 py-2 hover:bg-gz-burgundy transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Suscribirse como colega
                      </button>
                    )}
                    {colegaStatus === "pending_sent" && (
                      <button
                        onClick={handleCancelRequest}
                        disabled={loading}
                        className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-ink-mid text-gz-ink-mid px-4 py-2 hover:bg-gz-cream-dark transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Solicitud enviada · Cancelar
                      </button>
                    )}
                    {colegaStatus === "pending_received" && (
                      <>
                        <button
                          onClick={handleAcceptRequest}
                          disabled={loading}
                          className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-sage text-gz-cream px-4 py-2 hover:bg-gz-ink transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Aceptar
                        </button>
                        <button
                          onClick={handleDeclineRequest}
                          disabled={loading}
                          className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule text-gz-ink-mid px-4 py-2 hover:bg-gz-cream-dark transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Declinar
                        </button>
                      </>
                    )}
                    {colegaStatus === "accepted" && (
                      <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-sage text-gz-sage px-4 py-2">
                        ✓ Colega suscrito
                      </span>
                    )}
                    {colegaStatus === "declined" && (
                      <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule text-gz-ink-light px-4 py-2">
                        Solicitud declinada
                      </span>
                    )}
                    <ReportModal
                      reportadoId={user.id}
                      trigger={
                        <button
                          aria-label="Reportar perfil"
                          className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule-dark px-3 py-2 hover:bg-gz-cream-dark cursor-pointer"
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
          </div>
        </section>

        {/* ═══ SECTION STRIP (tabs as newspaper sections) ══════ */}
        <nav className="border-b border-gz-ink mb-6 overflow-x-auto" aria-label="Secciones del perfil">
          <div className="flex items-stretch" role="tablist">
            <SectionTab label="Publicaciones" count={pubCounts.total} active={activeSection === "publicaciones"} onClick={() => setActiveSection("publicaciones")} />
            <SectionTab label="Trayectoria" count={trayectoria?.length ?? 0} active={activeSection === "trayectoria"} onClick={() => setActiveSection("trayectoria")} />
            <SectionTab label="Distinciones" count={earnedBadges.length} active={activeSection === "logros"} onClick={() => setActiveSection("logros")} />
            <SectionTab label="Claustro" count={colegaCount} active={activeSection === "comunidad"} onClick={() => setActiveSection("comunidad")} />
            {user.cvAvailable && (
              <SectionTab label="CV" active={activeSection === "cv"} onClick={() => setActiveSection("cv")} />
            )}
            <div className="ml-auto hidden sm:flex items-center px-4 font-cormorant italic text-sm text-gz-ink-light">
              «Pondera · Veritas · Ius»
            </div>
          </div>
        </nav>

        {/* ═══ CONTENT: 2-COLUMN BROADSHEET ═════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ─── MAIN (feed) ─────────────────────────────────── */}
          <section className="lg:col-span-8 space-y-0">
            {activeSection === "publicaciones" && (
              <>
                {/* Filter chips — ink, no pills */}
                <div className="flex items-center gap-0 border-b border-gz-rule mb-4 overflow-x-auto">
                  <FilterLink active={pubFilter === "TODOS"} label="Todos" count={pubCounts.total} onClick={() => setPubFilter("TODOS")} />
                  <FilterLink active={pubFilter === "obiter"} label="Obiter" count={pubCounts.obiter} onClick={() => setPubFilter("obiter")} />
                  <FilterLink active={pubFilter === "analisis"} label="Análisis" count={pubCounts.analisis} onClick={() => setPubFilter("analisis")} />
                  <FilterLink active={pubFilter === "ensayo"} label="Ensayo" count={pubCounts.ensayo} onClick={() => setPubFilter("ensayo")} />
                  <FilterLink active={pubFilter === "debate"} label="Debate" count={pubCounts.debate} onClick={() => setPubFilter("debate")} />
                  <FilterLink active={pubFilter === "columna"} label="Columnas" count={pubCounts.columna} onClick={() => setPubFilter("columna")} />
                </div>

                {filteredPubs.length === 0 ? (
                  <EmptyState isOwnProfile={isOwnProfile} firstName={user.firstName} />
                ) : (
                  <div className="divide-y-[2px] divide-gz-ink">
                    {filteredPubs.map((p) => (
                      <EditorialArticle key={p.id} pub={p} authorName={`${user.firstName} ${user.lastName}`} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeSection === "trayectoria" && (
              <article className="py-4">
                <h2 className="font-cormorant text-3xl font-semibold border-b-[2px] border-gz-ink pb-2 mb-5">
                  Trayectoria
                </h2>
                {trayectoria && trayectoria.length > 0 ? (
                  <ol className="space-y-6">
                    {trayectoria.map((t, i) => (
                      <li key={i} className="grid grid-cols-12 gap-4 border-b border-gz-rule pb-5 last:border-0">
                        <div className="col-span-3 sm:col-span-2 text-right">
                          <div className="font-cormorant italic text-3xl text-gz-gold leading-none">{t.anio}</div>
                          <div className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mt-1">{toRoman(i + 1)}</div>
                        </div>
                        <div className="col-span-9 sm:col-span-10 border-l border-gz-rule pl-5">
                          <h3 className="font-cormorant text-2xl text-gz-ink">{trayectoriaLabel(t.tipo)}</h3>
                          {t.detalle && <p className="font-archivo text-sm text-gz-ink-mid mt-1">{t.detalle}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="font-cormorant italic text-gz-ink-light">Sin trayectoria consignada en este ejemplar.</p>
                )}
              </article>
            )}

            {activeSection === "logros" && (
              <article className="py-4">
                <h2 className="font-cormorant text-3xl font-semibold border-b-[2px] border-gz-ink pb-2 mb-5">
                  Distinciones <span className="font-archivo text-sm text-gz-ink-light">· {earnedBadges.length}</span>
                </h2>
                {earnedBadges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
                    {BADGE_RULES.filter((b) => earnedBadges.includes(b.slug)).map((b) => (
                      <div key={b.slug} className="flex gap-3 border-b border-gz-rule pb-4">
                        <div className={`w-12 h-12 flex items-center justify-center text-xl shrink-0 ${badgeTierBg(b.tier)}`}>
                          {b.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="font-cormorant text-lg text-gz-ink leading-tight">{b.label}</div>
                          <div className="font-archivo text-[11px] text-gz-ink-mid leading-snug mt-0.5">{b.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-cormorant italic text-gz-ink-light">Aún sin distinciones en el registro.</p>
                )}
              </article>
            )}

            {activeSection === "comunidad" && (
              <article className="py-4">
                <h2 className="font-cormorant text-3xl font-semibold border-b-[2px] border-gz-ink pb-2 mb-5">
                  Claustro · {colegaCount}
                </h2>
                {colegasPreview.length > 0 ? (
                  <ul className="divide-y divide-gz-rule">
                    {colegasPreview.map((c) => (
                      <li key={c.id}>
                        <Link href={`/dashboard/perfil/${c.id}`} className="grid grid-cols-12 gap-3 py-3 items-center hover:bg-gz-cream-dark/30 cursor-pointer">
                          <div className="col-span-1 w-10 h-10 bg-gz-ink text-gz-cream flex items-center justify-center text-[11px] font-semibold border border-gz-ink">
                            {c.firstName[0]}{c.lastName[0]}
                          </div>
                          <div className="col-span-8 min-w-0">
                            <div className="font-cormorant text-lg leading-tight">{c.firstName} {c.lastName}</div>
                            <div className="font-archivo text-xs text-gz-ink-mid truncate">{c.universidad ?? "—"}</div>
                          </div>
                          <div className="col-span-3 text-right font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold">
                            {c.xp.toLocaleString("es-CL")} XP
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-cormorant italic text-gz-ink-light">Sin suscriptores en el claustro.</p>
                )}
              </article>
            )}

            {activeSection === "cv" && user.cvAvailable && (
              <article className="py-4">
                <h2 className="font-cormorant text-3xl font-semibold border-b-[2px] border-gz-ink pb-2 mb-5">
                  Curriculum Vitae
                </h2>
                <div className="border border-gz-rule p-8 text-center bg-gz-cream-dark/20">
                  <div className="font-cormorant italic text-2xl text-gz-ink-mid mb-2">
                    {isOwnProfile
                      ? "Tu CV está disponible para el claustro."
                      : cvStatus === "approved" || cvStatus === "APPROVED"
                      ? "Tu solicitud fue aprobada."
                      : cvStatus === "pending" || cvStatus === "PENDING"
                      ? "Solicitud en trámite."
                      : cvStatus === "rejected" || cvStatus === "REJECTED"
                      ? "Solicitud rechazada."
                      : "CV disponible bajo solicitud."}
                  </div>
                  <p className="font-archivo text-sm text-gz-ink-mid mb-5 max-w-md mx-auto">
                    {isOwnProfile
                      ? "Otros colegas pueden requerir acceso. Aprobarás cada solicitud individualmente."
                      : cvStatus === "approved" || cvStatus === "APPROVED"
                      ? `Puedes descargar el CV de ${user.firstName} desde el menú de colegas.`
                      : cvStatus === "pending" || cvStatus === "PENDING"
                      ? `${user.firstName} recibió tu solicitud. Te avisaremos cuando responda.`
                      : cvStatus === "rejected" || cvStatus === "REJECTED"
                      ? `${user.firstName} no autorizó el acceso esta vez.`
                      : `Envía una solicitud a ${user.firstName} para revisar su CV completo.`}
                  </p>
                  {!isOwnProfile && !cvStatus && (
                    <button
                      onClick={() => setShowCvModal(true)}
                      className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink text-gz-cream px-5 py-2.5 hover:bg-gz-burgundy transition-colors cursor-pointer inline-block"
                    >
                      Requerir acceso al CV
                    </button>
                  )}
                </div>
              </article>
            )}
          </section>

          {/* ─── SIDEBAR (editorial column) ─────────────────── */}
          <aside className="lg:col-span-4 space-y-6 lg:border-l lg:border-gz-rule lg:pl-6">

            {/* Presentación */}
            <div>
              <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink border-b border-gz-ink pb-1 mb-3">
                Presentación
              </div>
              {user.bio ? (
                <p className="font-cormorant italic text-base leading-snug text-gz-ink mb-4">«{user.bio}»</p>
              ) : (
                <p className="font-archivo text-sm text-gz-ink-light italic mb-4">Sin biografía consignada.</p>
              )}
              <dl className="space-y-1.5 font-archivo text-[13px]">
                {etapa && <InfoLine label="Etapa" value={etapa} />}
                {user.universidad && <InfoLine label="Universidad" value={user.universidad} />}
                {user.region && <InfoLine label="Región" value={user.region} />}
                {user.empleoActual && <InfoLine label="Empleo" value={user.empleoActual} />}
                <InfoLine label="Miembro desde" value={new Date(user.memberSince).toLocaleDateString("es-CL", { month: "long", year: "numeric" })} />
              </dl>
              {user.linkedinUrl && (
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline"
                >
                  LinkedIn →
                </a>
              )}
            </div>

            {/* Trayectoria (mini — editorial) */}
            {trayectoria && trayectoria.length > 0 && (
              <div>
                <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink border-b border-gz-ink pb-1 mb-3 flex justify-between">
                  <span>Trayectoria</span>
                  <button
                    onClick={() => setActiveSection("trayectoria")}
                    className="text-gz-gold hover:underline cursor-pointer"
                  >
                    ver todo →
                  </button>
                </div>
                <ol className="relative border-l border-gz-ink pl-4 space-y-3">
                  {trayectoria.slice(0, 4).map((t, i) => (
                    <li key={i} className="relative">
                      <div className="absolute -left-[19px] top-[6px] w-[7px] h-[7px] bg-gz-ink border border-gz-cream" />
                      <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">{t.anio}</div>
                      <div className="font-cormorant text-base text-gz-ink leading-tight">{trayectoriaLabel(t.tipo)}</div>
                      {t.detalle && <div className="font-archivo text-[12px] text-gz-ink-mid">{t.detalle}</div>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Áreas practicadas (auto — radar editorial) */}
            {especialidadesCalculadas && especialidadesCalculadas.length > 0 && (
              <div>
                <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink border-b border-gz-ink pb-1 mb-3">
                  Áreas practicadas · <span className="text-gz-ink-light">por XP</span>
                </div>
                {especialidadesCalculadas.length >= 3 ? (
                  <div className="border border-gz-rule bg-gz-cream px-2 py-2">
                    <AreasRadar data={especialidadesCalculadas} height={220} accent="gold" />
                  </div>
                ) : (
                  <ol className="space-y-3">
                    {especialidadesCalculadas.map((esp, i) => (
                      <li key={esp.materia}>
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-ibm-mono text-[10px] text-gz-ink-light">{toRoman(i + 1)}.</span>
                            <span className="font-cormorant text-base truncate">{esp.materia}</span>
                          </div>
                          <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold shrink-0">{esp.porcentaje}%</span>
                        </div>
                        <div className="h-[3px] bg-gz-rule">
                          <div className="h-full bg-gz-ink" style={{ width: `${esp.porcentaje}%` }} />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            {/* Especialidades declaradas (user-curated) */}
            <div>
              <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink border-b border-gz-ink pb-1 mb-3 flex justify-between">
                <span>Especialidades</span>
                {isOwnProfile && (
                  <Link href="/dashboard/perfil/configuracion#especialidades" className="text-gz-gold hover:underline cursor-pointer">
                    editar →
                  </Link>
                )}
              </div>
              {especialidadesDeclaradas && especialidadesDeclaradas.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {especialidadesDeclaradas.map((esp) => (
                    <li
                      key={esp}
                      className="font-archivo text-[12px] text-gz-ink border border-gz-ink px-2 py-0.5"
                    >
                      {esp}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-archivo text-xs text-gz-ink-light italic">
                  {isOwnProfile ? (
                    <>
                      Aún sin declarar.{" "}
                      <Link href="/dashboard/perfil/configuracion#especialidades" className="text-gz-gold hover:underline not-italic">
                        Declara tus áreas →
                      </Link>
                    </>
                  ) : (
                    "Sin declarar."
                  )}
                </p>
              )}
            </div>

            {/* Claustro preview */}
            <div>
              <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink border-b border-gz-ink pb-1 mb-3 flex justify-between">
                <span>Claustro · {colegaCount}</span>
                <button onClick={() => setActiveSection("comunidad")} className="text-gz-gold hover:underline cursor-pointer">
                  ver →
                </button>
              </div>
              {colegasPreview.length > 0 ? (
                <div className="grid grid-cols-6 gap-1">
                  {colegasPreview.slice(0, 6).map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/perfil/${c.id}`}
                      className="aspect-square bg-gz-ink text-gz-cream flex items-center justify-center text-[10px] font-semibold border border-gz-ink hover:border-gz-gold cursor-pointer"
                      title={`${c.firstName} ${c.lastName}`}
                    >
                      {c.firstName[0]}{c.lastName[0]}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="font-archivo text-xs text-gz-ink-light italic">Aún sin colegas.</p>
              )}
            </div>

            {/* Top badges */}
            {topBadges && topBadges.length > 0 && (
              <div>
                <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink border-b border-gz-ink pb-1 mb-3">
                  Distinciones destacadas
                </div>
                <ul className="space-y-2">
                  {topBadges.slice(0, 4).map((b) => (
                    <li key={b.slug} className="flex gap-3 items-center">
                      <div className={`w-9 h-9 flex items-center justify-center text-lg shrink-0 ${badgeTierBg(b.tier)}`}>
                        {b.emoji}
                      </div>
                      <div className="font-archivo text-xs text-gz-ink leading-tight min-w-0">{b.label}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Engagement ledger */}
            {obiterCount > 0 && (
              <div>
                <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink border-b border-gz-ink pb-1 mb-3">
                  Tiraje Obiter
                </div>
                <div className="grid grid-cols-3 text-center border-t border-l border-gz-rule">
                  <LedgerCell small label="Obiter" value={obiterCount.toString()} />
                  <LedgerCell small label="Apoyos" value={obiterApoyosReceived.toString()} emphasis="burgundy" />
                  <LedgerCell small label="Citas" value={obiterCitasReceived.toString()} emphasis="gold" />
                </div>
              </div>
            )}

            {/* Colophon */}
            <div className="pt-4 border-t border-gz-ink font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-light text-center leading-relaxed">
              Studio IURIS · Edición {md.year}<br />
              <span className="font-cormorant italic normal-case text-sm text-gz-ink-mid tracking-normal">— Fiat iustitia —</span>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ CV MODAL (editorial-style) ═══════════════════════ */}
      {showCvModal && (
        <div
          className="fixed inset-0 z-50 bg-gz-ink/50 flex items-center justify-center p-4"
          onClick={() => setShowCvModal(false)}
        >
          <div
            className="bg-gz-cream border-t-[3px] border-b border-gz-ink max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-mid border-b border-gz-rule pb-2 mb-4 flex justify-between">
              <span>Requerimiento</span>
              <span>{mastheadDate().day} · {mastheadDate().month} · {mastheadDate().year}</span>
            </div>
            <h3 className="font-cormorant text-3xl font-semibold leading-tight mb-2">
              Solicitar el <span className="italic">Curriculum Vitae</span>
            </h3>
            <p className="font-archivo text-sm text-gz-ink-mid mb-4 leading-relaxed">
              Envía un mensaje a <span className="text-gz-ink font-medium">{user.firstName}</span> para solicitar acceso a su CV.
            </p>
            <textarea
              value={cvMessage}
              onChange={(e) => setCvMessage(e.target.value)}
              placeholder="Ej: Hola, me interesó tu perfil para una oportunidad laboral…"
              className="w-full border border-gz-rule p-3 text-sm mb-4 min-h-[100px] bg-gz-cream-dark/30 font-archivo leading-relaxed focus:outline-none focus:border-gz-ink"
              maxLength={500}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCvModal(false)}
                className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule-dark px-4 py-2.5 hover:bg-gz-cream-dark cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCvRequest}
                disabled={cvLoading}
                className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink text-gz-cream px-4 py-2.5 hover:bg-gz-burgundy transition-colors cursor-pointer disabled:opacity-50"
              >
                {cvLoading ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Subcomponents ───────────────────────────────────────

function LedgerCell({
  label, value, unit, emphasis, small,
}: { label: string; value: string; unit?: string; emphasis?: "gold" | "burgundy"; small?: boolean }) {
  const color = emphasis === "gold" ? "text-gz-gold" : emphasis === "burgundy" ? "text-gz-burgundy" : "text-gz-ink";
  return (
    <div className="border-r border-b border-gz-rule p-3">
      <div className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">{label}</div>
      <div className={`font-cormorant font-semibold leading-tight ${small ? "text-xl" : "text-3xl"} ${color}`}>
        {value}
      </div>
      {unit && <div className="font-archivo text-[11px] text-gz-ink-mid mt-0.5 truncate">{unit}</div>}
    </div>
  );
}

function SectionTab({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`font-ibm-mono text-[10px] uppercase tracking-[3px] px-5 py-3 border-r border-gz-rule whitespace-nowrap cursor-pointer transition-colors ${
        active ? "bg-gz-ink text-gz-cream" : "text-gz-ink-mid hover:text-gz-ink hover:bg-gz-cream-dark/30"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 && (
        <span className={`ml-1.5 ${active ? "text-gz-gold" : "text-gz-ink-light"}`}>· {count}</span>
      )}
    </button>
  );
}

function FilterLink({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`font-ibm-mono text-[10px] uppercase tracking-[2px] px-4 py-2.5 cursor-pointer border-b-[2px] whitespace-nowrap transition-colors ${
        active ? "border-gz-gold text-gz-ink" : "border-transparent text-gz-ink-mid hover:text-gz-ink"
      }`}
    >
      {label} <span className="text-gz-ink-light">· {count}</span>
    </button>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gz-rule pb-1">
      <dt className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light shrink-0">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function EmptyState({ isOwnProfile, firstName }: { isOwnProfile: boolean; firstName: string }) {
  return (
    <div className="border-y-[2px] border-gz-ink py-12 text-center">
      <p className="font-cormorant italic text-2xl text-gz-ink-mid mb-1">
        {isOwnProfile ? "Aún no has ido a imprenta." : "Sin publicaciones aún."}
      </p>
      <p className="font-archivo text-sm text-gz-ink-light">
        {isOwnProfile ? "Comparte tu primer Obiter Dictum en El Diario." : `${firstName} no ha publicado en este ejemplar.`}
      </p>
    </div>
  );
}

function EditorialArticle({
  pub, authorName,
}: { pub: Publication; authorName: string }) {
  const kindMeta: Record<PublicationKind, { label: string; href: string; color: string }> = {
    obiter: { label: "Obiter Dictum", href: `/dashboard/diario/${pub.id}`, color: "text-gz-gold" },
    analisis: { label: "Análisis de Sentencia", href: `/dashboard/diario/analisis/${pub.id}`, color: "text-gz-navy" },
    ensayo: { label: "Ensayo", href: `/dashboard/diario/ensayos/${pub.id}`, color: "text-gz-sage" },
    debate: { label: "Debate Jurídico", href: `/dashboard/diario/debates/${pub.id}`, color: "text-gz-burgundy" },
    columna: { label: "Columna de Opinión", href: `/dashboard/diario/columnas/${pub.id}`, color: "text-gz-ink-mid" },
  };
  const meta = kindMeta[pub.kind];

  return (
    <article className="py-6">
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-ibm-mono text-[9px] uppercase tracking-[3px] ${meta.color}`}>— {meta.label} —</span>
        {pub.materia && <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">· {pub.materia}</span>}
      </div>

      {pub.kind === "obiter" ? (
        <blockquote className="font-cormorant text-2xl sm:text-3xl italic leading-snug text-gz-ink border-l-[3px] border-gz-gold pl-5 my-2">
          {pub.contenido}
        </blockquote>
      ) : (
        <Link href={meta.href} className="block hover:opacity-80 transition-opacity">
          <h3 className="font-cormorant text-3xl sm:text-[36px] font-semibold leading-[1.05] text-gz-ink mb-2">
            {pub.titulo}
          </h3>
          {pub.resumen && (
            <p className="font-archivo text-[15px] leading-relaxed text-gz-ink-mid max-w-2xl" style={{ columnCount: 1 }}>
              {pub.resumen}
            </p>
          )}
        </Link>
      )}

      <div className="flex items-center gap-4 mt-4 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
        <span>Por <span className="text-gz-ink">{authorName}</span></span>
        <span>· {timeAgo(pub.createdAt)}</span>
        <span className="ml-auto flex items-center gap-3">
          <span>♥ {pub.apoyosCount}</span>
          <span>❝ {pub.citasCount}</span>
          <Link href={meta.href} className="text-gz-gold hover:underline">Leer →</Link>
        </span>
      </div>
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

function badgeTierBg(tier: string): string {
  if (tier === "unique") return "bg-gradient-to-br from-gz-burgundy to-gz-navy text-gz-cream";
  if (tier === "special") return "bg-gradient-to-br from-gz-navy to-gz-sage text-gz-cream";
  if (tier === "gold") return "bg-gz-gold text-gz-cream";
  if (tier === "silver") return "bg-gz-ink-mid text-gz-cream";
  if (tier === "bronze") return "bg-gz-burgundy text-gz-cream";
  return "bg-gz-cream border border-gz-rule-dark text-gz-ink-mid";
}
