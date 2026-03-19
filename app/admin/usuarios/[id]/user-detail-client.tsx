"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ── Types ─────────────────────────────────────────────── */

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  universidad: string | null;
  sede: string | null;
  universityYear: number | null;
  avatarUrl: string | null;
  plan: string;
  xp: number;
  grado: number;
  isAdmin: boolean;
  suspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  deletedAt: string | null;
  createdAt: string;
  causasGanadas: number;
  causasPerdidas: number;
  bio: string | null;
  region: string | null;
}

interface Estadisticas {
  flashcardsDominadas: number;
  mcqCorrectas: number;
  mcqTotal: number;
  vfCorrectas: number;
  vfTotal: number;
  simulacrosCompletados: number;
  causasGanadas: number;
  causasPerdidas: number;
  publicaciones: { obiters: number; analisis: number; ensayos: number };
  colegasCount: number;
  badgesCount: number;
}

interface XpLogEntry {
  id: string;
  detalle: string | null;
  amount: number;
  materia: string | null;
  category: string;
  createdAt: string;
}

interface InsigniaEntry {
  id: string;
  badge: string;
  earnedAt: string;
}

interface LigaEntry {
  id: string;
  weeklyXp: number;
  rank: number | null;
  tier: string;
  weekStart: string;
  weekEnd: string;
}

interface ApiResponse {
  user: UserData;
  estadisticas: Estadisticas;
  actividad: XpLogEntry[];
  insignias: InsigniaEntry[];
  ligaHistory: LigaEntry[];
  reportesRecibidos: number;
}

/* ── Badge labels ──────────────────────────────────────── */

const BADGE_LABELS: Record<string, string> = {
  ABOGADO_LITIGANTE: "Abogado Litigante",
  CONTENDOR: "Contendor",
  GLADIADOR: "Gladiador",
  INVICTO: "Invicto",
  JURISCONSULTO_SEMANA: "Jurisconsulto de la Semana",
  PASANTE: "Pasante",
  PENALISTA_EN_SERIE: "Penalista en Serie",
  PROCURADOR: "Procurador",
  SOCIEDAD_DE_HECHO: "Sociedad de Hecho",
  INFLUYENTE: "Influyente",
  MAESTRO: "Maestro",
  ORGANIZADOR: "Organizador",
  PRIMER_COLEGA: "Primer Colega",
  RED_DE_CONTACTOS: "Red de Contactos",
  TUTOR: "Tutor",
  COMENTARISTA: "Comentarista",
  CONTROVERSIA: "Controversia",
  DOCTRINARIO: "Doctrinario",
  ENSAYISTA: "Ensayista",
  PLUMA_NOVEL: "Pluma Novel",
  TRATADISTA: "Tratadista",
  VOZ_DEL_FORO: "Voz del Foro",
  ALUMNO_APLICADO: "Alumno Aplicado",
  CASACIONISTA: "Casacionista",
  DETECTOR_DE_FALACIAS: "Detector de Falacias",
  ERUDITO: "Erudito",
  ESTUDIANTE_INTEGRAL: "Estudiante Integral",
  INFALIBLE: "Infalible",
  LEXICOGRAFO: "Lexicografo",
  MEMORISTA: "Memorista",
  PRIMERA_INSTANCIA: "Primera Instancia",
  SEGUNDA_INSTANCIA: "Segunda Instancia",
  CONSTANTE: "Constante",
  DISCIPLINADO: "Disciplinado",
  ESPARTANO: "Espartano",
  IMPLACABLE: "Implacable",
  MADRUGADOR: "Madrugador",
  NOCTAMBULO: "Noctambulo",
  CINCO_VOCES: "Cinco Voces",
  DOMADOR_DE_AUGUSTO: "Domador de Augusto",
  ORADOR: "Orador",
  PRIMER_ALEGATO: "Primer Alegato",
  SOBRESALIENTE: "Sobresaliente",
  TRIBUNO: "Tribuno",
  ASCENDIDO: "Ascendido",
  AVANZADO: "Avanzado",
  CONSEJERO: "Consejero",
  ESCALADOR: "Escalador",
  EXPERTO: "Experto",
  CUMBRE: "Cumbre",
  LEYENDA: "Leyenda",
  MAGISTRADO: "Magistrado",
  NOVATO: "Novato",
};

const TIER_LABELS: Record<string, string> = {
  CARTON: "Carton",
  HIERRO: "Hierro",
  BRONCE: "Bronce",
  COBRE: "Cobre",
  PLATA: "Plata",
  ORO: "Oro",
  DIAMANTE: "Diamante",
  PLATINO: "Platino",
  JURISCONSULTO: "Jurisconsulto",
};

/* ── Component ─────────────────────────────────────────── */

export function UserDetailClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handlePlanChange = async (newPlan: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (res.ok) fetchUser();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  const handleGradoChange = async (newGrado: string) => {
    const g = parseInt(newGrado, 10);
    if (isNaN(g) || g < 1 || g > 33) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grado: g }),
      });
      if (res.ok) fetchUser();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suspend", reason: suspendReason.trim() }),
      });
      if (res.ok) {
        setShowSuspendModal(false);
        setSuspendReason("");
        fetchUser();
      }
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!confirm("Reactivar a este usuario?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unsuspend" }),
      });
      if (res.ok) fetchUser();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Loading / Error ─────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-navy/5" />
        <div className="h-40 animate-pulse rounded-xl bg-navy/5" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-navy/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-navy/40">
        Usuario no encontrado
      </div>
    );
  }

  const { user, estadisticas, actividad, insignias, ligaHistory, reportesRecibidos } = data;
  const fullName = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const pubTotal =
    estadisticas.publicaciones.obiters +
    estadisticas.publicaciones.analisis +
    estadisticas.publicaciones.ensayos;

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-navy/50">
        <button
          onClick={() => router.push("/admin")}
          className="hover:text-navy transition-colors"
        >
          Admin
        </button>
        <span>/</span>
        <button
          onClick={() => router.push("/admin/usuarios")}
          className="hover:text-navy transition-colors"
        >
          Usuarios
        </button>
        <span>/</span>
        <span className="text-navy font-medium">{fullName}</span>
      </nav>

      {/* Suspended Banner */}
      {user.suspended && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            Usuario suspendido
          </p>
          {user.suspendedAt && (
            <p className="text-xs text-red-600 mt-1">
              Desde:{" "}
              {new Date(user.suspendedAt).toLocaleDateString("es-CL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
          {user.suspendedReason && (
            <p className="text-xs text-red-600 mt-1">
              Motivo: {user.suspendedReason}
            </p>
          )}
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={fullName}
              className="h-24 w-24 rounded-full object-cover border-2 border-navy/10"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-navy/10 text-2xl font-bold text-navy border-2 border-navy/10">
              {initials}
            </span>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-navy font-display italic">
                {fullName}
              </h1>
              {user.isAdmin && (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">
                  ADMIN
                </span>
              )}
              {user.suspended ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                  Suspendido
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                  Activo
                </span>
              )}
            </div>
            <p className="text-sm text-navy/60 mt-1">{user.email}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-navy/70">
              {user.universidad && (
                <span>
                  {user.universidad}
                  {user.sede ? ` - ${user.sede}` : ""}
                </span>
              )}
              <span>Grado {user.grado}</span>
              <span>{user.xp.toLocaleString("es-CL")} XP</span>
              <span
                className={`font-medium ${
                  user.plan === "FREE" ? "text-navy/50" : "text-gold"
                }`}
              >
                {user.plan === "FREE"
                  ? "Free"
                  : user.plan === "PREMIUM_MONTHLY"
                  ? "Premium Mensual"
                  : "Premium Anual"}
              </span>
            </div>
            <p className="text-xs text-navy/40 mt-1">
              Registrado:{" "}
              {new Date(user.createdAt).toLocaleDateString("es-CL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {reportesRecibidos > 0 && (
                <span className="ml-3 text-red-500 font-medium">
                  {reportesRecibidos} reporte{reportesRecibidos !== 1 ? "s" : ""} recibido{reportesRecibidos !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mt-5 pt-5 border-t border-border">
          {/* Plan select */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-navy/60">Plan:</label>
            <select
              value={user.plan}
              disabled={actionLoading}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-navy outline-none focus:ring-2 focus:ring-gold/30"
            >
              <option value="FREE">Free</option>
              <option value="PREMIUM_MONTHLY">Premium Mensual</option>
              <option value="PREMIUM_ANNUAL">Premium Anual</option>
            </select>
          </div>

          {/* Grado input */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-navy/60">Grado:</label>
            <input
              type="number"
              min={1}
              max={33}
              defaultValue={user.grado}
              disabled={actionLoading}
              onBlur={(e) => {
                if (e.target.value !== String(user.grado)) {
                  handleGradoChange(e.target.value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-16 rounded-lg border border-border bg-white px-2 py-1.5 text-xs text-navy text-center outline-none focus:ring-2 focus:ring-gold/30"
            />
          </div>

          {/* Suspend / Unsuspend */}
          {user.suspended ? (
            <button
              disabled={actionLoading}
              onClick={handleUnsuspend}
              className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50 transition-colors"
            >
              Reactivar
            </button>
          ) : (
            <button
              disabled={actionLoading}
              onClick={() => setShowSuspendModal(true)}
              className="rounded-lg bg-orange-100 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-200 disabled:opacity-50 transition-colors"
            >
              Suspender
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="FC Dominadas" value={estadisticas.flashcardsDominadas} />
        <StatCard
          label="MCQ Correctas"
          value={`${estadisticas.mcqCorrectas}/${estadisticas.mcqTotal}`}
          sub={
            estadisticas.mcqTotal > 0
              ? `${Math.round((estadisticas.mcqCorrectas / estadisticas.mcqTotal) * 100)}%`
              : undefined
          }
        />
        <StatCard
          label="V/F Correctas"
          value={`${estadisticas.vfCorrectas}/${estadisticas.vfTotal}`}
          sub={
            estadisticas.vfTotal > 0
              ? `${Math.round((estadisticas.vfCorrectas / estadisticas.vfTotal) * 100)}%`
              : undefined
          }
        />
        <StatCard label="Simulacros" value={estadisticas.simulacrosCompletados} />
        <StatCard
          label="Causas Ganadas"
          value={`${estadisticas.causasGanadas}W / ${estadisticas.causasPerdidas}L`}
        />
        <StatCard
          label="Publicaciones"
          value={pubTotal}
          sub={`${estadisticas.publicaciones.obiters}O ${estadisticas.publicaciones.analisis}A ${estadisticas.publicaciones.ensayos}E`}
        />
        <StatCard label="Colegas" value={estadisticas.colegasCount} />
        <StatCard label="Insignias" value={estadisticas.badgesCount} />
      </div>

      {/* Activity Log */}
      <div className="rounded-xl border border-border bg-white">
        <h2 className="px-5 pt-5 pb-3 text-sm font-bold text-navy">
          Actividad Reciente (XP)
        </h2>
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {actividad.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-navy/40">
              Sin actividad registrada
            </p>
          ) : (
            actividad.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-navy/[0.02]"
              >
                <span className="shrink-0 text-xs text-navy/40 w-24">
                  {new Date(a.createdAt).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                <span className="flex-1 text-navy/70 truncate">
                  {a.detalle ?? a.category}
                </span>
                {a.materia && (
                  <span className="shrink-0 rounded-full bg-navy/5 px-2 py-0.5 text-[10px] text-navy/50">
                    {a.materia}
                  </span>
                )}
                <span
                  className={`shrink-0 font-mono text-xs font-semibold ${
                    a.amount >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {a.amount >= 0 ? "+" : ""}
                  {a.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Badges */}
      {insignias.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-sm font-bold text-navy mb-3">Insignias Obtenidas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {insignias.map((i) => (
              <div
                key={i.id}
                className="flex flex-col items-center gap-1 rounded-lg bg-gold/5 p-3 text-center"
              >
                <span className="text-lg">
                  {getBadgeEmoji(i.badge)}
                </span>
                <span className="text-[10px] font-medium text-navy leading-tight">
                  {BADGE_LABELS[i.badge] ?? i.badge}
                </span>
                <span className="text-[9px] text-navy/40">
                  {new Date(i.earnedAt).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liga History */}
      {ligaHistory.length > 0 && (
        <div className="rounded-xl border border-border bg-white">
          <h2 className="px-5 pt-5 pb-3 text-sm font-bold text-navy">
            Historial de Ligas
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-navy/[0.03]">
                  <th className="px-5 py-2.5 text-left font-medium text-navy/60">
                    Semana
                  </th>
                  <th className="px-5 py-2.5 text-left font-medium text-navy/60">
                    Liga
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium text-navy/60">
                    XP Semanal
                  </th>
                  <th className="px-5 py-2.5 text-right font-medium text-navy/60">
                    Posicion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ligaHistory.map((l) => (
                  <tr key={l.id} className="hover:bg-navy/[0.02]">
                    <td className="px-5 py-2.5 text-navy/70">
                      {new Date(l.weekStart).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                      })}
                      {" - "}
                      {new Date(l.weekEnd).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                        {TIER_LABELS[l.tier] ?? l.tier}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-navy/70">
                      {l.weeklyXp.toLocaleString("es-CL")}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-navy/70">
                      {l.rank != null ? `#${l.rank}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setShowSuspendModal(false);
            setSuspendReason("");
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-navy">Suspender Usuario</h3>
            <p className="text-sm text-navy/60 mt-1">
              Suspender a <strong>{fullName}</strong>. Indica el motivo:
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Motivo de la suspension..."
              rows={3}
              className="mt-3 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy outline-none focus:ring-2 focus:ring-gold/30 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendReason("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm text-navy/60 hover:bg-navy/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={actionLoading || !suspendReason.trim()}
                onClick={handleSuspend}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Suspendiendo..." : "Confirmar Suspension"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-xs text-navy/50">{label}</p>
      <p className="mt-1 text-lg font-bold text-navy">{value}</p>
      {sub && <p className="text-[10px] text-navy/40 mt-0.5">{sub}</p>}
    </div>
  );
}

function getBadgeEmoji(badge: string): string {
  const map: Record<string, string> = {
    // Estudio
    ALUMNO_APLICADO: "\u{1F4DA}",
    CASACIONISTA: "\u{2696}",
    DETECTOR_DE_FALACIAS: "\u{1F50D}",
    ERUDITO: "\u{1F393}",
    ESTUDIANTE_INTEGRAL: "\u{1F31F}",
    INFALIBLE: "\u{1F3AF}",
    LEXICOGRAFO: "\u{1F4D6}",
    MEMORISTA: "\u{1F9E0}",
    PRIMERA_INSTANCIA: "\u{1F3DB}",
    SEGUNDA_INSTANCIA: "\u{1F3DB}",
    // Causas
    ABOGADO_LITIGANTE: "\u{2696}",
    CONTENDOR: "\u{1F94A}",
    GLADIADOR: "\u{1F3C6}",
    INVICTO: "\u{1F451}",
    PASANTE: "\u{1F4BC}",
    PROCURADOR: "\u{1F4DC}",
    SOCIEDAD_DE_HECHO: "\u{1F91D}",
    // Comunidad
    INFLUYENTE: "\u{1F310}",
    MAESTRO: "\u{1F9D1}\u200D\u{1F3EB}",
    ORGANIZADOR: "\u{1F4CB}",
    PRIMER_COLEGA: "\u{1F44B}",
    RED_DE_CONTACTOS: "\u{1F517}",
    TUTOR: "\u{1F4A1}",
    // Diario
    COMENTARISTA: "\u{1F4AC}",
    CONTROVERSIA: "\u{1F525}",
    DOCTRINARIO: "\u{1F4D5}",
    ENSAYISTA: "\u{270D}",
    PLUMA_NOVEL: "\u{1F58A}",
    TRATADISTA: "\u{1F4D8}",
    VOZ_DEL_FORO: "\u{1F4E3}",
    // Simulacro
    CINCO_VOCES: "\u{1F399}",
    DOMADOR_DE_AUGUSTO: "\u{1F981}",
    ORADOR: "\u{1F3A4}",
    PRIMER_ALEGATO: "\u{1F5E3}",
    SOBRESALIENTE: "\u{2B50}",
    TRIBUNO: "\u{1F3DB}",
    // Rachas
    CONSTANTE: "\u{1F4AA}",
    DISCIPLINADO: "\u{1F3C5}",
    ESPARTANO: "\u{1F6E1}",
    IMPLACABLE: "\u{26A1}",
    MADRUGADOR: "\u{1F305}",
    NOCTAMBULO: "\u{1F319}",
    // XP + Liga
    ASCENDIDO: "\u{1F4C8}",
    AVANZADO: "\u{1F680}",
    CONSEJERO: "\u{1F9D1}\u200D\u2696",
    ESCALADOR: "\u{1F9D7}",
    EXPERTO: "\u{1F48E}",
    CUMBRE: "\u{1F3D4}",
    LEYENDA: "\u{1F3C6}",
    MAGISTRADO: "\u{1F3DB}",
    NOVATO: "\u{1F331}",
  };
  return map[badge] ?? "\u{1F3C5}";
}
