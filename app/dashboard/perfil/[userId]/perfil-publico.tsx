"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BADGE_RULES } from "@/lib/badge-constants";
import { getGradoInfo, NIVELES, getNivel } from "@/lib/league";
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
  coverUrl: string | null;
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
  flashcardsStudied: number;
  mcqAttempts: number;
  trueFalseAttempts: number;
  memberSince: string;
  etapaActual: string | null;
  anioIngreso: number | null;
  anioEgreso: number | null;
  anioJura: number | null;
  empleoActual: string | null;
  cargoActual: string | null;
  especialidades: string | null;
  intereses: string | null;
  linkedinUrl: string | null;
  togaTierName: string;
  togaTierEmoji: string;
  togaTierTopLabel: string;
}

interface ColegaPreview {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  tier: string | null;
  xp: number;
}

type PublicationKind = "obiter" | "analisis" | "ensayo" | "debate" | "columna";

interface Publication {
  id: string;
  kind: PublicationKind;
  titulo: string | null;
  contenido: string | null;
  materia: string | null;
  tipo: string | null;
  tribunal: string | null;
  resumen: string | null;
  apoyosCount: number;
  citasCount: number;
  guardadosCount: number;
  viewsCount: number;
  createdAt: string;
}

interface TutorStats {
  sesionesCompletadas: number;
  ratingPromedio: number | null;
  totalEvaluaciones: number;
  horasAcumuladas: number;
}

interface RecentEvaluation {
  rating: number;
  comentario: string;
  evaluadorNombre: string;
}

interface PerfilPublicoProps {
  user: ProfileUser;
  isOwnProfile: boolean;
  colegaStatus: string;
  requestId: string | null;
  colegaCount: number;
  earnedBadges: string[];
  colegasPreview: ColegaPreview[];
  cvRequestStatus: string | null;
  diarioPostCount: number;
  obiterCount: number;
  obiterCitasReceived: number;
  obiterApoyosReceived: number;
  publications: Publication[];
  tutorStats?: TutorStats;
  recentEvaluations?: RecentEvaluation[];
  especialidadesCalculadas?: Array<{ materia: string; porcentaje: number }>;
  trayectoria?: Array<{ tipo: string; anio: number; detalle?: string }>;
  topBadges?: Array<{ slug: string; emoji: string; label: string; tier: string }>;
}

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`;
  return new Date(dateStr).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}

function toRoman(num: number): string {
  const map: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  let n = Math.max(0, Math.floor(num));
  for (const [v, s] of map) { while (n >= v) { result += s; n -= v; } }
  return result || "I";
}

function etapaLabel(etapa: string | null): string | null {
  if (!etapa) return null;
  if (etapa === "estudiante") return "Estudiante";
  if (etapa === "egresado") return "Egresado/a";
  if (etapa === "abogado") return "Abogado/a";
  return etapa;
}

const MATERIA_COLORS: Record<string, { bg: string; text: string }> = {
  Civil: { bg: "bg-gz-gold/10", text: "text-gz-gold" },
  Penal: { bg: "bg-gz-red/10", text: "text-gz-red" },
  Constitucional: { bg: "bg-gz-navy/10", text: "text-gz-navy" },
  Comercial: { bg: "bg-gz-sage/10", text: "text-gz-sage" },
  Procesal: { bg: "bg-gz-burgundy/10", text: "text-gz-burgundy" },
  Laboral: { bg: "bg-gz-sage/10", text: "text-gz-sage" },
  Tributario: { bg: "bg-gz-gold/10", text: "text-gz-gold" },
  Administrativo: { bg: "bg-gz-navy/10", text: "text-gz-navy" },
  Internacional: { bg: "bg-gz-burgundy/10", text: "text-gz-burgundy" },
};

function materiaColor(m: string | null) {
  if (!m) return { bg: "bg-gz-cream-dark", text: "text-gz-ink-mid" };
  return MATERIA_COLORS[m] ?? { bg: "bg-gz-cream-dark", text: "text-gz-ink-mid" };
}

// ─── Component ───────────────────────────────────────────

export function PerfilPublico({
  user,
  isOwnProfile,
  colegaStatus: initialStatus,
  requestId: initialRequestId,
  colegaCount,
  earnedBadges,
  colegasPreview,
  cvRequestStatus: initialCvStatus,
  diarioPostCount,
  obiterCount,
  obiterCitasReceived,
  obiterApoyosReceived,
  publications,
  tutorStats,
  recentEvaluations,
  especialidadesCalculadas,
  trayectoria,
  topBadges,
}: PerfilPublicoProps) {
  const [colegaStatus, setColegaStatus] = useState(initialStatus);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"publicaciones" | "trayectoria" | "logros" | "comunidad" | "cv">("publicaciones");
  const [pubFilter, setPubFilter] = useState<string>("TODOS");
  const [showCvModal, setShowCvModal] = useState(false);
  const [cvMessage, setCvMessage] = useState("");
  const [cvLoading, setCvLoading] = useState(false);
  const [cvStatus, setCvStatus] = useState(initialCvStatus);

  // Mutual colegas
  const [mutualCount, setMutualCount] = useState(0);

  useEffect(() => {
    if (isOwnProfile) return;
    fetch(`/api/user/${user.id}/colegas-comun`)
      .then((r) => r.json())
      .then((data) => {
        if (data.count > 0) setMutualCount(data.count);
      })
      .catch(() => {});
  }, [user.id, isOwnProfile]);

  const gradoInfo = user.grado ? getGradoInfo(user.grado) : null;
  const gradoRoman = user.grado ? toRoman(user.grado) : null;
  const nivelActual = user.grado ? NIVELES[getNivel(user.grado)] : null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const etapa = etapaLabel(user.etapaActual);
  const totalCausas = user.causasGanadas + user.causasPerdidas;

  // Filter publications
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

  // Meta summary line
  const metaParts: string[] = [];
  if (etapa) metaParts.push(etapa);
  if (user.universidad) metaParts.push(user.universidad);
  if (user.etapaActual === "estudiante" && user.universityYear) metaParts.push(`${user.universityYear}º año`);
  if (user.etapaActual === "abogado" && user.empleoActual) metaParts.push(user.empleoActual);

  // ─── Colega Handlers ──────────────────────────────────

  async function handleSendRequest() {
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Error al enviar solicitud");
      if (data.autoAccepted) {
        setColegaStatus("accepted");
        toast.success("Son colegas ahora");
      } else {
        setColegaStatus("pending_sent");
        setRequestId(data.requestId);
        toast.success("Solicitud enviada");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelRequest() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/colegas/${requestId}`, { method: "DELETE" });
      if (res.ok) {
        setColegaStatus("none");
        setRequestId(null);
        toast.success("Solicitud cancelada");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setLoading(false); }
  }

  async function handleAcceptRequest() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/colegas/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setColegaStatus("accepted");
        toast.success("Solicitud aceptada");
      } else {
        toast.error(data.error || `Error ${res.status}`);
      }
    } catch { toast.error("Error de conexión"); }
    finally { setLoading(false); }
  }

  async function handleRemoveColega() {
    if (!requestId) return;
    if (!confirm("¿Eliminar colega?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/colegas/${requestId}`, { method: "DELETE" });
      if (res.ok) {
        setColegaStatus("none");
        setRequestId(null);
        toast.success("Colega eliminado");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setLoading(false); }
  }

  async function handleCvRequest() {
    setCvLoading(true);
    try {
      const res = await fetch("/api/cv-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: user.id, message: cvMessage || null }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error ?? "Error al enviar solicitud");
      setCvStatus("pending");
      setShowCvModal(false);
      setCvMessage("");
      toast.success("Solicitud de CV enviada");
    } catch { toast.error("Error de conexión"); }
    finally { setCvLoading(false); }
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
      <div className="mx-auto max-w-[1280px] px-4 lg:px-6 pt-4 pb-16">

        {/* ═══ HERO CARD ═══════════════════════════════════════ */}
        <section className="overflow-hidden mb-4 rounded-[4px] border border-gz-rule bg-gz-cream">
          {/* Cover — user-uploaded if coverUrl set, else procedural banner keyed to grado */}
          <CoverBanner
            coverUrl={user.coverUrl}
            grado={user.grado}
            gradoRoman={gradoRoman}
            gradoNombre={gradoInfo?.nombre}
            togaTierName={user.togaTierName}
            togaTierEmoji={user.togaTierEmoji}
            initials={initials}
            isOwnProfile={isOwnProfile}
          />

          {/* Identity row */}
          <div className="px-4 sm:px-8 pb-5 relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between -mt-14 sm:-mt-16 mb-3 gap-4">
              <div className="flex items-end gap-4 sm:gap-5">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-full border-4 border-gz-cream object-cover shadow-lg shrink-0"
                  />
                ) : (
                  <div className="w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-full border-4 border-gz-cream bg-gradient-to-br from-gz-navy to-gz-burgundy flex items-center justify-center font-cormorant text-4xl sm:text-5xl font-semibold text-gz-cream shadow-lg shrink-0">
                    {initials}
                  </div>
                )}
                <div className="pb-1 sm:pb-2 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {metaParts.length > 0 && (
                      <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
                        {metaParts.join(" · ")}
                      </span>
                    )}
                  </div>
                  <h1 className="font-cormorant text-3xl sm:text-5xl font-semibold leading-tight text-gz-ink">
                    {user.firstName} {user.lastName}
                  </h1>
                  {user.bio && (
                    <p className="font-archivo text-sm text-gz-ink-mid mt-1 line-clamp-2 max-w-xl">{user.bio}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0 pb-1 flex-wrap">
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
                        className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-ink-mid transition-colors cursor-pointer disabled:opacity-50"
                      >
                        + Agregar colega
                      </button>
                    )}
                    {colegaStatus === "pending_sent" && (
                      <button
                        onClick={handleCancelRequest}
                        disabled={loading}
                        className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule-dark px-3 py-2.5 rounded-[3px] hover:bg-gz-cream-dark transition-colors cursor-pointer"
                      >
                        Solicitud enviada · Cancelar
                      </button>
                    )}
                    {colegaStatus === "pending_received" && (
                      <button
                        onClick={handleAcceptRequest}
                        disabled={loading}
                        className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-gold text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-gold-bright transition-colors cursor-pointer"
                      >
                        Aceptar solicitud
                      </button>
                    )}
                    {colegaStatus === "accepted" && (
                      <button
                        onClick={handleRemoveColega}
                        disabled={loading}
                        className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-sage text-gz-sage bg-gz-sage/5 px-4 py-2.5 rounded-[3px] hover:bg-gz-sage/10 transition-colors cursor-pointer"
                      >
                        ✓ Colega
                      </button>
                    )}
                    <ReportModal
                      reportadoId={user.id}
                      trigger={
                        <button
                          className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule-dark px-3 py-2.5 rounded-[3px] hover:bg-gz-cream-dark transition-colors cursor-pointer"
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

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gz-ink-mid border-t border-gz-rule pt-3">
              {user.region && <span className="flex items-center gap-1.5">📍 {user.region}</span>}
              {user.corte && <span className="flex items-center gap-1.5">⚖ {user.corte}</span>}
              {user.anioIngreso && (
                <span className="flex items-center gap-1.5">
                  🎓 Ingreso {user.anioIngreso}
                  {user.anioEgreso && ` · Egreso ${user.anioEgreso}`}
                </span>
              )}
              {user.anioJura && (
                <span className="flex items-center gap-1.5">⚖ Juró en {user.anioJura}</span>
              )}
              {user.linkedinUrl && (
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gz-gold hover:underline sm:ml-auto"
                >
                  LinkedIn →
                </a>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="border-t border-gz-rule bg-gz-cream-dark/40">
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-gz-rule">
              <StatCell label="Experiencia" value={user.xp.toLocaleString("es-CL")} accent="XP" />
              <StatCell
                label="Grado"
                value={
                  gradoRoman && gradoInfo?.nombre
                    ? `${gradoRoman} ${gradoInfo.nombre}`
                    : gradoRoman ?? "—"
                }
                subtitle={
                  nivelActual
                    ? `${nivelActual.label} (grado ${nivelActual.grados})`
                    : undefined
                }
                color="text-gz-gold"
              />
              <StatCell
                label="Causas"
                value={totalCausas > 0 ? `${user.causasGanadas}—${user.causasPerdidas}` : "—"}
                accent={totalCausas > 0 ? `${user.winRate}%` : undefined}
              />
              <StatCell label="Colegas" value={colegaCount.toString()} />
              <StatCell
                label="La Liga de la Toga"
                value={user.togaTierName}
                accent={user.togaTierTopLabel}
                color="text-gz-burgundy"
              />
            </div>
          </div>
        </section>

        {/* ═══ INTERNAL TABS ═══════════════════════════════════ */}
        <nav className="mb-4 rounded-[4px] border border-gz-rule bg-gz-cream sticky top-3 z-10">
          <div className="flex items-center gap-1 px-2 overflow-x-auto">
            <TabButton active={activeTab === "publicaciones"} onClick={() => setActiveTab("publicaciones")} label="Publicaciones" count={pubCounts.total} />
            <TabButton active={activeTab === "trayectoria"} onClick={() => setActiveTab("trayectoria")} label="Trayectoria" count={trayectoria?.length ?? 0} />
            <TabButton active={activeTab === "logros"} onClick={() => setActiveTab("logros")} label="Logros" count={earnedBadges.length} />
            <TabButton active={activeTab === "comunidad"} onClick={() => setActiveTab("comunidad")} label="Comunidad" count={colegaCount} />
            {user.cvAvailable && (
              <TabButton active={activeTab === "cv"} onClick={() => setActiveTab("cv")} label="CV" />
            )}
          </div>
        </nav>

        {/* ═══ GRID: FEED + SIDEBAR ═══════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ─── MAIN COLUMN ─────────────────────────────────── */}
          <section className="lg:col-span-8 space-y-4">

            {activeTab === "publicaciones" && (
              <>
                {/* Compose box (own profile only) */}
                {isOwnProfile && (
                  <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-4">
                    <div className="flex gap-3 items-start">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gz-navy text-gz-cream flex items-center justify-center text-xs font-semibold shrink-0">{initials}</div>
                      )}
                      <Link
                        href="/dashboard/diario"
                        className="flex-1 text-left px-4 py-2.5 border border-gz-rule rounded-[3px] text-gz-ink-light hover:bg-gz-cream-dark/40 cursor-pointer text-sm"
                      >
                        ¿Qué dictamen quieres compartir hoy, {user.firstName}?
                      </Link>
                    </div>
                    <div className="flex gap-1 mt-3 pt-3 border-t border-gz-rule flex-wrap">
                      <Link href="/dashboard/diario?tipo=obiter" className="font-ibm-mono text-[10px] uppercase tracking-[2px] flex items-center gap-1.5 px-3 py-2 rounded-[3px] hover:bg-gz-cream-dark/40 text-gz-ink-mid cursor-pointer"><span className="text-gz-gold">§</span> Obiter Dictum</Link>
                      <Link href="/dashboard/diario?tipo=analisis" className="font-ibm-mono text-[10px] uppercase tracking-[2px] flex items-center gap-1.5 px-3 py-2 rounded-[3px] hover:bg-gz-cream-dark/40 text-gz-ink-mid cursor-pointer"><span className="text-gz-navy">⚖</span> Análisis</Link>
                      <Link href="/dashboard/diario/ensayos" className="font-ibm-mono text-[10px] uppercase tracking-[2px] flex items-center gap-1.5 px-3 py-2 rounded-[3px] hover:bg-gz-cream-dark/40 text-gz-ink-mid cursor-pointer"><span className="text-gz-sage">◆</span> Ensayo</Link>
                      <Link href="/dashboard/diario/debates" className="font-ibm-mono text-[10px] uppercase tracking-[2px] flex items-center gap-1.5 px-3 py-2 rounded-[3px] hover:bg-gz-cream-dark/40 text-gz-ink-mid cursor-pointer"><span className="text-gz-burgundy">⚔</span> Debate</Link>
                    </div>
                  </div>
                )}

                {/* Filter chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-mid mr-1">Filtrar:</span>
                  <FilterChip active={pubFilter === "TODOS"} onClick={() => setPubFilter("TODOS")} label={`Todos · ${pubCounts.total}`} />
                  <FilterChip active={pubFilter === "obiter"} onClick={() => setPubFilter("obiter")} label={`Obiter · ${pubCounts.obiter}`} />
                  <FilterChip active={pubFilter === "analisis"} onClick={() => setPubFilter("analisis")} label={`Análisis · ${pubCounts.analisis}`} />
                  <FilterChip active={pubFilter === "ensayo"} onClick={() => setPubFilter("ensayo")} label={`Ensayo · ${pubCounts.ensayo}`} />
                  <FilterChip active={pubFilter === "debate"} onClick={() => setPubFilter("debate")} label={`Debate · ${pubCounts.debate}`} />
                  <FilterChip active={pubFilter === "columna"} onClick={() => setPubFilter("columna")} label={`Columna · ${pubCounts.columna}`} />
                </div>

                {/* Publications feed */}
                {filteredPubs.length === 0 ? (
                  <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-8 text-center">
                    <p className="font-cormorant italic text-xl text-gz-ink-mid mb-1">
                      {isOwnProfile ? "Aún no has publicado nada" : "Sin publicaciones por ahora"}
                    </p>
                    <p className="font-archivo text-sm text-gz-ink-light">
                      {isOwnProfile
                        ? "Comparte tu primer Obiter Dictum o análisis de sentencia."
                        : `${user.firstName} no ha publicado contenido público todavía.`}
                    </p>
                    {isOwnProfile && (
                      <Link href="/dashboard/diario" className="inline-block mt-4 font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-ink-mid transition-colors">
                        Ir al Diario
                      </Link>
                    )}
                  </div>
                ) : (
                  filteredPubs.map((pub) => (
                    <PublicationCard
                      key={pub.id}
                      pub={pub}
                      authorName={`${user.firstName} ${user.lastName}`}
                      authorInitials={initials}
                      authorAvatar={user.avatarUrl}
                    />
                  ))
                )}
              </>
            )}

            {activeTab === "trayectoria" && (
              <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-6">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <h3 className="font-cormorant text-2xl font-semibold">Trayectoria académica y profesional</h3>
                  {isOwnProfile && (
                    <Link
                      href="/dashboard/perfil/configuracion#trayectoria"
                      className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-gold text-gz-gold px-3 py-2 rounded-[3px] hover:bg-gz-gold/10 transition-colors cursor-pointer"
                    >
                      + Agregar hito
                    </Link>
                  )}
                </div>
                {trayectoria && trayectoria.length > 0 ? (
                  <ol className="relative border-l-2 border-gz-rule pl-5 space-y-5">
                    {trayectoria.map((t, i) => (
                      <li key={i} className="relative">
                        <div className="absolute -left-[27px] w-[14px] h-[14px] bg-gz-gold rounded-full border-2 border-gz-cream" />
                        <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">{t.anio}</div>
                        <div className="font-cormorant text-xl text-gz-ink">{trayectoriaLabel(t.tipo)}</div>
                        {t.detalle && <div className="text-sm text-gz-ink-mid mt-0.5">{t.detalle}</div>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-center py-6">
                    <p className="font-archivo text-sm text-gz-ink-light italic mb-3">Sin información de trayectoria todavía.</p>
                    {isOwnProfile && (
                      <Link
                        href="/dashboard/perfil/configuracion#trayectoria"
                        className="inline-block font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-ink-mid transition-colors"
                      >
                        Completa tu trayectoria
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "logros" && (
              <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-6">
                <h3 className="font-cormorant text-2xl font-semibold mb-4">Distinciones · {earnedBadges.length}</h3>
                {earnedBadges.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {BADGE_RULES.filter((b) => earnedBadges.includes(b.slug)).map((b) => (
                      <div key={b.slug} className="text-center p-3 rounded-[3px] hover:bg-gz-cream-dark/40 cursor-pointer" title={b.description}>
                        <div className={`aspect-square rounded-full flex items-center justify-center text-3xl shadow-sm ${badgeTierClass(b.tier)}`}>
                          {b.emoji}
                        </div>
                        <div className="font-ibm-mono text-[9px] text-gz-ink-mid mt-2 leading-tight uppercase tracking-[1.5px]">{b.label}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-archivo text-sm text-gz-ink-light italic">Aún sin distinciones.</p>
                )}
              </div>
            )}

            {activeTab === "comunidad" && (
              <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-6">
                <h3 className="font-cormorant text-2xl font-semibold mb-4">Colegas · {colegaCount}</h3>
                {colegasPreview.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {colegasPreview.map((c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/perfil/${c.id}`}
                        className="flex items-center gap-3 p-3 rounded-[3px] border border-gz-rule hover:border-gz-gold hover:bg-gz-cream-dark/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gz-navy to-gz-burgundy flex items-center justify-center text-xs font-semibold text-gz-cream shrink-0">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-archivo text-sm font-medium text-gz-ink truncate">{c.firstName} {c.lastName}</div>
                          {c.universidad && <div className="font-archivo text-xs text-gz-ink-mid truncate">{c.universidad}</div>}
                        </div>
                        <div className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold shrink-0">{c.xp.toLocaleString("es-CL")} XP</div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="font-archivo text-sm text-gz-ink-light italic">Aún sin colegas.</p>
                )}

                {tutorStats && tutorStats.sesionesCompletadas > 0 && (
                  <div className="mt-6 pt-6 border-t border-gz-rule">
                    <h4 className="font-cormorant text-xl font-semibold mb-3">Tutorías dictadas</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">Sesiones</div>
                        <div className="font-cormorant text-2xl font-semibold">{tutorStats.sesionesCompletadas}</div>
                      </div>
                      <div>
                        <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">Rating</div>
                        <div className="font-cormorant text-2xl font-semibold text-gz-gold">
                          {tutorStats.ratingPromedio ? `★ ${tutorStats.ratingPromedio.toFixed(1)}` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">Horas</div>
                        <div className="font-cormorant text-2xl font-semibold">{tutorStats.horasAcumuladas}h</div>
                      </div>
                    </div>
                    {recentEvaluations && recentEvaluations.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {recentEvaluations.map((e, i) => (
                          <div key={i} className="p-3 border border-gz-rule rounded-[3px] bg-gz-cream-dark/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-archivo text-xs text-gz-ink-mid">— {e.evaluadorNombre}</span>
                              <span className="font-ibm-mono text-[10px] text-gz-gold">{"★".repeat(e.rating)}</span>
                            </div>
                            <p className="font-cormorant italic text-gz-ink text-sm leading-snug">«{e.comentario}»</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "cv" && user.cvAvailable && (
              <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-6 text-center">
                <p className="font-cormorant text-2xl text-gz-ink mb-2">CV disponible</p>
                <p className="font-archivo text-sm text-gz-ink-mid mb-4">
                  {isOwnProfile
                    ? "Otros colegas pueden solicitar acceso a tu CV."
                    : cvStatus === "approved"
                      ? "Tu solicitud fue aprobada."
                      : cvStatus === "pending"
                        ? "Tu solicitud está pendiente de aprobación."
                        : "Solicita acceso al CV de este colega."}
                </p>
                {!isOwnProfile && !cvStatus && (
                  <button
                    onClick={() => setShowCvModal(true)}
                    className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-gold text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-gold-bright transition-colors cursor-pointer"
                  >
                    Solicitar acceso al CV
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ─── SIDEBAR ─────────────────────────────────────── */}
          <aside className="lg:col-span-4 space-y-4">

            {/* Acerca de */}
            <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink">Acerca de</h3>
                {isOwnProfile && (
                  <Link href="/dashboard/perfil/configuracion" className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline">
                    Editar
                  </Link>
                )}
              </div>
              {user.bio ? (
                <p className="font-cormorant italic text-lg text-gz-ink leading-snug mb-4">«{user.bio}»</p>
              ) : (
                <p className="font-archivo text-sm text-gz-ink-light italic mb-4">Sin biografía aún.</p>
              )}
              <dl className="space-y-2 text-sm border-t border-gz-rule pt-3">
                {etapa && <InfoRow label="Etapa" value={user.universityYear ? `${etapa} · ${user.universityYear}º año` : etapa} />}
                {user.universidad && <InfoRow label="Universidad" value={user.sede ? `${user.universidad} · ${user.sede}` : user.universidad} />}
                {user.region && <InfoRow label="Región" value={user.region} />}
                {user.corte && <InfoRow label="Corte" value={user.corte} />}
                {user.empleoActual && <InfoRow label="Empleo" value={user.cargoActual ? `${user.cargoActual}, ${user.empleoActual}` : user.empleoActual} />}
                <InfoRow label="Miembro desde" value={new Date(user.memberSince).toLocaleDateString("es-CL", { month: "long", year: "numeric" })} />
              </dl>
            </div>

            {/* Especialidades */}
            {especialidadesCalculadas && especialidadesCalculadas.length > 0 && (
              <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink">Especialidades</h3>
                  <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">por XP</span>
                </div>
                <div className="space-y-3">
                  {especialidadesCalculadas.map((esp, i) => {
                    const color = materiaColor(esp.materia);
                    const bars = ["bg-gz-gold", "bg-gz-burgundy", "bg-gz-navy", "bg-gz-sage", "bg-gz-rule-dark"];
                    return (
                      <div key={esp.materia}>
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="font-cormorant text-base font-medium">{esp.materia}</span>
                          <span className={`font-ibm-mono text-[10px] uppercase tracking-[1.5px] ${color.text}`}>{esp.porcentaje}%</span>
                        </div>
                        <div className="h-2 bg-gz-cream-dark rounded-full overflow-hidden">
                          <div className={`h-full ${bars[i] ?? "bg-gz-rule-dark"} rounded-full transition-all`} style={{ width: `${esp.porcentaje}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Colegas preview */}
            <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink">Colegas · {colegaCount}</h3>
                <button onClick={() => setActiveTab("comunidad")} className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline">
                  Ver todos →
                </button>
              </div>
              {colegasPreview.length > 0 ? (
                <>
                  <div className="grid grid-cols-6 gap-1.5 mb-3">
                    {colegasPreview.slice(0, 6).map((c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/perfil/${c.id}`}
                        className="aspect-square rounded-full bg-gradient-to-br from-gz-navy to-gz-burgundy flex items-center justify-center text-[10px] font-semibold text-gz-cream cursor-pointer ring-1 ring-gz-rule hover:ring-gz-gold transition-all"
                        title={`${c.firstName} ${c.lastName}`}
                      >
                        {c.firstName[0]}{c.lastName[0]}
                      </Link>
                    ))}
                  </div>
                  {mutualCount > 0 && (
                    <div className="font-archivo text-xs text-gz-ink-mid">
                      <span className="text-gz-gold font-medium">{mutualCount}</span> colega{mutualCount !== 1 ? "s" : ""} mutuo{mutualCount !== 1 ? "s" : ""}
                    </div>
                  )}
                </>
              ) : (
                <p className="font-archivo text-sm text-gz-ink-light italic">Aún sin colegas.</p>
              )}
            </div>

            {/* Badges */}
            {topBadges && topBadges.length > 0 && (
              <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink">Distinciones · {earnedBadges.length}</h3>
                  <button onClick={() => setActiveTab("logros")} className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline">
                    Ver todas →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {topBadges.slice(0, 6).map((b) => (
                    <div key={b.slug} className="text-center p-2 rounded-[3px] hover:bg-gz-cream-dark/40 cursor-pointer" title={b.label}>
                      <div className={`aspect-square rounded-full flex items-center justify-center text-2xl shadow-sm ${badgeTierClass(b.tier)}`}>
                        {b.emoji}
                      </div>
                      <div className="font-ibm-mono text-[9px] text-gz-ink-mid mt-1.5 leading-tight uppercase tracking-[1.5px] line-clamp-1">{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trayectoria mini */}
            {trayectoria && trayectoria.length > 0 && (
              <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-5">
                <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink mb-4">Trayectoria</h3>
                <ol className="relative border-l-2 border-gz-rule pl-4 space-y-3">
                  {trayectoria.slice(0, 4).map((t, i) => (
                    <li key={i} className="relative">
                      <div className="absolute -left-[22px] w-[10px] h-[10px] bg-gz-gold rounded-full border-2 border-gz-cream" />
                      <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">{t.anio}</div>
                      <div className="font-archivo text-sm font-medium">{trayectoriaLabel(t.tipo)}</div>
                      {t.detalle && <div className="font-archivo text-xs text-gz-ink-mid">{t.detalle}</div>}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Obiter stats (engagement summary) */}
            {(obiterCount > 0 || diarioPostCount > 0) && (
              <div className="rounded-[4px] border border-gz-rule bg-gz-cream p-5">
                <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink mb-4">Engagement</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="font-cormorant text-2xl font-semibold text-gz-gold">{obiterCount}</div>
                    <div className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid mt-0.5">Obiter</div>
                  </div>
                  <div>
                    <div className="font-cormorant text-2xl font-semibold text-gz-burgundy">{obiterApoyosReceived}</div>
                    <div className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid mt-0.5">Apoyos</div>
                  </div>
                  <div>
                    <div className="font-cormorant text-2xl font-semibold text-gz-navy">{obiterCitasReceived}</div>
                    <div className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid mt-0.5">Citas</div>
                  </div>
                </div>
              </div>
            )}

          </aside>
        </div>
      </div>

      {/* CV Modal */}
      {showCvModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCvModal(false)}>
          <div className="bg-gz-cream rounded-[4px] border border-gz-rule max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-cormorant text-2xl font-semibold mb-2">Solicitar CV</h3>
            <p className="font-archivo text-sm text-gz-ink-mid mb-4">Envía un mensaje a {user.firstName} para solicitar acceso a su CV.</p>
            <textarea
              value={cvMessage}
              onChange={(e) => setCvMessage(e.target.value)}
              placeholder="Ej: Hola, me interesó tu perfil para una oportunidad laboral..."
              className="w-full border border-gz-rule rounded-[3px] p-3 text-sm mb-4 min-h-[100px] bg-gz-cream"
              maxLength={500}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCvModal(false)} className="font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-rule-dark px-4 py-2.5 rounded-[3px] hover:bg-gz-cream-dark">Cancelar</button>
              <button onClick={handleCvRequest} disabled={cvLoading} className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-gold text-gz-cream px-4 py-2.5 rounded-[3px] hover:bg-gz-gold-bright disabled:opacity-50">
                {cvLoading ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

// ─── Subcomponents ───────────────────────────────────────

function CoverBanner({
  coverUrl,
  grado,
  gradoRoman,
  gradoNombre,
  togaTierName,
  togaTierEmoji,
  initials,
  isOwnProfile,
}: {
  coverUrl: string | null;
  grado?: number;
  gradoRoman: string | null;
  gradoNombre?: string;
  togaTierName: string;
  togaTierEmoji: string;
  initials: string;
  isOwnProfile: boolean;
}) {
  // Procedural palette keyed to grado — shifts hue through the 33 grados
  // so each level reads as a distinct "edition cover" without screaming.
  const proceduralStyle = useMemo(() => {
    const g = Math.max(1, grado ?? 1);
    // Map grado to a base ink tint: deep navy (I) → burgundy (XXXIII)
    const t = Math.min(1, (g - 1) / 32);
    // Navy 12203a → Burgundy 6b1d2a interpolated
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
    const r = lerp(0x12, 0x6b);
    const gC = lerp(0x20, 0x1d);
    const b = lerp(0x3a, 0x2a);
    const anchor = `rgb(${r}, ${gC}, ${b})`;
    // Mid stop always slightly warmer for depth
    const mid = `rgb(${lerp(0x1e, 0x55)}, ${lerp(0x31, 0x24)}, ${lerp(0x55, 0x30)})`;
    return {
      background: `
        repeating-linear-gradient(45deg, transparent 0 18px, rgba(154,114,48,0.07) 18px 36px),
        linear-gradient(135deg, #12203a 0%, ${mid} 35%, ${anchor} 100%)
      `,
    } as React.CSSProperties;
  }, [grado]);

  const imageStyle: React.CSSProperties | undefined = coverUrl
    ? {
        backgroundImage: `url(${coverUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <div className="w-full aspect-[4/1] relative overflow-hidden" style={imageStyle ?? proceduralStyle}>
      {/* Top legibility scrim for chips — stronger on uploaded images */}
      <div
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{
          background: coverUrl
            ? "linear-gradient(180deg, rgba(18,20,30,0.42) 0%, rgba(18,20,30,0) 100%)"
            : "linear-gradient(180deg, rgba(18,20,30,0.12) 0%, rgba(18,20,30,0) 100%)",
        }}
      />

      {/* Procedural-only decoration: roman numeral watermark + initials monogram */}
      {!coverUrl && gradoRoman && (
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none select-none px-8 sm:px-12">
          <div className="font-cormorant font-semibold text-gz-cream/[0.09] leading-none hidden sm:block" style={{ fontSize: "clamp(90px, 18vw, 220px)" }}>
            {initials}
          </div>
          <div className="font-cormorant italic text-gz-cream/10 leading-none ml-auto" style={{ fontSize: "clamp(110px, 22vw, 260px)" }}>
            {gradoRoman}
          </div>
        </div>
      )}

      {/* Subtle fine-line rule across center (procedural only) */}
      {!coverUrl && (
        <div className="absolute left-8 right-8 top-1/2 h-px bg-gz-cream/10 pointer-events-none" />
      )}

      {/* Bottom cream fade so avatar sits on a soft meniscus */}
      <div
        className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(245,240,230,0) 0%, rgba(245,240,230,0.55) 65%, var(--gz-cream) 100%)",
        }}
      />

      {/* Motto — hidden on uploaded images to avoid visual noise */}
      {!coverUrl && (
        <div className="absolute top-4 right-4 hidden sm:block font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-cream/70 pointer-events-none">
          PONDERA · VERITAS · IUS
        </div>
      )}

      {/* Grade + Tier chips (always) */}
      <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
        {gradoRoman && (
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-cream/15 backdrop-blur text-gz-cream px-2.5 py-1 rounded-[3px] border border-gz-cream/25">
            Grado {gradoRoman}{gradoNombre ? ` · ${gradoNombre}` : ""}
          </span>
        )}
        {togaTierName && (
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-burgundy/90 text-gz-cream px-2.5 py-1 rounded-[3px]">
            {togaTierEmoji} {togaTierName}
          </span>
        )}
      </div>

      {/* Edit-cover affordance (own profile only) */}
      {isOwnProfile && (
        <Link
          href="/dashboard/perfil/configuracion#portada"
          className="absolute top-4 right-4 sm:top-auto sm:bottom-4 sm:right-4 font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink/50 hover:bg-gz-ink/75 backdrop-blur-sm text-gz-cream border border-gz-cream/25 px-2.5 py-1 rounded-[3px] cursor-pointer transition-colors"
          title="Editar portada"
        >
          ✎ Portada
        </Link>
      )}

      {/* § flourish (procedural only — on uploaded covers it would clash) */}
      {!coverUrl && (
        <div className="absolute bottom-3 right-5 font-cormorant italic text-gz-cream/45 text-3xl sm:text-4xl pointer-events-none">§</div>
      )}
    </div>
  );
}

function StatCell({ label, value, accent, subtitle, color }: { label: string; value: string; accent?: string; subtitle?: string; color?: string }) {
  return (
    <div className="px-4 py-3.5">
      <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">{label}</div>
      <div className={`font-cormorant text-2xl font-semibold leading-tight ${color ?? "text-gz-ink"}`}>
        {value}
        {accent && <span className="font-archivo text-xs text-gz-ink-mid ml-1 font-normal">{accent}</span>}
      </div>
      {subtitle && (
        <div className="font-archivo text-[11px] text-gz-ink-light mt-1 leading-snug">{subtitle}</div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`font-ibm-mono text-[10px] uppercase tracking-[2px] px-4 py-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
        active ? "border-gz-gold text-gz-ink" : "border-transparent text-gz-ink-mid hover:text-gz-ink"
      }`}
    >
      {label}
      {typeof count === "number" && count > 0 && (
        <span className={`ml-1 ${active ? "text-gz-gold" : "text-gz-ink-light"}`}>{count}</span>
      )}
    </button>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`font-ibm-mono text-[10px] uppercase tracking-[2px] px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
        active ? "bg-gz-ink text-gz-cream" : "border border-gz-rule hover:bg-gz-cream"
      }`}
    >
      {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light shrink-0">{label}</dt>
      <dd className="font-archivo font-medium text-right">{value}</dd>
    </div>
  );
}

function PublicationCard({
  pub,
  authorName,
  authorInitials,
  authorAvatar,
}: {
  pub: Publication;
  authorName: string;
  authorInitials: string;
  authorAvatar: string | null;
}) {
  const color = materiaColor(pub.materia);
  const kindMeta: Record<PublicationKind, { label: string; symbol: string; symbolColor: string; href: string }> = {
    obiter: { label: "Obiter Dictum", symbol: "§", symbolColor: "text-gz-gold", href: `/dashboard/diario/${pub.id}` },
    analisis: { label: "Análisis de Sentencia", symbol: "⚖", symbolColor: "text-gz-navy", href: `/dashboard/diario/analisis/${pub.id}` },
    ensayo: { label: "Ensayo", symbol: "◆", symbolColor: "text-gz-sage", href: `/dashboard/diario/ensayos/${pub.id}` },
    debate: { label: "Debate Jurídico", symbol: "⚔", symbolColor: "text-gz-burgundy", href: `/dashboard/diario/debates/${pub.id}` },
    columna: { label: "Columna de Opinión", symbol: "◇", symbolColor: "text-gz-ink-mid", href: `/dashboard/diario/columnas/${pub.id}` },
  };
  const meta = kindMeta[pub.kind];

  return (
    <article className="rounded-[4px] border border-gz-rule bg-gz-cream p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {authorAvatar ? (
            <img src={authorAvatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gz-navy text-gz-cream flex items-center justify-center text-xs font-semibold shrink-0">
              {authorInitials}
            </div>
          )}
          <div className="leading-tight min-w-0">
            <div className="font-archivo text-sm font-medium truncate">{authorName}</div>
            <div className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
              {meta.label}
              {pub.materia ? ` · ${pub.materia}` : ""} · {timeAgo(pub.createdAt)}
            </div>
          </div>
        </div>
        <span className={`font-ibm-mono text-[10px] uppercase tracking-[1.5px] ${color.bg} ${color.text} px-2 py-1 rounded-[3px] shrink-0 flex items-center gap-1`}>
          <span className={meta.symbolColor}>{meta.symbol}</span>
          {meta.label.split(" ")[0]}
        </span>
      </div>

      {pub.kind === "obiter" && (
        <blockquote className="font-cormorant text-xl sm:text-2xl italic leading-snug text-gz-ink px-4 py-3 border-l-4 border-gz-gold bg-gz-cream-dark/30">
          {pub.contenido}
        </blockquote>
      )}

      {pub.kind === "analisis" && (
        <>
          <Link href={meta.href} className="block hover:opacity-80 transition-opacity">
            <h4 className="font-cormorant text-xl sm:text-2xl font-semibold leading-tight mb-2">{pub.titulo}</h4>
          </Link>
          {pub.tribunal && (
            <div className="border border-gz-rule rounded-[3px] p-2.5 my-3">
              <div className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-0.5">Tribunal</div>
              <div className="font-archivo text-xs font-medium line-clamp-1">{pub.tribunal}</div>
            </div>
          )}
          {pub.resumen && (
            <p className="font-archivo text-sm text-gz-ink-mid leading-relaxed line-clamp-3">{pub.resumen}</p>
          )}
        </>
      )}

      {pub.kind === "ensayo" && (
        <>
          <Link href={meta.href} className="block hover:opacity-80 transition-opacity">
            <h4 className="font-cormorant text-xl sm:text-2xl font-semibold leading-tight mb-2">{pub.titulo}</h4>
          </Link>
          <div className="flex items-center gap-2 mb-2">
            {pub.tribunal && (
              <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] bg-gz-sage/10 text-gz-sage border border-gz-sage/30 px-2 py-0.5 rounded-[3px]">
                {pub.tribunal}
              </span>
            )}
            {pub.tipo && (
              <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid">{pub.tipo.replace(/_/g, " ")}</span>
            )}
          </div>
          {pub.resumen && (
            <p className="font-archivo text-sm text-gz-ink-mid leading-relaxed line-clamp-3">{pub.resumen}</p>
          )}
        </>
      )}

      {pub.kind === "debate" && (
        <>
          <Link href={meta.href} className="block hover:opacity-80 transition-opacity">
            <h4 className="font-cormorant text-xl sm:text-2xl font-semibold leading-tight mb-2">{pub.titulo}</h4>
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] bg-gz-burgundy/10 text-gz-burgundy border border-gz-burgundy/30 px-2 py-0.5 rounded-[3px]">
              {pub.tribunal}
            </span>
            {pub.tipo && (
              <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid">{pub.tipo.replace(/_/g, " ")}</span>
            )}
          </div>
          {pub.resumen && (
            <p className="font-archivo text-sm text-gz-ink-mid leading-relaxed line-clamp-3">{pub.resumen}</p>
          )}
        </>
      )}

      {pub.kind === "columna" && (
        <>
          <Link href={meta.href} className="block hover:opacity-80 transition-opacity">
            <h4 className="font-cormorant text-xl sm:text-2xl font-semibold leading-tight mb-2">{pub.titulo}</h4>
          </Link>
          {pub.resumen && (
            <p className="font-archivo text-sm text-gz-ink-mid leading-relaxed line-clamp-3">{pub.resumen}</p>
          )}
        </>
      )}

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gz-rule font-archivo text-sm text-gz-ink-mid">
        <span className="flex items-center gap-1" title="Apoyos"><span className="text-gz-burgundy">♥</span> {pub.apoyosCount}</span>
        <span className="flex items-center gap-1" title="Citas"><span className="text-gz-gold">❝</span> {pub.citasCount}</span>
        {pub.viewsCount > 0 && <span className="flex items-center gap-1" title="Vistas">👁 {pub.viewsCount}</span>}
        <Link
          href={meta.href}
          className="ml-auto font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold hover:underline"
        >
          Ver →
        </Link>
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

function badgeTierClass(tier: string): string {
  if (tier === "unique") return "bg-gradient-to-br from-gz-burgundy to-gz-navy text-gz-cream";
  if (tier === "special") return "bg-gradient-to-br from-gz-navy to-gz-sage text-gz-cream";
  if (tier === "gold") return "bg-gradient-to-br from-gz-gold-bright to-gz-gold text-gz-cream";
  if (tier === "silver") return "bg-gradient-to-br from-gz-rule-dark to-gz-ink-mid text-gz-cream";
  if (tier === "bronze") return "bg-gradient-to-br from-gz-burgundy/70 to-gz-burgundy text-gz-cream";
  return "bg-gz-cream border-2 border-dashed border-gz-rule-dark text-gz-ink-mid";
}
