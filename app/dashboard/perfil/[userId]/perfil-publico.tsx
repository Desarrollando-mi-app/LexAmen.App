"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BADGE_RULES } from "@/lib/badge-constants";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";

// ─── Types ───────────────────────────────────────────────

interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  sede: string | null;
  universityYear: number | null;
  avatarUrl: string | null;
  bio: string | null;
  cvAvailable: boolean;
  xp: number;
  causasGanadas: number;
  causasPerdidas: number;
  winRate: number;
  tier: string | null;
  flashcardsStudied: number;
  mcqAttempts: number;
  trueFalseAttempts: number;
  memberSince: string;
}

interface ColegaPreview {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  tier: string | null;
  xp: number;
}

interface DiarioPostPreview {
  id: string;
  formato: string;
  titulo: string;
  contenido: string | null;
  opinion: string | null;
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
  tutorStats?: TutorStats;
  recentEvaluations?: RecentEvaluation[];
}

// ─── Component ───────────────────────────────────────────

export function PerfilPublico({
  user,
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
  tutorStats,
  recentEvaluations,
}: PerfilPublicoProps) {
  const [colegaStatus, setColegaStatus] = useState(initialStatus);
  const [requestId, setRequestId] = useState(initialRequestId);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"perfil" | "publicaciones">("perfil");
  const [diarioPosts, setDiarioPosts] = useState<DiarioPostPreview[]>([]);
  const [diarioLoaded, setDiarioLoaded] = useState(false);
  const [diarioLoading, setDiarioLoading] = useState(false);

  // Mutual colegas state
  const [mutualColegas, setMutualColegas] = useState<
    { id: string; firstName: string; lastName: string; avatarUrl: string | null }[]
  >([]);
  const [mutualCount, setMutualCount] = useState(0);

  useEffect(() => {
    fetch(`/api/user/${user.id}/colegas-comun`)
      .then((r) => r.json())
      .then((data) => {
        if (data.count > 0) {
          setMutualColegas(data.colegas);
          setMutualCount(data.count);
        }
      })
      .catch(() => {});
  }, [user.id]);

  // CV request state
  const [cvStatus, setCvStatus] = useState(initialCvStatus);
  const [showCvModal, setShowCvModal] = useState(false);
  const [cvMessage, setCvMessage] = useState("");
  const [cvLoading, setCvLoading] = useState(false);

  const tierLabel = user.tier ? TIER_LABELS[user.tier] ?? user.tier : null;
  const tierEmoji = user.tier ? TIER_EMOJIS[user.tier] ?? "" : "";
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

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
      if (!res.ok) {
        toast.error(data.error ?? "Error al enviar solicitud");
        return;
      }
      if (data.autoAccepted) {
        setColegaStatus("accepted");
        toast.success("Son colegas ahora");
      } else {
        setColegaStatus("pending_sent");
        setRequestId(data.requestId);
        toast.success("Solicitud enviada");
      }
    } catch {
      toast.error("Error de conexion");
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
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
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
      if (res.ok) {
        setColegaStatus("accepted");
        toast.success("Solicitud aceptada");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveColega() {
    if (!requestId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/colegas/${requestId}`, { method: "DELETE" });
      if (res.ok) {
        setColegaStatus("none");
        setRequestId(null);
        toast.success("Colega eliminado");
      }
    } catch {
      toast.error("Error de conexion");
    } finally {
      setLoading(false);
    }
  }

  // ─── CV Request Handler ───────────────────────────────

  async function handleCvRequest() {
    setCvLoading(true);
    try {
      const res = await fetch("/api/cv-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: user.id,
          message: cvMessage || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al enviar solicitud");
        return;
      }
      setCvStatus("pending");
      setShowCvModal(false);
      setCvMessage("");
      toast.success("Solicitud de CV enviada");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCvLoading(false);
    }
  }

  // ─── Diario Posts Loader ──────────────────────────────────

  async function loadDiarioPosts() {
    if (diarioLoaded) return;
    setDiarioLoading(true);
    try {
      const res = await fetch(`/api/diario?userId=${user.id}&limit=20`);
      const data = await res.json();
      setDiarioPosts(
        data.items.map((p: { id: string; formato: string; titulo: string; contenido: string | null; opinion: string | null; createdAt: string }) => ({
          id: p.id,
          formato: p.formato,
          titulo: p.titulo,
          contenido: p.contenido,
          opinion: p.opinion,
          createdAt: p.createdAt,
        }))
      );
      setDiarioLoaded(true);
    } catch {
      toast.error("Error al cargar publicaciones");
    } finally {
      setDiarioLoading(false);
    }
  }

  function handleTabChange(tab: "perfil" | "publicaciones") {
    setActiveTab(tab);
    if (tab === "publicaciones" && !diarioLoaded) {
      loadDiarioPosts();
    }
  }

  // ─── Render ─────────────────────────────────────────────

  const FORMATO_LABELS: Record<string, string> = {
    OBITER_DICTUM: "Obiter Dictum",
    ANALISIS_FALLOS: "Análisis de Fallos",
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* ─── Header ──────────────────────────────────── */}
        <div className="rounded-[4px] border border-gz-rule bg-white p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.firstName} ${user.lastName}`}
                className="h-16 w-16 shrink-0 rounded-full object-cover border-2 border-gz-rule"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-navy text-xl font-bold text-white">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-navy font-cormorant truncate">
                {user.firstName} {user.lastName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-navy/60">
                {user.universidad && <span>{user.universidad}</span>}
                {user.sede && <span>· {user.sede}</span>}
                {user.universityYear && (
                  <span>
                    {(user.universidad || user.sede) ? "·" : ""} {user.universityYear}° año
                  </span>
                )}
              </div>
              {tierLabel && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                  {tierEmoji} {tierLabel}
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="mt-4 text-sm text-navy/70 leading-relaxed">
              {user.bio}
            </p>
          )}

          {/* Colegas en común */}
          {mutualCount > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex -space-x-2">
                {mutualColegas.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/perfil/${c.id}`}
                    title={`${c.firstName} ${c.lastName}`}
                  >
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={`${c.firstName} ${c.lastName}`}
                        className="h-7 w-7 rounded-full border-2 border-[var(--gz-cream)] object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--gz-cream)] bg-gz-navy font-ibm-mono text-[9px] font-semibold text-gz-gold-bright">
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <span className="ml-1 font-archivo text-[12px] text-gz-ink-mid">
                {mutualCount === 1
                  ? `${mutualColegas[0]?.firstName} ${mutualColegas[0]?.lastName.charAt(0)}.`
                  : mutualCount <= 5
                    ? mutualColegas
                        .map((c) => `${c.firstName} ${c.lastName.charAt(0)}.`)
                        .join(", ")
                    : `${mutualColegas
                        .slice(0, 3)
                        .map((c) => `${c.firstName} ${c.lastName.charAt(0)}.`)
                        .join(", ")} y +${mutualCount - 3} más`}
                {" "}
                &middot;{" "}
                <span className="font-semibold">
                  {mutualCount} {mutualCount === 1 ? "colega" : "colegas"} en com&uacute;n
                </span>
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-3">
            {colegaStatus === "none" && (
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="rounded-[3px] bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Agregar Colega"}
              </button>
            )}

            {colegaStatus === "pending_sent" && (
              <button
                onClick={handleCancelRequest}
                disabled={loading}
                className="rounded-[3px] border border-gz-rule bg-white px-5 py-2.5 text-sm font-semibold text-navy/60 transition-colors hover:bg-gz-cream-dark disabled:opacity-50"
              >
                {loading ? "..." : "Cancelar Solicitud"}
              </button>
            )}

            {colegaStatus === "pending_received" && (
              <button
                onClick={handleAcceptRequest}
                disabled={loading}
                className="rounded-[3px] bg-gz-sage px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gz-sage/90 disabled:opacity-50"
              >
                {loading ? "..." : "Aceptar Solicitud"}
              </button>
            )}

            {colegaStatus === "accepted" && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-gz-sage/10 px-4 py-2.5 text-sm font-semibold text-gz-sage">
                  Colegas
                </span>
                <button
                  onClick={handleRemoveColega}
                  disabled={loading}
                  className="rounded-[3px] border border-gz-burgundy/20 bg-white px-4 py-2.5 text-sm font-medium text-gz-burgundy transition-colors hover:bg-gz-burgundy/10 disabled:opacity-50"
                >
                  Eliminar
                </button>
              </>
            )}

            {colegaStatus === "accepted" && (
              <Link
                href={`/dashboard/causas?challenge=${user.id}`}
                className="rounded-[3px] bg-gold px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90"
              >
                Desafiar
              </Link>
            )}

            {/* CV Request button */}
            {user.cvAvailable && !cvStatus && (
              <button
                onClick={() => setShowCvModal(true)}
                className="rounded-[3px] border border-gold/30 bg-gold/5 px-5 py-2.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
              >
                📄 Solicitar CV
              </button>
            )}

            {cvStatus === "pending" && (
              <span className="inline-flex items-center gap-1 rounded-[3px] bg-gold/10 px-4 py-2.5 text-sm font-medium text-gold/70">
                ✓ Solicitud enviada
              </span>
            )}

            {cvStatus === "accepted" && (
              <span className="inline-flex items-center gap-1 rounded-[3px] bg-gz-sage/10 px-4 py-2.5 text-sm font-medium text-gz-sage">
                ✓ CV disponible — contacta directamente
              </span>
            )}
          </div>
        </div>

        {/* ─── Tabs ────────────────────────────────────── */}
        <div className="flex gap-1 rounded-[3px] bg-gz-rule/20 p-1">
          <button
            onClick={() => handleTabChange("perfil")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "perfil"
                ? "bg-white text-navy shadow-sm"
                : "text-navy/50 hover:text-navy/70"
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => handleTabChange("publicaciones")}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "publicaciones"
                ? "bg-white text-navy shadow-sm"
                : "text-navy/50 hover:text-navy/70"
            }`}
          >
            Publicaciones ({diarioPostCount})
          </button>
        </div>

        {activeTab === "publicaciones" && (
          <div className="space-y-4">
            {diarioLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              </div>
            ) : diarioPosts.length === 0 ? (
              <div className="rounded-[4px] border border-gz-rule bg-white p-12 text-center">
                <p className="text-4xl mb-3">📰</p>
                <p className="text-sm text-navy/60">
                  Este usuario aún no ha publicado en El Diario
                </p>
              </div>
            ) : (
              diarioPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/dashboard/diario/${post.id}`}
                  className="block rounded-[4px] border border-gz-rule bg-white p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        post.formato === "OBITER_DICTUM"
                          ? "bg-gold/15 text-gold"
                          : "bg-navy/10 text-navy"
                      }`}
                    >
                      {FORMATO_LABELS[post.formato] ?? post.formato}
                    </span>
                    <span className="text-xs text-navy/40">
                      {new Date(post.createdAt).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-navy">{post.titulo}</h3>
                  {post.contenido && (
                    <p className="mt-1 text-xs text-navy/60 line-clamp-2">
                      {post.contenido}
                    </p>
                  )}
                  {post.opinion && !post.contenido && (
                    <p className="mt-1 text-xs text-navy/60 line-clamp-2">
                      {post.opinion}
                    </p>
                  )}
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === "perfil" && (
        <>
        {/* ─── Stats ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-[4px] border border-gz-rule bg-white p-4 text-center">
            <p className="text-2xl font-bold text-navy font-cormorant">
              {user.xp.toLocaleString()}
            </p>
            <p className="text-xs text-navy/50">XP Total</p>
          </div>
          <div className="rounded-[4px] border border-gz-rule bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gz-sage">
              {user.causasGanadas}
            </p>
            <p className="text-xs text-navy/50">Causas Ganadas</p>
          </div>
          <div className="rounded-[4px] border border-gz-rule bg-white p-4 text-center">
            <p className="text-2xl font-bold text-gold">{user.winRate}%</p>
            <p className="text-xs text-navy/50">Win Rate</p>
          </div>
          <div className="rounded-[4px] border border-gz-rule bg-white p-4 text-center">
            <p className="text-2xl font-bold text-navy font-cormorant">
              {user.flashcardsStudied}
            </p>
            <p className="text-xs text-navy/50">Flashcards</p>
          </div>
        </div>

        {/* ─── Obiter Dictum Stats ────────────────────── */}
        {obiterCount > 0 && (
          <div className="rounded-[4px] border border-gz-rule bg-white p-6">
            <h2 className="text-sm font-semibold text-navy/70 uppercase tracking-wider mb-4">
              Actividad en Obiter Dictum
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gz-gold font-cormorant">
                  {obiterCount}
                </p>
                <p className="text-xs text-navy/50">Obiters publicados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gz-burgundy font-cormorant">
                  {obiterCitasReceived}
                </p>
                <p className="text-xs text-navy/50">Citas recibidas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gz-sage font-cormorant">
                  {obiterApoyosReceived}
                </p>
                <p className="text-xs text-navy/50">Apoyos recibidos</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Ayudantías Stats ────────────────────────── */}
        {tutorStats && tutorStats.sesionesCompletadas > 0 && (
          <div className="rounded-[4px] border border-gz-rule bg-white p-6">
            <h2 className="text-sm font-semibold text-navy/70 uppercase tracking-wider mb-4">
              Actividad en Ayudantías
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gz-gold font-cormorant">
                  {tutorStats.ratingPromedio ? tutorStats.ratingPromedio.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-navy/50">Rating promedio</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-navy font-cormorant">
                  {tutorStats.sesionesCompletadas}
                </p>
                <p className="text-xs text-navy/50">Sesiones completadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gz-sage font-cormorant">
                  {tutorStats.totalEvaluaciones}
                </p>
                <p className="text-xs text-navy/50">Evaluaciones</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gz-burgundy font-cormorant">
                  {tutorStats.horasAcumuladas}h
                </p>
                <p className="text-xs text-navy/50">Horas acumuladas</p>
              </div>
            </div>
            {recentEvaluations && recentEvaluations.length > 0 && (
              <div className="border-t border-gz-rule pt-3 mt-3">
                <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
                  Evaluaciones recientes
                </p>
                <div className="space-y-2">
                  {recentEvaluations.map((ev, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-gz-gold shrink-0">
                        {"★".repeat(ev.rating)}{"☆".repeat(5 - ev.rating)}
                      </span>
                      <span className="text-navy/70 italic">
                        &ldquo;{ev.comentario}&rdquo; — {ev.evaluadorNombre}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Insignias ───────────────────────────────── */}
        <div className="rounded-[4px] border border-gz-rule bg-white p-6">
          <h2 className="text-sm font-semibold text-navy/70 uppercase tracking-wider">
            Insignias
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {BADGE_RULES.map((badge) => {
              const earned = earnedBadges.includes(badge.slug);
              return (
                <div
                  key={badge.slug}
                  className={`text-center transition-opacity ${
                    earned ? "" : "opacity-25 grayscale"
                  }`}
                  title={badge.description}
                >
                  <span className="text-3xl">{badge.emoji}</span>
                  <p className="mt-1 text-[11px] font-medium text-navy leading-tight">
                    {badge.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Colegas ─────────────────────────────────── */}
        <div className="rounded-[4px] border border-gz-rule bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy/70 uppercase tracking-wider">
              Colegas ({colegaCount})
            </h2>
          </div>
          {colegasPreview.length === 0 ? (
            <p className="mt-4 text-sm text-navy/40">
              Este usuario aun no tiene colegas
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {colegasPreview.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/perfil/${c.id}`}
                  className="flex items-center gap-3 rounded-[3px] border border-gz-rule p-3 transition-colors hover:bg-gz-cream-dark"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                    {c.firstName[0]}
                    {c.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    {c.tier && (
                      <p className="text-[10px] text-navy/40">
                        {TIER_EMOJIS[c.tier] ?? ""}{" "}
                        {TIER_LABELS[c.tier] ?? c.tier}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ─── Info ────────────────────────────────────── */}
        <div className="text-center text-xs text-navy/30">
          Miembro desde{" "}
          {new Date(user.memberSince).toLocaleDateString("es-CL", {
            month: "long",
            year: "numeric",
          })}
        </div>
        </>
        )}
      </div>

      {/* ─── CV Request Modal ────────────────────────── */}
      {showCvModal && (
        <CvRequestModal
          userName={`${user.firstName} ${user.lastName}`}
          message={cvMessage}
          onMessageChange={setCvMessage}
          loading={cvLoading}
          onSubmit={handleCvRequest}
          onClose={() => {
            setShowCvModal(false);
            setCvMessage("");
          }}
        />
      )}
    </main>
  );
}

// ─── CV Request Modal ───────────────────────────────────

function CvRequestModal({
  userName,
  message,
  onMessageChange,
  loading,
  onSubmit,
  onClose,
}: {
  userName: string;
  message: string;
  onMessageChange: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        onClick={(e) => e.target === overlayRef.current && onClose()}
      >
        <div className="w-full max-w-md rounded-[4px] border border-gz-rule bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-navy font-cormorant">
            Solicitar CV
          </h3>
          <p className="mt-1 text-sm text-navy/60">
            Enviar solicitud a <strong>{userName}</strong>
          </p>

          <textarea
            value={message}
            onChange={(e) => onMessageChange(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Mensaje opcional (ej: para qué es la solicitud)"
            className="mt-4 w-full rounded-[3px] border border-gz-rule px-3 py-2 text-sm text-navy resize-none focus:border-gold/50 focus:outline-none"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 text-sm font-semibold text-navy/60 transition-colors hover:bg-gz-cream-dark"
            >
              Cancelar
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="flex-1 rounded-[3px] bg-gold px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
