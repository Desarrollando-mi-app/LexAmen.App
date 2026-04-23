"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  MATERIAS_SALA,
  UNIVERSIDADES_CHILE,
} from "@/lib/ayudantia-constants";

// ─── Types ────────────────────────────────────────────────

interface AyudantiaUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
  tier: string | null;
}

interface AyudantiaStreak {
  monthsActive: number;
  longestStreak: number;
}

interface AyudantiaRating {
  avg: number | null;
  count: number;
}

interface AyudantiaItem {
  id: string;
  type: string;
  materia: string;
  titulo: string | null;
  format: string;
  priceType: string;
  priceAmount: number | null;
  description: string;
  universidad: string;
  orientadaA: string[];
  contactMethod: string;
  contactValue: string;
  disponibilidad: string | null;
  createdAt: string;
  sesionesCompletadas: number;
  user: AyudantiaUser;
  streak: AyudantiaStreak | null;
  rating: AyudantiaRating | null;
}

interface MiAyudantia {
  id: string;
  type: string;
  materia: string;
  titulo: string | null;
  format: string;
  priceType: string;
  priceAmount: number | null;
  description: string;
  universidad: string;
  orientadaA: string[];
  contactMethod: string;
  contactValue: string;
  disponibilidad: string | null;
  isActive: boolean;
  isHidden: boolean;
  reportCount: number;
  createdAt: string;
}

interface SesionPerson {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface SesionItem {
  id: string;
  ayudantiaId: string;
  ayudantiaTitulo: string;
  ayudantiaTipo: string;
  tutorId: string;
  tutor: SesionPerson;
  estudianteId: string;
  estudiante: SesionPerson;
  fecha: string;
  duracionMin: number | null;
  materia: string;
  notas: string | null;
  status: string;
  completadaAt: string | null;
  canceladaAt: string | null;
  canceladaPor: string | null;
  createdAt: string;
  evaluaciones: { evaluadorId: string; rating: number }[];
  myRole: "tutor" | "estudiante";
  hasEvaluated: boolean;
}

interface AyudantiasClientProps {
  userId: string;
  initialAyudantias: AyudantiaItem[];
  misAyudantias: MiAyudantia[];
  misSesiones: SesionItem[];
  streak: AyudantiaStreak | null;
}

// ─── Tier helpers ─────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  CARTON: "Carton", HIERRO: "Hierro", BRONCE: "Bronce", COBRE: "Cobre",
  PLATA: "Plata", ORO: "Oro", DIAMANTE: "Diamante", PLATINO: "Platino",
  JURISCONSULTO: "Jurisconsulto",
};

const TIER_EMOJIS: Record<string, string> = {
  CARTON: "\uD83D\uDCE6", HIERRO: "\uD83D\uDD29", BRONCE: "\uD83E\uDD49", COBRE: "\uD83D\uDFE4",
  PLATA: "\uD83E\uDD48", ORO: "\uD83E\uDD47", DIAMANTE: "\uD83D\uDC8E", PLATINO: "\u269C\uFE0F",
  JURISCONSULTO: "\u2696\uFE0F",
};

// ─── Report reasons (new style) ──────────────────────────

const REPORT_OPTIONS = [
  { label: "Spam o publicidad", value: "spam" },
  { label: "Informaci\u00F3n falsa", value: "informacion_falsa" },
  { label: "Contenido inapropiado", value: "contenido_inapropiado" },
  { label: "Oferta sospechosa", value: "oferta_sospechosa" },
  { label: "Otro motivo", value: "otro" },
] as const;

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

function formatFecha(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Rating stars component ──────────────────────────────

function RatingStars({ rating, count }: { rating: number | null; count: number }) {
  if (rating === null || count === 0) return null;
  const rounded = Math.round((rating ?? 0) * 2) / 2;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-[13px] ${
              star <= rounded ? "text-gz-gold" : "text-gz-ink-light/30"
            }`}
          >
            \u2605
          </span>
        ))}
      </div>
      <span className="font-ibm-mono text-[10px] text-gz-ink-mid">
        {rating.toFixed(1)} ({count} evaluaci{count === 1 ? "\u00F3n" : "ones"})
      </span>
    </div>
  );
}

// ─── Interactive stars (for evaluation) ──────────────────

function InteractiveStars({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className={`text-[28px] transition-colors ${
            star <= (hover || value) ? "text-gz-gold" : "text-gz-ink-light/30"
          }`}
        >
          \u2605
        </button>
      ))}
    </div>
  );
}

// ─── Status badge helpers ────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pendiente: { label: "Pendiente", bg: "bg-gz-gold/[0.15]", text: "text-gz-gold" },
  confirmada: { label: "Confirmada", bg: "bg-gz-navy/[0.15]", text: "text-gz-navy" },
  completada: { label: "Completada", bg: "bg-gz-sage/[0.15]", text: "text-gz-sage" },
  cancelada: { label: "Cancelada", bg: "bg-gz-burgundy/[0.15]", text: "text-gz-burgundy" },
};

// ─── Component ────────────────────────────────────────────

export function AyudantiasClient({
  userId,
  initialAyudantias,
  misAyudantias: initialMis,
  misSesiones: initialSesiones,
  streak,
}: AyudantiasClientProps) {
  const router = useRouter();

  // Main section tabs
  const [mainTab, setMainTab] = useState<"ayudantias" | "sesiones">("ayudantias");

  // Ayudantias sub-tabs and section
  const [tab, setTab] = useState<"OFREZCO" | "BUSCO">("OFREZCO");
  const [section, setSection] = useState<"tablon" | "mis">("tablon");

  // Data
  const [ayudantias, setAyudantias] = useState(initialAyudantias);
  const [misAyudantias, setMisAyudantias] = useState(initialMis);
  const [sesiones] = useState(initialSesiones);
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
  const [pubTitulo, setPubTitulo] = useState("");
  const [pubUni, setPubUni] = useState("");
  const [pubOrientadaA, setPubOrientadaA] = useState<string[]>([]);
  const [pubFormat, setPubFormat] = useState("ONLINE");
  const [pubPriceType, setPubPriceType] = useState("GRATUITO");
  const [pubPriceAmount, setPubPriceAmount] = useState("");
  const [pubContactMethod, setPubContactMethod] = useState("WHATSAPP");
  const [pubContactValue, setPubContactValue] = useState("");
  const [pubDescription, setPubDescription] = useState("");
  const [pubDisponibilidad, setPubDisponibilidad] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  // Report modal
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportMotivo, setReportMotivo] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Session request modal
  const [sesionRequestAyudantiaId, setSesionRequestAyudantiaId] = useState<string | null>(null);
  const [sesionFecha, setSesionFecha] = useState("");
  const [sesionHora, setSesionHora] = useState("");
  const [sesionDuracion, setSesionDuracion] = useState(60);
  const [sesionNotas, setSesionNotas] = useState("");
  const [sesionLoading, setSesionLoading] = useState(false);

  // Evaluation modal
  const [evaluatingSesionId, setEvaluatingSesionId] = useState<string | null>(null);
  const [evalRating, setEvalRating] = useState(0);
  const [evalComment, setEvalComment] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);

  // Expanded descriptions
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ─── Escape key handler for all modals ────────────────

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowPublish(false);
      setReportingId(null);
      setSesionRequestAyudantiaId(null);
      setEvaluatingSesionId(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  // ─── Fetch ayudantias ─────────────────────────────────

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
    setTimeout(() => fetchAyudantias(tab), 0);
  }

  // ─── Publish ──────────────────────────────────────────

  function openPublishModal() {
    setPubType("OFREZCO");
    setPubMateria("");
    setPubTitulo("");
    setPubUni("");
    setPubOrientadaA([]);
    setPubFormat("ONLINE");
    setPubPriceType("GRATUITO");
    setPubPriceAmount("");
    setPubContactMethod("WHATSAPP");
    setPubContactValue("");
    setPubDescription("");
    setPubDisponibilidad("");
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
          titulo: pubTitulo.trim() || undefined,
          format: pubFormat,
          priceType: pubPriceType,
          priceAmount: pubPriceType === "PAGADO" ? Number(pubPriceAmount) || 0 : undefined,
          description: pubDescription.trim(),
          universidad: pubUni,
          orientadaA: pubOrientadaA,
          contactMethod: pubContactMethod,
          contactValue: pubContactValue.trim(),
          disponibilidad: pubDisponibilidad.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Publicaci\u00F3n creada");
        setShowPublish(false);
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "No se pudo publicar");
        setPubError(data.error);
      }
    } catch {
      toast.error("Error de conexi\u00F3n");
      setPubError("Error de conexi\u00F3n");
    } finally {
      setPublishing(false);
    }
  }

  // ─── Toggle active ────────────────────────────────────

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
      toast.success(currentActive ? "Publicaci\u00F3n desactivada" : "Publicaci\u00F3n reactivada");
    } catch {
      toast.error("Ocurri\u00F3 un error, intenta de nuevo");
    }
  }

  // ─── Report (new style) ───────────────────────────────

  async function handleReport() {
    if (!reportingId || !reportMotivo) return;

    setReportLoading(true);
    try {
      const res = await fetch(
        `/api/sala/ayudantias/${reportingId}/reportar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            motivo: reportMotivo,
            descripcion: reportDescription.trim() || undefined,
          }),
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
      } else {
        toast.error("No se pudo enviar el reporte");
      }
    } catch {
      toast.error("Error de conexi\u00F3n");
    } finally {
      setReportLoading(false);
      setReportingId(null);
      setReportMotivo("");
      setReportDescription("");
    }
  }

  // ─── Session request ──────────────────────────────────

  async function handleSesionRequest() {
    if (!sesionRequestAyudantiaId || !sesionFecha || !sesionHora) {
      toast.error("Completa la fecha y hora");
      return;
    }

    setSesionLoading(true);
    try {
      const fechaCompleta = `${sesionFecha}T${sesionHora}:00`;
      const res = await fetch(
        `/api/sala/ayudantias/${sesionRequestAyudantiaId}/solicitar-sesion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fecha: fechaCompleta,
            duracionMin: sesionDuracion,
            notas: sesionNotas.trim() || undefined,
          }),
        }
      );

      if (res.ok) {
        toast.success("Solicitud de sesi\u00F3n enviada");
        setSesionRequestAyudantiaId(null);
        setSesionFecha("");
        setSesionHora("");
        setSesionDuracion(60);
        setSesionNotas("");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "No se pudo solicitar la sesi\u00F3n");
      }
    } catch {
      toast.error("Error de conexi\u00F3n");
    } finally {
      setSesionLoading(false);
    }
  }

  // ─── Session status actions ───────────────────────────

  async function handleSesionAction(sesionId: string, action: string) {
    try {
      const res = await fetch(
        `/api/sala/ayudantias/sesiones/${sesionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      if (res.ok) {
        const labels: Record<string, string> = {
          confirmar: "Sesi\u00F3n confirmada",
          rechazar: "Sesi\u00F3n rechazada",
          completar: "Sesi\u00F3n marcada como completada",
          cancelar: "Sesi\u00F3n cancelada",
        };
        toast.success(labels[action] ?? "Acci\u00F3n realizada");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "No se pudo realizar la acci\u00F3n");
      }
    } catch {
      toast.error("Error de conexi\u00F3n");
    }
  }

  // ─── Evaluation ───────────────────────────────────────

  async function handleEvaluation() {
    if (!evaluatingSesionId || evalRating === 0) {
      toast.error("Selecciona una calificaci\u00F3n");
      return;
    }

    setEvalLoading(true);
    try {
      const res = await fetch(
        `/api/sala/ayudantias/sesiones/${evaluatingSesionId}/evaluar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rating: evalRating,
            comentario: evalComment.trim() || undefined,
          }),
        }
      );

      if (res.ok) {
        toast.success("Evaluaci\u00F3n enviada");
        setEvaluatingSesionId(null);
        setEvalRating(0);
        setEvalComment("");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error ?? "No se pudo enviar la evaluaci\u00F3n");
      }
    } catch {
      toast.error("Error de conexi\u00F3n");
    } finally {
      setEvalLoading(false);
    }
  }

  // ─── Contact helpers ──────────────────────────────────

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

  // ─── Toggle orientadaA ───────────────────────────────

  function toggleOrientadaA(uni: string) {
    setPubOrientadaA((prev) => {
      if (prev.includes(uni)) {
        return prev.filter((u) => u !== uni);
      }
      if (prev.length >= 5) return prev;
      return [...prev, uni];
    });
  }

  // ─── Grouped sessions ────────────────────────────────

  const activeSesiones = sesiones.filter((s) => s.status === "pendiente" || s.status === "confirmada");
  const completedSesiones = sesiones.filter((s) => s.status === "completada");
  const cancelledSesiones = sesiones.filter((s) => s.status === "cancelada");

  // ─── Render ───────────────────────────────────────────

  return (
    <main className="min-h-screen">
      {/* Sub-header */}
      <div className="border-b border-gz-rule px-4 sm:px-6 py-3" style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <Link
              href="/dashboard/sala"
              className="font-archivo text-[12px] text-gz-ink-light hover:text-gz-gold transition-colors"
            >
              &larr; Profesi&oacute;n
            </Link>
            <div className="flex items-center gap-3 mb-1">
              <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
              <h2 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
                Ayudant&iacute;as
              </h2>
            </div>
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
            <span className="text-lg">\uD83D\uDD25</span>
            <span className="ml-2 font-archivo text-[13px] font-semibold text-gz-ink">
              Llevas {streak.monthsActive} meses activo como tutor
            </span>
            <span className="ml-2 font-ibm-mono text-[11px] text-gz-ink-light">
              (r&eacute;cord: {streak.longestStreak})
            </span>
          </div>
        )}

        {/* Main tabs: Ayudantias | Mis Sesiones */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex gap-2 border border-gz-rule rounded-[4px] p-1">
            <button
              onClick={() => setMainTab("ayudantias")}
              className={`rounded-[3px] px-4 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                mainTab === "ayudantias"
                  ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                  : "text-gz-ink-mid hover:text-gz-ink"
              }`}
            >
              Ayudant&iacute;as
            </button>
            <button
              onClick={() => setMainTab("sesiones")}
              className={`rounded-[3px] px-4 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                mainTab === "sesiones"
                  ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                  : "text-gz-ink-mid hover:text-gz-ink"
              }`}
            >
              Mis Sesiones
              {activeSesiones.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gz-gold text-[10px] font-bold text-white">
                  {activeSesiones.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* AYUDANTIAS TAB                                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {mainTab === "ayudantias" && (
          <>
            {/* Section tabs */}
            <div className="mb-6 flex items-center gap-4 flex-wrap">
              <div className="flex gap-2 border border-gz-rule rounded-[4px] p-1">
                <button
                  onClick={() => setSection("tablon")}
                  className={`rounded-[3px] px-4 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                    section === "tablon"
                      ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                      : "text-gz-ink-mid hover:text-gz-ink"
                  }`}
                >
                  Tabl&oacute;n
                </button>
                <button
                  onClick={() => setSection("mis")}
                  className={`rounded-[3px] px-4 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                    section === "mis"
                      ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
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
                    className={`rounded-[3px] px-4 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                      tab === "OFREZCO"
                        ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                        : "text-gz-ink-mid hover:text-gz-ink"
                    }`}
                  >
                    Ofrecen Ayudant&iacute;a
                  </button>
                  <button
                    onClick={() => handleTabChange("BUSCO")}
                    className={`rounded-[3px] px-4 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                      tab === "BUSCO"
                        ? "border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                        : "text-gz-ink-mid hover:text-gz-ink"
                    }`}
                  >
                    Buscan Ayudant&iacute;a
                  </button>
                </div>
              )}
            </div>

            {/* ─── TABLON ──────────────────────────────────── */}
            {section === "tablon" && (
              <div className="flex gap-6">
                {/* Sidebar filtros */}
                <aside className="hidden w-[220px] shrink-0 lg:block">
                  <div className="sticky top-4 space-y-4 rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
                    <h3 className="font-ibm-mono text-[11px] uppercase tracking-[1.5px] text-gz-ink-light">
                      Filtros
                    </h3>

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
                        Universidad
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
                      <p className="text-4xl">\uD83D\uDCCB</p>
                      <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-light">
                        No hay publicaciones con estos filtros
                      </p>
                      <button
                        onClick={openPublishModal}
                        className="mt-4 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                      >
                        S&eacute; el primero en publicar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {ayudantias.map((a) => {
                        const isOwn = a.user.id === userId;
                        const contactUrl = getContactUrl(a.contactMethod, a.contactValue);
                        const isExpanded = expanded.has(a.id);

                        return (
                          <div
                            key={a.id}
                            className="rounded-[4px] border border-gz-rule bg-white p-5 hover:border-gz-gold transition-colors"
                          >
                            {/* Header: user info */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                {a.user.avatarUrl ? (
                                  <img
                                    src={a.user.avatarUrl}
                                    alt=""
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[12px] font-bold text-gz-ink">
                                    {a.user.firstName[0]}
                                    {a.user.lastName[0]}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-archivo text-[14px] font-medium text-gz-ink">
                                      {a.user.firstName} {a.user.lastName}
                                    </span>
                                    {a.user.tier && (
                                      <span className="rounded-sm bg-gz-gold/15 px-2 py-0.5 font-ibm-mono text-[9px] font-semibold text-gz-gold">
                                        {TIER_EMOJIS[a.user.tier] ?? ""}{" "}
                                        {TIER_LABELS[a.user.tier] ?? a.user.tier}
                                      </span>
                                    )}
                                    {a.type === "OFREZCO" &&
                                      a.streak &&
                                      a.streak.monthsActive >= 2 && (
                                        <span className="rounded-sm bg-gz-gold/[0.15] px-2 py-0.5 font-ibm-mono text-[9px] font-semibold text-gz-gold">
                                          \uD83D\uDD25 {a.streak.monthsActive} meses activo
                                        </span>
                                      )}
                                  </div>
                                  <p className="font-ibm-mono text-[11px] text-gz-ink-light">
                                    {a.user.universidad || a.universidad} &middot; {timeAgo(a.createdAt)}
                                  </p>
                                </div>
                              </div>

                              {/* Report button */}
                              {!isOwn && (
                                <button
                                  onClick={() => {
                                    setReportingId(a.id);
                                    setReportMotivo("");
                                    setReportDescription("");
                                  }}
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

                            {/* Type badge */}
                            <div className="mt-2">
                              <span
                                className={`rounded-sm px-2 py-0.5 font-ibm-mono text-[9px] font-semibold ${
                                  a.type === "OFREZCO"
                                    ? "bg-gz-sage/[0.15] text-gz-sage"
                                    : "bg-gz-burgundy/[0.15] text-gz-burgundy"
                                }`}
                              >
                                {a.type === "OFREZCO" ? "Ofrezco" : "Busco"}
                              </span>
                            </div>

                            {/* Title */}
                            {a.titulo && (
                              <p className="mt-2 font-cormorant text-[18px] !font-bold text-gz-ink">
                                {a.titulo}
                              </p>
                            )}

                            {/* Tags */}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-sm bg-gz-gold/15 px-2.5 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-gold">
                                {a.materia}
                              </span>
                              <span
                                className={`rounded-sm px-2.5 py-0.5 font-ibm-mono text-[9px] font-medium ${
                                  a.format === "ONLINE"
                                    ? "bg-gz-navy/[0.15] text-gz-navy"
                                    : a.format === "PRESENCIAL"
                                    ? "bg-gz-ink-mid/[0.15] text-gz-ink-mid"
                                    : "bg-gz-sage/[0.1] text-gz-sage"
                                }`}
                              >
                                {a.format === "ONLINE"
                                  ? "Online"
                                  : a.format === "PRESENCIAL"
                                  ? "Presencial"
                                  : "Online + Presencial"}
                              </span>
                              <span
                                className={`rounded-sm px-2.5 py-0.5 font-ibm-mono text-[9px] font-medium ${
                                  a.priceType === "GRATUITO"
                                    ? "bg-gz-sage/[0.15] text-gz-sage"
                                    : "bg-gz-gold/[0.15] text-gz-gold"
                                }`}
                              >
                                {a.priceType === "GRATUITO"
                                  ? "Gratuito"
                                  : `$${a.priceAmount?.toLocaleString("es-CL") ?? "0"} CLP`}
                              </span>
                            </div>

                            {/* Orientada a */}
                            {a.orientadaA.length > 0 && (
                              <p className="mt-2 font-ibm-mono text-[11px] text-gz-ink-light">
                                Orienta a:{" "}
                                {a.orientadaA
                                  .map((u) =>
                                    u.replace("Universidad ", "U. ").replace("Pontificia ", "P. ")
                                  )
                                  .join(", ")}
                              </p>
                            )}

                            {/* Rating */}
                            {a.rating && a.rating.count > 0 && (
                              <div className="mt-2">
                                <RatingStars rating={a.rating.avg} count={a.rating.count} />
                              </div>
                            )}

                            {/* Sessions completed */}
                            {a.sesionesCompletadas > 0 && (
                              <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
                                {a.sesionesCompletadas} sesi{a.sesionesCompletadas === 1 ? "\u00F3n" : "ones"} completada{a.sesionesCompletadas === 1 ? "" : "s"}
                              </p>
                            )}

                            {/* Description */}
                            <div className="mt-3">
                              <p
                                className={`font-archivo text-[13px] text-gz-ink ${
                                  isExpanded ? "" : "line-clamp-3"
                                }`}
                              >
                                {a.description}
                              </p>
                              {a.description.length > 150 && (
                                <button
                                  onClick={() =>
                                    setExpanded((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(a.id)) next.delete(a.id);
                                      else next.add(a.id);
                                      return next;
                                    })
                                  }
                                  className="mt-1 font-archivo text-[12px] font-medium text-gz-gold hover:text-gz-ink"
                                >
                                  {isExpanded ? "Ver menos" : "Ver m\u00E1s"}
                                </button>
                              )}
                            </div>

                            {/* Disponibilidad */}
                            {a.disponibilidad && (
                              <p className="mt-2 font-ibm-mono text-[11px] text-gz-ink-light">
                                Disponibilidad: {a.disponibilidad}
                              </p>
                            )}

                            {/* Actions */}
                            <div className="mt-4 flex items-center gap-3 flex-wrap">
                              {contactUrl ? (
                                <a
                                  href={contactUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                                >
                                  {a.contactMethod === "WHATSAPP" && "\uD83D\uDCF1"}
                                  {a.contactMethod === "EMAIL" && "\uD83D\uDCE7"}
                                  Contactar por {getContactLabel(a.contactMethod)}
                                </a>
                              ) : (
                                <div
                                  className="inline-flex items-center gap-2 rounded-[3px] px-4 py-2 font-archivo text-[13px] text-gz-ink-mid"
                                  style={{ backgroundColor: "var(--gz-cream)" }}
                                >
                                  \uD83D\uDCCB {a.contactValue}
                                </div>
                              )}

                              {/* Session request button (only for others' OFREZCO posts) */}
                              {!isOwn && a.type === "OFREZCO" && (
                                <button
                                  onClick={() => {
                                    setSesionRequestAyudantiaId(a.id);
                                    setSesionFecha("");
                                    setSesionHora("");
                                    setSesionDuracion(60);
                                    setSesionNotas("");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-[3px] border border-gz-gold px-4 py-2 font-archivo text-[13px] font-semibold text-gz-gold hover:bg-gz-gold hover:text-gz-navy transition-colors"
                                >
                                  Solicitar sesi&oacute;n &rarr;
                                </button>
                              )}

                              {/* Report link */}
                              {!isOwn && (
                                <button
                                  onClick={() => {
                                    setReportingId(a.id);
                                    setReportMotivo("");
                                    setReportDescription("");
                                  }}
                                  className="font-archivo text-[11px] text-gz-ink-light hover:text-gz-burgundy transition-colors"
                                >
                                  Reportar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── MIS PUBLICACIONES ────────────────────── */}
            {section === "mis" && (
              <div>
                {misAyudantias.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-4xl">\uD83D\uDCDD</p>
                    <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-light">
                      No tienes publicaciones a&uacute;n
                    </p>
                    <button
                      onClick={openPublishModal}
                      className="mt-4 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
                    >
                      Crear tu primera publicaci&oacute;n
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {misAyudantias.map((a) => (
                      <div
                        key={a.id}
                        className={`rounded-[4px] border border-gz-rule p-4 ${
                          a.isActive ? "bg-white" : "opacity-60"
                        }`}
                        style={!a.isActive ? { backgroundColor: "var(--gz-cream)" } : undefined}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
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
                              {a.isHidden && (
                                <span className="rounded-sm bg-gz-burgundy/[0.15] px-2 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-burgundy">
                                  Oculta
                                </span>
                              )}
                              {a.reportCount > 0 && (
                                <span className="font-ibm-mono text-[10px] text-gz-burgundy">
                                  {a.reportCount} reporte{a.reportCount > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            {a.titulo && (
                              <p className="mt-1.5 font-cormorant text-[16px] !font-bold text-gz-ink">
                                {a.titulo}
                              </p>
                            )}
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
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MIS SESIONES TAB                                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        {mainTab === "sesiones" && (
          <div>
            {sesiones.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl">\uD83D\uDCC5</p>
                <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-light">
                  No tienes sesiones a&uacute;n
                </p>
                <p className="mt-1 font-archivo text-[12px] text-gz-ink-light">
                  Solicita una sesi&oacute;n desde el tabl&oacute;n de ayudant&iacute;as
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Active sessions */}
                {activeSesiones.length > 0 && (
                  <div>
                    <h3 className="font-ibm-mono text-[11px] uppercase tracking-[1.5px] text-gz-ink-light mb-3">
                      Sesiones activas ({activeSesiones.length})
                    </h3>
                    <div className="space-y-3">
                      {activeSesiones.map((s) => (
                        <SesionCard
                          key={s.id}
                          sesion={s}
                          userId={userId}
                          onAction={handleSesionAction}
                          onEvaluate={setEvaluatingSesionId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed sessions */}
                {completedSesiones.length > 0 && (
                  <div>
                    <h3 className="font-ibm-mono text-[11px] uppercase tracking-[1.5px] text-gz-ink-light mb-3">
                      Completadas ({completedSesiones.length})
                    </h3>
                    <div className="space-y-3">
                      {completedSesiones.map((s) => (
                        <SesionCard
                          key={s.id}
                          sesion={s}
                          userId={userId}
                          onAction={handleSesionAction}
                          onEvaluate={(id) => {
                            setEvaluatingSesionId(id);
                            setEvalRating(0);
                            setEvalComment("");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancelled sessions */}
                {cancelledSesiones.length > 0 && (
                  <div>
                    <h3 className="font-ibm-mono text-[11px] uppercase tracking-[1.5px] text-gz-ink-light mb-3">
                      Canceladas ({cancelledSesiones.length})
                    </h3>
                    <div className="space-y-3">
                      {cancelledSesiones.map((s) => (
                        <SesionCard
                          key={s.id}
                          sesion={s}
                          userId={userId}
                          onAction={handleSesionAction}
                          onEvaluate={setEvaluatingSesionId}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: Publicar                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showPublish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPublish(false);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[4px] p-6 shadow-xl border border-gz-rule"
            style={{ backgroundColor: "var(--gz-cream)" }}
          >
            {publishStep === 1 && (
              <>
                <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">
                  &iquest;Qu&eacute; tipo de publicaci&oacute;n?
                </h2>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setPubType("OFREZCO");
                      setPublishStep(2);
                    }}
                    className="rounded-[4px] border-2 border-gz-sage/30 bg-gz-sage/[0.06] p-6 text-center transition-colors hover:border-gz-sage"
                  >
                    <span className="text-3xl">\uD83C\uDF93</span>
                    <p className="mt-2 font-semibold text-gz-sage">
                      Ofrezco Ayudant&iacute;a
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
                    <span className="text-3xl">\uD83D\uDD0D</span>
                    <p className="mt-2 font-semibold text-gz-burgundy">
                      Busco Ayudant&iacute;a
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
                      ? "Ofrezco Ayudant\u00EDa"
                      : "Busco Ayudant\u00EDa"}
                  </h2>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Titulo */}
                  <div>
                    <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                      T&iacute;tulo (opcional)
                    </label>
                    <input
                      type="text"
                      value={pubTitulo}
                      onChange={(e) => setPubTitulo(e.target.value.slice(0, 100))}
                      placeholder="Ej: Clases de Derecho Civil - Obligaciones"
                      className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                      style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                  </div>

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
                      Tu universidad *
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
                          Orientada a (max 5 universidades)
                        </label>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {UNIVERSIDADES_CHILE.filter((u) => u !== "Otra").map((u) => (
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
                              onChange={(e) => setPubPriceAmount(e.target.value)}
                              className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                              style={{ backgroundColor: "var(--gz-cream)" }}
                            />
                            <span className="font-ibm-mono text-[11px] text-gz-ink-light">CLP</span>
                          </div>
                        )}
                      </div>

                      {/* Disponibilidad */}
                      <div>
                        <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                          Disponibilidad (opcional)
                        </label>
                        <input
                          type="text"
                          value={pubDisponibilidad}
                          onChange={(e) => setPubDisponibilidad(e.target.value.slice(0, 200))}
                          placeholder="Ej: Lunes a viernes, 18:00 - 21:00"
                          className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                          style={{ backgroundColor: "var(--gz-cream)" }}
                        />
                      </div>
                    </>
                  )}

                  {/* Contacto (for both types) */}
                  <div>
                    <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                      M&eacute;todo de contacto *
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
                      type={pubContactMethod === "EMAIL" ? "email" : "text"}
                      placeholder={
                        pubContactMethod === "WHATSAPP"
                          ? "+56 9 1234 5678"
                          : pubContactMethod === "EMAIL"
                          ? "tu@email.com"
                          : "Escribe tu contacto"
                      }
                      value={pubContactValue}
                      onChange={(e) => setPubContactValue(e.target.value)}
                      className="mt-2 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                      style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                  </div>

                  {/* Descripcion */}
                  <div>
                    <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                      Descripci&oacute;n *
                    </label>
                    <textarea
                      value={pubDescription}
                      onChange={(e) => setPubDescription(e.target.value.slice(0, 500))}
                      rows={4}
                      placeholder={
                        pubType === "OFREZCO"
                          ? "Describe tu experiencia, metodolog\u00EDa, horarios disponibles..."
                          : "Describe qu\u00E9 necesitas, qu\u00E9 temas, en qu\u00E9 te cuesta m\u00E1s..."
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

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: Reportar (new style)                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      {reportingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setReportingId(null);
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-[4px] p-6 shadow-xl border border-gz-rule"
            style={{ backgroundColor: "var(--gz-cream)" }}
          >
            <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">
              Reportar publicaci&oacute;n
            </h2>

            <div className="mt-4 space-y-2">
              {REPORT_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReportMotivo(r.value)}
                  className={`w-full rounded-[3px] border px-4 py-2.5 text-left font-archivo text-[13px] transition-colors ${
                    reportMotivo === r.value
                      ? "border-gz-burgundy bg-gz-burgundy/[0.06] text-gz-burgundy"
                      : "border-gz-rule text-gz-ink hover:bg-gz-cream-dark"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Description textarea (always shown, required for "otro") */}
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder={reportMotivo === "otro" ? "Describe el problema... *" : "Detalles adicionales (opcional)"}
              rows={3}
              className="mt-3 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none resize-none min-h-[80px]"
              style={{ backgroundColor: "var(--gz-cream)" }}
            />

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
                  !reportMotivo ||
                  (reportMotivo === "otro" && !reportDescription.trim())
                }
                className="flex-1 rounded-[3px] bg-gz-burgundy px-4 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-burgundy/90 transition-colors disabled:opacity-50"
              >
                {reportLoading ? "Enviando..." : "Reportar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: Solicitar sesi\u00F3n                                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      {sesionRequestAyudantiaId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSesionRequestAyudantiaId(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-[4px] p-6 shadow-xl border border-gz-rule"
            style={{ backgroundColor: "var(--gz-cream)" }}
          >
            <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">
              Solicitar sesi&oacute;n
            </h2>
            <p className="mt-1 font-archivo text-[12px] text-gz-ink-mid">
              El tutor recibir&aacute; tu solicitud y podr&aacute; confirmarla
            </p>

            <div className="mt-5 space-y-4">
              {/* Fecha */}
              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={sesionFecha}
                  onChange={(e) => setSesionFecha(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>

              {/* Hora */}
              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  Hora *
                </label>
                <input
                  type="time"
                  value={sesionHora}
                  onChange={(e) => setSesionHora(e.target.value)}
                  className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>

              {/* Duracion */}
              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  Duraci&oacute;n
                </label>
                <select
                  value={sesionDuracion}
                  onChange={(e) => setSesionDuracion(Number(e.target.value))}
                  className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                >
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos</option>
                  <option value={90}>90 minutos</option>
                  <option value={120}>120 minutos</option>
                </select>
              </div>

              {/* Notas */}
              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  Notas (opcional)
                </label>
                <textarea
                  value={sesionNotas}
                  onChange={(e) => setSesionNotas(e.target.value.slice(0, 300))}
                  rows={3}
                  placeholder="Temas que te gustar&iacute;a cubrir, dudas espec&iacute;ficas..."
                  className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light focus:border-gz-gold focus:outline-none resize-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSesionRequestAyudantiaId(null)}
                className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSesionRequest}
                disabled={sesionLoading || !sesionFecha || !sesionHora}
                className="flex-1 rounded-[3px] bg-gz-navy px-4 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50"
              >
                {sesionLoading ? "Enviando..." : "Solicitar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: Evaluaci\u00F3n                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {evaluatingSesionId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEvaluatingSesionId(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-[4px] p-6 shadow-xl border border-gz-rule"
            style={{ backgroundColor: "var(--gz-cream)" }}
          >
            <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">
              Evaluar sesi&oacute;n
            </h2>
            <p className="mt-1 font-archivo text-[12px] text-gz-ink-mid">
              Tu evaluaci&oacute;n es an&oacute;nima y ayuda a la comunidad
            </p>

            <div className="mt-5 space-y-4">
              {/* Stars */}
              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  Calificaci&oacute;n *
                </label>
                <div className="mt-2 flex justify-center">
                  <InteractiveStars value={evalRating} onChange={setEvalRating} />
                </div>
                {evalRating > 0 && (
                  <p className="mt-1 text-center font-ibm-mono text-[11px] text-gz-ink-mid">
                    {evalRating === 1 && "Deficiente"}
                    {evalRating === 2 && "Regular"}
                    {evalRating === 3 && "Bueno"}
                    {evalRating === 4 && "Muy bueno"}
                    {evalRating === 5 && "Excelente"}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  Comentario (opcional)
                </label>
                <textarea
                  value={evalComment}
                  onChange={(e) => setEvalComment(e.target.value.slice(0, 300))}
                  rows={3}
                  placeholder="Comparte tu experiencia..."
                  className="mt-1 w-full rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light focus:border-gz-gold focus:outline-none resize-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEvaluatingSesionId(null)}
                className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEvaluation}
                disabled={evalLoading || evalRating === 0}
                className="flex-1 rounded-[3px] bg-gz-navy px-4 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50"
              >
                {evalLoading ? "Enviando..." : "Enviar evaluaci\u00F3n"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── SesionCard Component ─────────────────────────────────

function SesionCard({
  sesion,
  userId,
  onAction,
  onEvaluate,
}: {
  sesion: SesionItem;
  userId: string;
  onAction: (sesionId: string, action: string) => void;
  onEvaluate: (sesionId: string) => void;
}) {
  const s = sesion;
  const statusConfig = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.pendiente;
  const otherPerson = s.myRole === "tutor" ? s.estudiante : s.tutor;

  // For pendiente sessions, determine if the current user is the recipient (not the creator)
  // The creator is the estudiante (who requested the session)
  const isRecipient = s.status === "pendiente" && s.myRole === "tutor";

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-4 hover:border-gz-gold transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Status badge */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className={`rounded-sm px-2 py-0.5 font-ibm-mono text-[9px] font-semibold ${statusConfig.bg} ${statusConfig.text}`}
            >
              {statusConfig.label}
            </span>
            <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
              T&uacute; como {s.myRole}
            </span>
          </div>

          {/* Title */}
          <p className="font-cormorant text-[16px] !font-bold text-gz-ink">
            {s.materia || s.ayudantiaTitulo} con {otherPerson.firstName} {otherPerson.lastName}
          </p>

          {/* Meta */}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-ibm-mono text-[11px] text-gz-ink-light">
            <span>{formatFecha(s.fecha)}</span>
            <span>&middot; {s.duracionMin} min</span>
          </div>

          {/* Notes */}
          {s.notas && (
            <p className="mt-2 font-archivo text-[12px] text-gz-ink-mid italic">
              &ldquo;{s.notas}&rdquo;
            </p>
          )}

          {/* Cancellation info */}
          {s.status === "cancelada" && s.canceladaAt && (
            <p className="mt-1 font-ibm-mono text-[10px] text-gz-burgundy">
              Cancelada el {new Date(s.canceladaAt).toLocaleDateString("es-CL")}
              {s.canceladaPor === userId ? " (por ti)" : ""}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex flex-col gap-2">
          {/* Pendiente: Confirm/Reject (only for recipient = tutor) */}
          {isRecipient && (
            <>
              <button
                onClick={() => onAction(s.id, "confirmar")}
                className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[11px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={() => onAction(s.id, "rechazar")}
                className="rounded-[3px] bg-gz-burgundy/[0.15] px-3 py-1.5 font-archivo text-[11px] font-semibold text-gz-burgundy hover:bg-gz-burgundy/20 transition-colors"
              >
                Rechazar
              </button>
            </>
          )}

          {/* Confirmada: Complete/Cancel */}
          {s.status === "confirmada" && (
            <>
              <button
                onClick={() => onAction(s.id, "completar")}
                className="rounded-[3px] bg-gz-sage/[0.15] px-3 py-1.5 font-archivo text-[11px] font-semibold text-gz-sage hover:bg-gz-sage/20 transition-colors"
              >
                Completada
              </button>
              <button
                onClick={() => onAction(s.id, "cancelar")}
                className="rounded-[3px] bg-gz-burgundy/[0.15] px-3 py-1.5 font-archivo text-[11px] font-semibold text-gz-burgundy hover:bg-gz-burgundy/20 transition-colors"
              >
                Cancelar
              </button>
            </>
          )}

          {/* Completada: Evaluate or show evaluated */}
          {s.status === "completada" && !s.hasEvaluated && (
            <button
              onClick={() => onEvaluate(s.id)}
              className="rounded-[3px] bg-gz-gold/[0.15] px-3 py-1.5 font-archivo text-[11px] font-semibold text-gz-gold hover:bg-gz-gold/20 transition-colors"
            >
              Evaluar \u2605
            </button>
          )}

          {s.status === "completada" && s.hasEvaluated && (
            <span className="font-ibm-mono text-[10px] text-gz-sage">
              \u2705 Evaluaci&oacute;n enviada
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
