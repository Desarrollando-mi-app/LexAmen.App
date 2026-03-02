"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        setShowPublish(false);
        router.refresh();
      } else {
        const data = await res.json();
        setPubError(data.error);
      }
    } catch {
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
    } catch {
      // silently fail
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
        if (data.deactivated) {
          setAyudantias((prev) =>
            prev.filter((a) => a.id !== reportingId)
          );
        }
      }
    } catch {
      // silently fail
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
    <main className="min-h-screen bg-paper">
      {/* Sub-header de La Sala */}
      <div className="border-b border-border bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy">La Sala</h2>
            <p className="text-xs text-navy/50">
              Conecta con tutores y estudiantes de Derecho
            </p>
          </div>
          <button
            onClick={openPublishModal}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
          >
            + Publicar
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Streak banner */}
        {streak && streak.monthsActive >= 2 && (
          <div className="mb-6 rounded-xl border border-gold/30 bg-gold/5 px-5 py-3 text-center">
            <span className="text-lg">🔥</span>
            <span className="ml-2 text-sm font-semibold text-navy">
              Llevas {streak.monthsActive} meses activo como tutor
            </span>
            <span className="ml-2 text-xs text-navy/50">
              (record: {streak.longestStreak})
            </span>
          </div>
        )}

        {/* Section tabs */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex gap-2 rounded-lg bg-border/20 p-1">
            <button
              onClick={() => setSection("tablon")}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                section === "tablon"
                  ? "bg-white text-navy shadow-sm"
                  : "text-navy/50 hover:text-navy"
              }`}
            >
              Tablon
            </button>
            <button
              onClick={() => setSection("mis")}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                section === "mis"
                  ? "bg-white text-navy shadow-sm"
                  : "text-navy/50 hover:text-navy"
              }`}
            >
              Mis Publicaciones
              {misAyudantias.filter((a) => a.isActive).length > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-white">
                  {misAyudantias.filter((a) => a.isActive).length}
                </span>
              )}
            </button>
          </div>

          {section === "tablon" && (
            <div className="flex gap-2 rounded-lg bg-border/20 p-1">
              <button
                onClick={() => handleTabChange("OFREZCO")}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === "OFREZCO"
                    ? "bg-white text-navy shadow-sm"
                    : "text-navy/50 hover:text-navy"
                }`}
              >
                Ofrecen Ayudantia
              </button>
              <button
                onClick={() => handleTabChange("BUSCO")}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  tab === "BUSCO"
                    ? "bg-white text-navy shadow-sm"
                    : "text-navy/50 hover:text-navy"
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
              <div className="sticky top-4 space-y-4 rounded-xl border border-border bg-white p-4">
                <h3 className="text-sm font-bold text-navy">Filtros</h3>

                <div>
                  <label className="text-xs font-medium text-navy/60">
                    Materia
                  </label>
                  <select
                    value={filterMateria}
                    onChange={(e) => setFilterMateria(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-paper px-3 py-2 text-xs text-navy focus:border-gold focus:outline-none"
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
                  <label className="text-xs font-medium text-navy/60">
                    Formato
                  </label>
                  <select
                    value={filterFormat}
                    onChange={(e) => setFilterFormat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-paper px-3 py-2 text-xs text-navy focus:border-gold focus:outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="ONLINE">Online</option>
                    <option value="PRESENCIAL">Presencial</option>
                    <option value="AMBOS">Ambos</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/60">
                    Precio
                  </label>
                  <select
                    value={filterPrice}
                    onChange={(e) => setFilterPrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-paper px-3 py-2 text-xs text-navy focus:border-gold focus:outline-none"
                  >
                    <option value="">Todos</option>
                    <option value="GRATUITO">Gratuito</option>
                    <option value="PAGADO">Pagado</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-navy/60">
                    Universidad
                  </label>
                  <select
                    value={filterUni}
                    onChange={(e) => setFilterUni(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-paper px-3 py-2 text-xs text-navy focus:border-gold focus:outline-none"
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
                    className="flex-1 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy/90"
                  >
                    Filtrar
                  </button>
                  <button
                    onClick={clearFilters}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-navy/60 transition-colors hover:bg-paper"
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
                  className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy"
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
                  className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy"
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
                  className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy"
                >
                  <option value="">Precio</option>
                  <option value="GRATUITO">Gratis</option>
                  <option value="PAGADO">Pagado</option>
                </select>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <p className="text-navy/50">Cargando...</p>
                </div>
              ) : ayudantias.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl">📋</p>
                  <p className="mt-3 text-navy/50">
                    No hay publicaciones con estos filtros
                  </p>
                  <button
                    onClick={openPublishModal}
                    className="mt-4 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
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
                <p className="mt-3 text-navy/50">
                  No tienes publicaciones aun
                </p>
                <button
                  onClick={openPublishModal}
                  className="mt-4 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
                >
                  Crear tu primera publicacion
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {misAyudantias.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-4 ${
                      a.isActive
                        ? "border-border bg-white"
                        : "border-border/50 bg-paper/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              a.type === "OFREZCO"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {a.type === "OFREZCO" ? "Ofrezco" : "Busco"}
                          </span>
                          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                            {a.materia}
                          </span>
                          {!a.isActive && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                              Inactiva
                            </span>
                          )}
                          {a.reportCount > 0 && (
                            <span className="text-[10px] text-red-400">
                              {a.reportCount} reporte{a.reportCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-navy">
                          {a.description}
                        </p>
                        <p className="mt-1 text-xs text-navy/40">
                          {new Date(a.createdAt).toLocaleDateString("es-CL")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleActive(a.id, a.isActive)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          a.isActive
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            {publishStep === 1 && (
              <>
                <h2 className="text-lg font-bold text-navy">
                  Que tipo de publicacion?
                </h2>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setPubType("OFREZCO");
                      setPublishStep(2);
                    }}
                    className="rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center transition-colors hover:border-green-400"
                  >
                    <span className="text-3xl">🎓</span>
                    <p className="mt-2 font-semibold text-green-700">
                      Ofrezco Ayudantia
                    </p>
                    <p className="mt-1 text-xs text-green-600/70">
                      Soy tutor y quiero ayudar
                    </p>
                  </button>
                  <button
                    onClick={() => {
                      setPubType("BUSCO");
                      setPublishStep(2);
                    }}
                    className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6 text-center transition-colors hover:border-blue-400"
                  >
                    <span className="text-3xl">🔍</span>
                    <p className="mt-2 font-semibold text-blue-700">
                      Busco Ayudantia
                    </p>
                    <p className="mt-1 text-xs text-blue-600/70">
                      Necesito un tutor
                    </p>
                  </button>
                </div>
                <button
                  onClick={() => setShowPublish(false)}
                  className="mt-6 w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy/60 transition-colors hover:bg-paper"
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
                    className="text-sm text-navy/50 hover:text-navy"
                  >
                    &larr;
                  </button>
                  <h2 className="text-lg font-bold text-navy">
                    {pubType === "OFREZCO"
                      ? "Ofrezco Ayudantia"
                      : "Busco Ayudantia"}
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Materia */}
                  <div>
                    <label className="text-sm font-medium text-navy/70">
                      Materia *
                    </label>
                    <select
                      value={pubMateria}
                      onChange={(e) => setPubMateria(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy focus:border-gold focus:outline-none"
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
                    <label className="text-sm font-medium text-navy/70">
                      Tu universidad *
                    </label>
                    <select
                      value={pubUni}
                      onChange={(e) => setPubUni(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy focus:border-gold focus:outline-none"
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
                        <label className="text-sm font-medium text-navy/70">
                          Orientada a (max 5 universidades)
                        </label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {UNIVERSIDADES_CHILE.filter(u => u !== "Otra").map((u) => (
                            <button
                              key={u}
                              onClick={() => toggleOrientadaA(u)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                pubOrientadaA.includes(u)
                                  ? "bg-gold/20 text-gold ring-1 ring-gold/30"
                                  : "bg-paper text-navy/50 hover:bg-border/30"
                              }`}
                            >
                              {u.replace("Universidad ", "U. ").replace("Pontificia ", "P. ")}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Formato */}
                      <div>
                        <label className="text-sm font-medium text-navy/70">
                          Formato
                        </label>
                        <div className="mt-2 flex gap-2">
                          {["ONLINE", "PRESENCIAL", "AMBOS"].map((f) => (
                            <button
                              key={f}
                              onClick={() => setPubFormat(f)}
                              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                pubFormat === f
                                  ? "border-gold bg-gold/10 text-navy"
                                  : "border-border text-navy/50 hover:bg-paper"
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
                        <label className="text-sm font-medium text-navy/70">
                          Precio
                        </label>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setPubPriceType("GRATUITO")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                              pubPriceType === "GRATUITO"
                                ? "border-green-400 bg-green-50 text-green-700"
                                : "border-border text-navy/50 hover:bg-paper"
                            }`}
                          >
                            Gratuito
                          </button>
                          <button
                            onClick={() => setPubPriceType("PAGADO")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                              pubPriceType === "PAGADO"
                                ? "border-gold bg-gold/10 text-navy"
                                : "border-border text-navy/50 hover:bg-paper"
                            }`}
                          >
                            Pagado
                          </button>
                        </div>
                        {pubPriceType === "PAGADO" && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm text-navy/50">$</span>
                            <input
                              type="number"
                              placeholder="Precio CLP"
                              value={pubPriceAmount}
                              onChange={(e) =>
                                setPubPriceAmount(e.target.value)
                              }
                              className="flex-1 rounded-lg border border-border bg-paper px-4 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                            />
                            <span className="text-xs text-navy/40">CLP</span>
                          </div>
                        )}
                      </div>

                      {/* Contacto */}
                      <div>
                        <label className="text-sm font-medium text-navy/70">
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
                              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                pubContactMethod === c.v
                                  ? "border-gold bg-gold/10 text-navy"
                                  : "border-border text-navy/50 hover:bg-paper"
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
                          className="mt-2 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy focus:border-gold focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Campos para BUSCO — contacto y formato simplificado */}
                  {pubType === "BUSCO" && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-navy/70">
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
                              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                                pubContactMethod === c.v
                                  ? "border-gold bg-gold/10 text-navy"
                                  : "border-border text-navy/50 hover:bg-paper"
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
                          className="mt-2 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy focus:border-gold focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {/* Descripcion */}
                  <div>
                    <label className="text-sm font-medium text-navy/70">
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
                      className="mt-1 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy placeholder:text-navy/40 focus:border-gold focus:outline-none resize-none"
                    />
                    <p
                      className={`mt-1 text-right text-xs ${
                        pubDescription.length >= 450
                          ? "text-red-500"
                          : "text-navy/40"
                      }`}
                    >
                      {pubDescription.length}/500
                    </p>
                  </div>
                </div>

                {pubError && (
                  <p className="mt-3 text-sm text-red-600">{pubError}</p>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowPublish(false)}
                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-navy/60 transition-colors hover:bg-paper"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex-1 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-navy">
              Reportar publicacion
            </h2>

            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                    reportReason === r
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-border text-navy hover:bg-paper"
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
                className="mt-3 w-full rounded-lg border border-border bg-paper px-4 py-2.5 text-sm text-navy focus:border-gold focus:outline-none resize-none"
              />
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setReportingId(null)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-navy/60 transition-colors hover:bg-paper"
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
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
    <div className="rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-sm">
      {/* Header: user info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy">
            {item.user.firstName[0]}
            {item.user.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-navy">
                {item.user.firstName} {item.user.lastName}
              </span>
              {item.user.tier && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                  {TIER_EMOJIS[item.user.tier] ?? ""}{" "}
                  {TIER_LABELS[item.user.tier] ?? item.user.tier}
                </span>
              )}
              {item.type === "OFREZCO" &&
                item.streak &&
                item.streak.monthsActive >= 2 && (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                    🔥 {item.streak.monthsActive} meses activo
                  </span>
                )}
            </div>
            <p className="text-xs text-navy/40">
              {item.universidad} · {timeAgo(item.createdAt)}
            </p>
          </div>
        </div>

        {/* Report button */}
        {!isOwn && (
          <button
            onClick={onReport}
            className="shrink-0 rounded-lg p-1.5 text-navy/30 transition-colors hover:bg-red-50 hover:text-red-500"
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
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
          {item.materia}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            item.format === "ONLINE"
              ? "bg-blue-100 text-blue-700"
              : item.format === "PRESENCIAL"
              ? "bg-purple-100 text-purple-700"
              : "bg-teal-100 text-teal-700"
          }`}
        >
          {item.format === "ONLINE"
            ? "Online"
            : item.format === "PRESENCIAL"
            ? "Presencial"
            : "Online + Presencial"}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            item.priceType === "GRATUITO"
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {item.priceType === "GRATUITO"
            ? "Gratuito"
            : `$${item.priceAmount?.toLocaleString("es-CL") ?? "0"} CLP`}
        </span>
      </div>

      {/* Orientada a */}
      {item.orientadaA.length > 0 && (
        <p className="mt-2 text-xs text-navy/50">
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
          className={`text-sm text-navy/80 ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {item.description}
        </p>
        {item.description.length > 150 && (
          <button
            onClick={onToggleExpand}
            className="mt-1 text-xs font-medium text-gold hover:text-gold/80"
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
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
          >
            {item.contactMethod === "WHATSAPP" && "📱"}
            {item.contactMethod === "EMAIL" && "📧"}
            Contactar por {getContactLabel(item.contactMethod)}
          </a>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg bg-paper px-4 py-2 text-sm text-navy/70">
            📋 {item.contactValue}
          </div>
        )}
      </div>
    </div>
  );
}
