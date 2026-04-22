"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MATERIAS_SALA,
  UNIVERSIDADES_CHILE,
  REPORT_REASONS,
} from "@/lib/ayudantia-constants";

// ─── Types ────────────────────────────────────────────────

interface AyudantiaUser {
  id: string;
  firstName: string;
  lastName: string;
  tier: string | null;
}

interface AyudantiaStreak {
  monthsActive: number;
  longestStreak: number;
}

interface AyudantiaItem {
  id: string;
  type: string;
  materia: string;
  format: string;
  priceType: string;
  priceAmount: number | null;
  description: string;
  universidad: string;
  orientadaA: string[];
  contactMethod: string;
  contactValue: string;
  createdAt: string;
  user: AyudantiaUser;
  streak: AyudantiaStreak | null;
}

interface MiAyudantia {
  id: string;
  type: string;
  materia: string;
  format: string;
  priceType: string;
  priceAmount: number | null;
  description: string;
  universidad: string;
  orientadaA: string[];
  contactMethod: string;
  contactValue: string;
  isActive: boolean;
  reportCount: number;
  createdAt: string;
}

interface SalaClientProps {
  userId: string;
  initialAyudantias: AyudantiaItem[];
  misAyudantias: MiAyudantia[];
  streak: AyudantiaStreak | null;
}

// ─── Tier helpers ─────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  CARTON: "Carton", HIERRO: "Hierro", BRONCE: "Bronce", COBRE: "Cobre",
  PLATA: "Plata", ORO: "Oro", DIAMANTE: "Diamante", PLATINO: "Platino",
  JURISCONSULTO: "Jurisconsulto",
};

const TIER_EMOJIS: Record<string, string> = {
  CARTON: "📦", HIERRO: "🔩", BRONCE: "🥉", COBRE: "🟤",
  PLATA: "🥈", ORO: "🥇", DIAMANTE: "💎", PLATINO: "⚜️",
  JURISCONSULTO: "⚖️",
};

// ─── Time helpers ─────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months > 1 ? "es" : ""}`;
}

// ─── Component ────────────────────────────────────────────

export function SalaClient({
  userId,
  initialAyudantias,
  misAyudantias: initialMis,
  streak,
}: SalaClientProps) {
  const router = useRouter();

  // Tab
  const [tab, setTab] = useState<"OFREZCO" | "BUSCO">("OFREZCO");
  const [section, setSection] = useState<"tablon" | "mis">("tablon");

  // Data
  const [ayudantias, setAyudantias] = useState(initialAyudantias);
  const [misAyudantias, setMisAyudantias] = useState(initialMis);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterMateria, setFilterMateria] = useState("");
  const [filterFormat, setFilterFormat] = useState("");
  const [filterPrice, setFilterPrice] = useState("");
  const [filterUni, setFilterUni] = useState("");

  // Publish modal
  const [showPublish, setShowPublish] = useState(false);
  const [publishStep, setPublishStep] = useState(1);
  const [pubType, setPubType] = useState<"OFREZCO" | "BUSCO">("OFREZCO");
  const [pubMateria, setPubMateria] = useState("");
  const [pubUni, setPubUni] = useState("");
  const [pubOrientadaA, setPubOrientadaA] = useState<string[]>([]);
  const [pubFormat, setPubFormat] = useState("ONLINE");
  const [pubPriceType, setPubPriceType] = useState("GRATUITO");
  const [pubPriceAmount, setPubPriceAmount] = useState("");
  const [pubContactMethod, setPubContactMethod] = useState("WHATSAPP");
  const [pubContactValue, setPubContactValue] = useState("");
  const [pubDescription, setPubDescription] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  // Report modal
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportCustom, setReportCustom] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Expanded descriptions
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ─── Fetch ayudantías ───────────────────────────────────

  async function fetchAyudantias(type: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (filterMateria) params.set("materia", filterMateria);
      if (filterFormat) params.set("format", filterFormat);
      if (filterPrice) params.set("priceType", filterPrice);
      if (filterUni) params.set("universidad", filterUni);

      const res = await fetch(`/api/sala/ayudantias?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAyudantias(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function handleTabChange(newTab: "OFREZCO" | "BUSCO") {
    setTab(newTab);
    setSection("tablon");
    fetchAyudantias(newTab);
  }

  function handleFilter() {
    fetchAyudantias(tab);
  }

  function clearFilters() {
    setFilterMateria("");
    setFilterFormat("");
    setFilterPrice("");
    setFilterUni("");
    // Re-fetch sin filtros
    setTimeout(() => fetchAyudantias(tab), 0);
  }

  // ─── Publish ────────────────────────────────────────────

  function openPublishModal() {
    setPubType("OFREZCO");
    setPubMateria("");
    setPubUni("");
    setPubOrientadaA([]);
    setPubFormat("ONLINE");
    setPubPriceType("GRATUITO");
    setPubPriceAmount("");
    setPubContactMethod("WHATSAPP");
    setPubContactValue("");
    setPubDescription("");
    setPubError(null);
    setPublishStep(1);
    setShowPublish(true);
  }

  async function handlePublish() {
    if (!pubMateria || !pubUni || !pubDescription.trim() || !pubContactValue.trim()) {
      setPubError("Completa todos los campos requeridos");
      return;
    }

    setPublishing(true);
    setPubError(null);

    try {
      const res = await fetch("/api/sala/ayudantias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: pubType,
          materia: pubMateria,
          format: pubFormat,
          priceType: pubPriceType,
          priceAmount: pubPriceType === "PAGADO" ? Number(pubPriceAmount) || 0 : undefined,
          description: pubDescription.trim(),
          universidad: pubUni,
          orientadaA: pubOrientadaA,
          contactMethod: pubContactMethod,
          contactValue: pubContactValue.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Publicación creada ✓");
        setShowPublish(false);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "No se pudo publicar");
        setPubError(data.error);
      }
    } catch {
      toast.error("Error de conexión");
      setPubError("Error de conexion");
    } finally {
      setPublishing(false);
    }
  }

  // ─── Toggle active ─────────────────────────────────────

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      if (currentActive) {
        await fetch(`/api/sala/ayudantias/${id}`, { method: "DELETE" });
      } else {
        await fetch(`/api/sala/ayudantias/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: true }),
        });
      }
      setMisAyudantias((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, isActive: !currentActive } : a
        )
      );
      toast.success(currentActive ? "Publicación desactivada" : "Publicación reactivada");
    } catch {
      toast.error("Ocurrió un error, intenta de nuevo");
    }
  }

  // ─── Report ─────────────────────────────────────────────

  async function handleReport() {
    if (!reportingId) return;
    const reason =
      reportReason === "Otro" ? reportCustom.trim() : reportReason;
    if (!reason) return;

    setReportLoading(true);
    try {
      const res = await fetch(
        `/api/sala/ayudantias/${reportingId}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        toast.success("Reporte enviado");
        if (data.deactivated) {
          setAyudantias((prev) =>
            prev.filter((a) => a.id !== reportingId)
          );
        }
      }
    } catch {
      toast.error("Ocurrió un error, intenta de nuevo");
    } finally {
      setReportLoading(false);
      setReportingId(null);
      setReportReason("");
      setReportCustom("");
    }
  }

  // ─── Contact helpers ────────────────────────────────────

  function getContactUrl(method: string, value: string): string | null {
    if (method === "WHATSAPP") {
      const clean = value.replace(/\D/g, "");
      return `https://wa.me/${clean}`;
    }
    if (method === "EMAIL") {
      return `mailto:${value}`;
    }
    return null;
  }

  function getContactLabel(method: string): string {
    if (method === "WHATSAPP") return "WhatsApp";
    if (method === "EMAIL") return "Email";
    return "Contacto";
  }

  // ─── Toggle orientadaA ─────────────────────────────────

  function toggleOrientadaA(uni: string) {
    setPubOrientadaA((prev) => {
      if (prev.includes(uni)) {
        return prev.filter((u) => u !== uni);
      }
      if (prev.length >= 5) return prev;
      return [...prev, uni];
    });
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <main className="min-h-screen">
      {/* Sub-header de Profesión — full bleed */}
      <div className="gz-section-header border-b border-gz-rule py-3" style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">Profesi&oacute;n</h2>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              Conecta con tutores y estudiantes de Derecho
            </p>
          </div>
          <button
            onClick={openPublishModal}
            className="rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
          >
            + Publicar
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Streak banner */}
        {streak && streak.monthsActive >= 2 && (
          <div className="mb-6 rounded-[4px] border border-gz-gold/30 bg-gz-gold/[0.06] px-5 py-3 text-center">
            <span className="text-lg">🔥</span>
            <span className="ml-2 font-archivo text-[13px] font-semibold text-gz-ink">
              Llevas {streak.monthsActive} meses activo como tutor
            </span>
            <span className="ml-2 font-ibm-mono text-[11px] text-gz-ink-light">
              (record: {streak.longestStreak})
            </span>
          </div>
        )}

        {/* Section tabs */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex gap-2 border border-gz-rule rounded-[4px] p-1">
            <button
              onClick={() => setSection("tablon")}
              className={`rounded-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
                section === "tablon"
                  ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                  : "text-gz-ink-mid hover:text-gz-ink"
              }`}
            >
              Tablon
            </button>
            <button
              onClick={() => setSection("mis")}
              className={`rounded-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
                section === "mis"
                  ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                  : "text-gz-ink-mid hover:text-gz-ink"
              }`}
            >
              Mis Publicaciones
              {misAyudantias.filter((a) => a.isActive).length > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gz-gold text-[10px] font-bold text-white">
                  {misAyudantias.filter((a) => a.isActive).length}
                </span>
              )}
            </button>
          </div>

          {section === "tablon" && (
            <div className="flex gap-2 border border-gz-rule rounded-[4px] p-1">
              <button
                onClick={() => handleTabChange("OFREZCO")}
                className={`rounded-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === "OFREZCO"
                    ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                    : "text-gz-ink-mid hover:text-gz-ink"
                }`}
              >
                Ofrecen Ayudantia
              </button>
              <button
                onClick={() => handleTabChange("BUSCO")}
                className={`rounded-[3px] px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === "BUSCO"
                    ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                    : "text-gz-ink-mid hover:text-gz-ink"
                }`}
              >
                Buscan Ayudantia
              </button>
            </div>
          )}
        </div>

        {/* ─── TABLÓN ──────────────────────────────────────── */}
        {section === "tablon" && (
          <div className="flex gap-6">
            {/* Sidebar filtros */}
            <aside className="hidden w-[220px] shrink-0 lg:block">
              <div className="sticky top-4 space-y-4 rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
                <h3 className="font-ibm-mono text-[11px] uppercase tracking-[1.5px] text-gz-ink-light">Filtros</h3>

                <div>
                  <label className="font-ibm-mono text-[10px] text-gz-ink-light">
                    Materia
                  </label>
                  <select
                    value={filterMateria}
                    onChange={(e) => setFilterMateria(e.target.value)}
                    className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    <option value="">Todas</option>
                    {MATERIAS_SALA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-ibm-mono text-[10px] text-gz-ink-light">
                    Formato
                  </label>
                  <select
                    value={filterFormat}
                    onChange={(e) => setFilterFormat(e.target.value)}
                    className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    <option value="">Todos</option>
                    <option value="ONLINE">Online</option>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </div>

                <div>
                  <label className="font-ibm-mono text-[10px] text-gz-ink-light">
                    Precio
                  </label>
                  <select
                    value={filterPrice}
                    onChange={(e) => setFilterPrice(e.target.value)}
                    className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    <option value="">Todos</option>
                    <option value="GRATUITO">Gratuito</option>
                    <option value="PAGADO">Pagado</option>
                  </select>
                </div>

                <div>
                  <label className="font-ibm-mono text-[10px] text-gz-ink-light">
                    Facultad
                  </label>
                  <select
                    value={filterUni}
                    onChange={(e) => setFilterUni(e.target.value)}
                    className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    <option value="">Todas</option>
                    {UNIVERSIDADES_CHILE.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleFilter}
                    className="flex-1 rounded-[3px] bg-gz-navy px-3 py-2 font-archivo text-[11px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                  >
                    Filtrar
                  </button>
                  <button
                    onClick={clearFilters}
                    className="rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[11px] text-gz-ink-mid hover:border-gz-gold transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </aside>

            {/* Grid de cards */}
            <div className="min-w-0 flex-1">
              {/* Mobile filters */}
              <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
                <select
                  value={filterMateria}
                  onChange={(e) => {
                    setFilterMateria(e.target.value);
                    setTimeout(() => fetchAyudantias(tab), 0);
                  }}
                  className="rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                >
                  <option value="">Materia</option>
                  {MATERIAS_SALA.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={filterFormat}
                  onChange={(e) => {
                    setFilterFormat(e.target.value);
                    setTimeout(() => fetchAyudantias(tab), 0);
                  }}
                  className="rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                >
                  <option value="">Formato</option>
                  <option value="ONLINE">Online</option>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="AMBOS">Ambos</option>
                </select>
                <select
                  value={filterPrice}
                  onChange={(e) => {
                    setFilterPrice(e.target.value);
                    setTimeout(() => fetchAyudantias(tab), 0);
                  }}
                  className="rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                >
                  <option value="">Precio</option>
                  <option value="GRATUITO">Gratis</option>
                  <option value="PAGADO">Pagado</option>
                </select>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <p className="font-cormorant italic text-[17px] text-gz-ink-light">Cargando...</p>
                </div>
              ) : ayudantias.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl">📋</p>
                  <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-light">
                    No hay publicaciones con estos filtros
                  </p>
                  <button
                    onClick={openPublishModal}
                    className="mt-4 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                  >
                    Se el primero en publicar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {ayudantias.map((a) => (
                    <AyudantiaCard
                      key={a.id}
                      item={a}
                      userId={userId}
                      expanded={expanded.has(a.id)}
                      onToggleExpand={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(a.id)) next.delete(a.id);
                          else next.add(a.id);
                          return next;
                        })
                      }
                      onReport={() => {
                        setReportingId(a.id);
                        setReportReason("");
                        setReportCustom("");
                      }}
                      getContactUrl={getContactUrl}
                      getContactLabel={getContactLabel}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MIS PUBLICACIONES ───────────────────────────── */}
        {section === "mis" && (
          <div>
            {misAyudantias.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl">📝</p>
                <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-light">
                  No tienes publicaciones aun
                </p>
                <button
                  onClick={openPublishModal}
                  className="mt-4 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                >
                  Crear tu primera publicacion
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {misAyudantias.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-[4px] border border-gz-rule p-4 ${
                      a.isActive
                        ? "bg-white"
                        : "opacity-60"
                    }`}
                    style={!a.isActive ? { backgroundColor: "var(--gz-cream)" } : undefined}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-sm px-2 py-0.5 font-ibm-mono text-[9px] font-semibold ${
                              a.type === "OFREZCO"
                                ? "bg-gz-sage/[0.15] text-gz-sage"
                                : "bg-gz-navy/[0.15] text-gz-navy"
                            }`}
                          >
                            {a.type === "OFREZCO" ? "Ofrezco" : "Busco"}
                          </span>
                          <span className="rounded-sm bg-gz-gold/15 px-2 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-gold">
                            {a.materia}
                          </span>
                          {!a.isActive && (
                            <span className="rounded-sm bg-gz-burgundy/[0.15] px-2 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-burgundy">
                              Inactiva
                            </span>
                          )}
                          {a.reportCount > 0 && (
                            <span className="font-ibm-mono text-[10px] text-gz-burgundy">
                              {a.reportCount} reporte{a.reportCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 font-archivo text-[13px] text-gz-ink">
                          {a.description}
                        </p>
                        <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
                          {new Date(a.createdAt).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleActive(a.id, a.isActive)}
                        className={`shrink-0 rounded-[3px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                          a.isActive
                            ? "bg-gz-burgundy/[0.15] text-gz-burgundy hover:bg-gz-burgundy/20"
                            : "bg-gz-sage/[0.15] text-gz-sage hover:bg-gz-sage/20"
                        }`}
                      >
                        {a.isActive ? "Desactivar" : "Reactivar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Modal Publicar ────────────────────────────────── */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[4px] p-6 shadow-xl border border-gz-rule" style={{ backgroundColor: "var(--gz-cream)" }}>
            {publishStep === 1 && (
              <>
                <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">
                  Que tipo de publicacion?
                </h2>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setPubType("OFREZCO");
                      setPublishStep(2);
                    }}
                    className="rounded-[4px] border-2 border-gz-sage/30 bg-gz-sage/[0.06] p-6 text-center transition-colors hover:border-gz-sage"
                  >
                    <span className="text-3xl">🎓</span>
                    <p className="mt-2 font-semibold text-gz-sage">
                      Ofrezco Ayudantia
                    </p>
                    <p className="mt-1 text-xs text-gz-sage/70">
                      Soy tutor y quiero ayudar
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setPubType("BUSCO");
                      setPublishStep(2);
                    }}
                    className="rounded-[4px] border-2 border-gz-burgundy/30 bg-gz-burgundy/[0.06] p-6 text-center transition-colors hover:border-gz-burgundy"
                  >
                    <span className="text-3xl">🔍</span>
                    <p className="mt-2 font-semibold text-gz-burgundy">
                      Busco Ayudantia
                    </p>
                    <p className="mt-1 text-xs text-gz-burgundy/70">
                      Necesito un tutor
                    </p>
                  </button>
                </div>
                <button
                  onClick={() => setShowPublish(false)}
                  className="mt-6 w-full rounded-[3px] border border-gz-rule px-4 py-2 font-archivo text-[13px] text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors"
                >
                  Cancelar
                </button>
              </>
            )}

            {publishStep === 2 && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPublishStep(1)}
                    className="text-sm text-gz-ink-light hover:text-gz-ink"
                  >
                    &larr;
                  </button>
                  <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">
                    {pubType === "OFREZCO"
                      ? "Ofrezco Ayudantia"
                      : "Busco Ayudantia"}
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Materia */}
                  <div>
                    <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                      Materia *
                    </label>
                    <select
                      value={pubMateria}
                      onChange={(e) => setPubMateria(e.target.value)}
                      className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                      style={{ backgroundColor: "var(--gz-cream)" }}
                    >
                      <option value="">Selecciona...</option>
                      {MATERIAS_SALA.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Universidad */}
                  <div>
                    <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                      Tu facultad *
                    </label>
                    <select
                      value={pubUni}
                      onChange={(e) => setPubUni(e.target.value)}
                      className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                      style={{ backgroundColor: "var(--gz-cream)" }}
                    >
                      <option value="">Selecciona...</option>
                      {UNIVERSIDADES_CHILE.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campos solo para OFREZCO */}
                  {pubType === "OFREZCO" && (
                    <>
                      {/* Orientada a */}
                      <div>
                        <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                          Orientada a (max 5 facultades)
                        </label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {UNIVERSIDADES_CHILE.filter(u => u !== "Otra").map((u) => (
                            <button
                              key={u}
                              onClick={() => toggleOrientadaA(u)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                pubOrientadaA.includes(u)
                                  ? "bg-gz-gold/20 text-gz-gold ring-1 ring-gz-gold/30"
                                  : "text-gz-ink-light hover:bg-gz-cream-dark"
                              }`}
                              style={!pubOrientadaA.includes(u) ? { backgroundColor: "var(--gz-cream)" } : undefined}
                            >
                              {u.replace("Universidad ", "U. ").replace("Pontificia ", "P. ")}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Formato */}
                      <div>
                        <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                          Formato
                        </label>
                        <div className="mt-2 flex gap-2">
                          {["ONLINE", "PRESENCIAL", "AMBOS"].map((f) => (
                            <button
                              key={f}
                              onClick={() => setPubFormat(f)}
                              className={`flex-1 rounded-[3px] border px-3 py-2 text-xs font-semibold transition-colors ${
                                pubFormat === f
                                  ? "border-gz-gold bg-gz-gold/10 text-gz-ink"
                                  : "border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark"
                              }`}
                            >
                              {f === "ONLINE"
                                ? "Online"
                                : f === "PRESENCIAL"
                                ? "Presencial"
                                : "Ambos"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Precio */}
                      <div>
                        <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                          Precio
                        </label>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setPubPriceType("GRATUITO")}
                            className={`flex-1 rounded-[3px] border px-3 py-2 text-xs font-semibold transition-colors ${
                              pubPriceType === "GRATUITO"
                                ? "border-gz-sage bg-gz-sage/[0.06] text-gz-sage"
                                : "border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark"
                            }`}
                          >
                            Gratuito
                          </button>
                          <button
                            onClick={() => setPubPriceType("PAGADO")}
                            className={`flex-1 rounded-[3px] border px-3 py-2 text-xs font-semibold transition-colors ${
                              pubPriceType === "PAGADO"
                                ? "border-gz-gold bg-gz-gold/10 text-gz-ink"
                                : "border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark"
                            }`}
                          >
                            Pagado
                          </button>
                        </div>
                        {pubPriceType === "PAGADO" && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-gz-ink-light">$</span>
                            <input
                              type="number"
                              placeholder="Precio CLP"
                              value={pubPriceAmount}
                              onChange={(e) =>
                                setPubPriceAmount(e.target.value)
                              }
                              className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                              style={{ backgroundColor: "var(--gz-cream)" }}
                            />
                            <span className="font-ibm-mono text-[11px] text-gz-ink-light">CLP</span>
                          </div>
                        )}
                      </div>

                      {/* Contacto */}
                      <div>
                        <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                          Metodo de contacto *
                        </label>
                        <div className="mt-2 flex gap-2">
                          {[
                            { v: "WHATSAPP", l: "WhatsApp" },
                            { v: "EMAIL", l: "Email" },
                            { v: "OTRO", l: "Otro" },
                          ].map((c) => (
                            <button
                              key={c.v}
                              onClick={() => setPubContactMethod(c.v)}
                              className={`flex-1 rounded-[3px] border px-3 py-2 text-xs font-semibold transition-colors ${
                                pubContactMethod === c.v
                                  ? "border-gz-gold bg-gz-gold/10 text-gz-ink"
                                  : "border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark"
                              }`}
                            >
                              {c.l}
                            </button>
                          ))}
                        </div>
                        <input
                          type={
                            pubContactMethod === "EMAIL" ? "email" : "text"
                          }
                          placeholder={
                            pubContactMethod === "WHATSAPP"
                              ? "+56 9 1234 5678"
                              : pubContactMethod === "EMAIL"
                              ? "tu@email.com"
                              : "Escribe tu contacto"
                          }
                          value={pubContactValue}
                          onChange={(e) =>
                            setPubContactValue(e.target.value)
                          }
                          className="mt-2 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                          style={{ backgroundColor: "var(--gz-cream)" }}
                        />
                      </div>
                    </>
                  )}

                  {/* Campos para BUSCO — contacto y formato simplificado */}
                  {pubType === "BUSCO" && (
                    <>
                      <div>
                        <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                          Metodo de contacto *
                        </label>
                        <div className="mt-2 flex gap-2">
                          {[
                            { v: "WHATSAPP", l: "WhatsApp" },
                            { v: "EMAIL", l: "Email" },
                            { v: "OTRO", l: "Otro" },
                          ].map((c) => (
                            <button
                              key={c.v}
                              onClick={() => setPubContactMethod(c.v)}
                              className={`flex-1 rounded-[3px] border px-3 py-2 text-xs font-semibold transition-colors ${
                                pubContactMethod === c.v
                                  ? "border-gz-gold bg-gz-gold/10 text-gz-ink"
                                  : "border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark"
                              }`}
                            >
                              {c.l}
                            </button>
                          ))}
                        </div>
                        <input
                          type={
                            pubContactMethod === "EMAIL" ? "email" : "text"
                          }
                          placeholder={
                            pubContactMethod === "WHATSAPP"
                              ? "+56 9 1234 5678"
                              : pubContactMethod === "EMAIL"
                              ? "tu@email.com"
                              : "Escribe tu contacto"
                          }
                          value={pubContactValue}
                          onChange={(e) =>
                            setPubContactValue(e.target.value)
                          }
                          className="mt-2 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                          style={{ backgroundColor: "var(--gz-cream)" }}
                        />
                      </div>
                    </>
                  )}

                  {/* Descripcion */}
                  <div>
                    <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                      Descripcion *
                    </label>
                    <textarea
                      value={pubDescription}
                      onChange={(e) =>
                        setPubDescription(e.target.value.slice(0, 500))
                      }
                      rows={4}
                      placeholder={
                        pubType === "OFREZCO"
                          ? "Describe tu experiencia, metodologia, horarios disponibles..."
                          : "Describe que necesitas, que temas, en que te cuesta mas..."
                      }
                      className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light focus:border-gz-gold focus:outline-none resize-none min-h-[100px]"
                      style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                    <p
                      className={`mt-1 text-right font-ibm-mono text-[11px] ${
                        pubDescription.length >= 450
                          ? "text-gz-burgundy"
                          : "text-gz-ink-light"
                      }`}
                    >
                      {pubDescription.length}/500
                    </p>
                  </div>
                </div>

                {pubError && (
                  <p className="mt-3 font-archivo text-[13px] text-gz-burgundy">{pubError}</p>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowPublish(false)}
                    className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex-1 rounded-[3px] bg-gz-navy px-4 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50"
                  >
                    {publishing ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal Reportar ────────────────────────────────── */}
      {reportingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[4px] p-6 shadow-xl border border-gz-rule" style={{ backgroundColor: "var(--gz-cream)" }}>
            <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">
              Reportar publicacion
            </h2>

            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`w-full rounded-[3px] border px-4 py-2.5 text-left text-sm transition-colors ${
                    reportReason === r
                      ? "border-gz-burgundy bg-gz-burgundy/[0.06] text-gz-burgundy"
                      : "border-gz-rule text-gz-ink hover:bg-gz-cream-dark"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {reportReason === "Otro" && (
              <textarea
                value={reportCustom}
                onChange={(e) => setReportCustom(e.target.value)}
                placeholder="Describe el problema..."
                rows={3}
                className="mt-3 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none resize-none min-h-[100px]"
                style={{ backgroundColor: "var(--gz-cream)" }}
              />
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setReportingId(null)}
                className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReport}
                disabled={
                  reportLoading ||
                  !reportReason ||
                  (reportReason === "Otro" && !reportCustom.trim())
                }
                className="flex-1 rounded-[3px] bg-gz-burgundy px-4 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-burgundy/90 transition-colors disabled:opacity-50"
              >
                {reportLoading ? "Reportando..." : "Reportar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── AyudantiaCard Component ──────────────────────────────

function AyudantiaCard({
  item,
  userId,
  expanded,
  onToggleExpand,
  onReport,
  getContactUrl,
  getContactLabel,
}: {
  item: AyudantiaItem;
  userId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onReport: () => void;
  getContactUrl: (method: string, value: string) => string | null;
  getContactLabel: (method: string) => string;
}) {
  const contactUrl = getContactUrl(item.contactMethod, item.contactValue);
  const isOwn = item.user.id === userId;

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5 hover:border-gz-gold transition-colors">
      {/* Header: user info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[12px] font-bold text-gz-ink">
            {item.user.firstName[0]}
            {item.user.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-archivo text-[14px] font-medium text-gz-ink">
                {item.user.firstName} {item.user.lastName}
              </span>
              {item.user.tier && (
                <span className="rounded-sm bg-gz-gold/15 px-2 py-0.5 font-ibm-mono text-[9px] font-semibold text-gz-gold">
                  {TIER_EMOJIS[item.user.tier] ?? ""}{" "}
                  {TIER_LABELS[item.user.tier] ?? item.user.tier}
                </span>
              )}
              {item.type === "OFREZCO" &&
                item.streak &&
                item.streak.monthsActive >= 2 && (
                  <span className="rounded-sm bg-gz-gold/[0.15] px-2 py-0.5 font-ibm-mono text-[9px] font-semibold text-gz-gold">
                    🔥 {item.streak.monthsActive} meses activo
                  </span>
                )}
            </div>
            <p className="font-ibm-mono text-[11px] text-gz-ink-light">
              {item.universidad} · {timeAgo(item.createdAt)}
            </p>
          </div>
        </div>

        {/* Report button */}
        {!isOwn && (
          <button
            onClick={onReport}
            className="shrink-0 rounded-[3px] p-1.5 text-gz-ink-light transition-colors hover:bg-gz-burgundy/[0.06] hover:text-gz-burgundy"
            title="Reportar"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.208.682l3.454-.864V4.5l-3.454.864a9 9 0 01-6.208-.682l-.108-.054a9 9 0 00-6.208-.682L3 5.25v9.75z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-sm bg-gz-gold/15 px-2.5 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-gold">
          {item.materia}
        </span>
        <span
          className={`rounded-sm px-2.5 py-0.5 font-ibm-mono text-[9px] font-medium ${
            item.format === "ONLINE"
              ? "bg-gz-navy/[0.15] text-gz-navy"
              : item.format === "PRESENCIAL"
              ? "bg-gz-ink-mid/[0.15] text-gz-ink-mid"
              : "bg-gz-sage/[0.1] text-gz-sage"
          }`}
        >
          {item.format === "ONLINE"
            ? "Online"
            : item.format === "PRESENCIAL"
            ? "Presencial"
            : "Online + Presencial"}
        </span>
        <span
          className={`rounded-sm px-2.5 py-0.5 font-ibm-mono text-[9px] font-medium ${
            item.priceType === "GRATUITO"
              ? "bg-gz-sage/[0.15] text-gz-sage"
              : "bg-gz-gold/[0.15] text-gz-gold"
          }`}
        >
          {item.priceType === "GRATUITO"
            ? "Gratuito"
            : `$${item.priceAmount?.toLocaleString("es-CL") ?? "0"} CLP`}
        </span>
      </div>

      {/* Orientada a */}
      {item.orientadaA.length > 0 && (
        <p className="mt-2 font-ibm-mono text-[11px] text-gz-ink-light">
          Orienta a:{" "}
          {item.orientadaA
            .map((u) =>
              u.replace("Universidad ", "U. ").replace("Pontificia ", "P. ")
            )
            .join(", ")}
        </p>
      )}

      {/* Description */}
      <div className="mt-3">
        <p
          className={`font-archivo text-[13px] text-gz-ink ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {item.description}
        </p>
        {item.description.length > 150 && (
          <button
            onClick={onToggleExpand}
            className="mt-1 font-archivo text-[12px] font-medium text-gz-gold hover:text-gz-ink"
          >
            {expanded ? "Ver menos" : "Ver mas"}
          </button>
        )}
      </div>

      {/* Contact */}
      <div className="mt-4">
        {contactUrl ? (
          <a
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
          >
            {item.contactMethod === "WHATSAPP" && "📱"}
            {item.contactMethod === "EMAIL" && "📧"}
            Contactar por {getContactLabel(item.contactMethod)}
          </a>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-[3px] px-4 py-2 font-archivo text-[13px] text-gz-ink-mid" style={{ backgroundColor: "var(--gz-cream)" }}>
            📋 {item.contactValue}
          </div>
        )}
      </div>
    </div>
  );
}
