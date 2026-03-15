"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AREAS_PRACTICA,
  CIUDADES_CHILE,
  FORMATOS_TRABAJO,
  REMUNERACION_OPTIONS,
  getAreaLabel,
  getFormatoLabel,
  getRemuneracionLabel,
} from "@/lib/sala-constants";
import { ReporteModal } from "../components/reporte-modal";

// ─── Types ────────────────────────────────────────────────

interface PasantiaUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
}

interface PasantiaItem {
  id: string;
  userId: string;
  empresa: string;
  areaPractica: string;
  titulo: string;
  descripcion: string;
  ciudad: string;
  formato: string;
  duracion: string | null;
  remuneracion: string;
  montoRemu: string | null;
  requisitos: string | null;
  metodoPostulacion: string;
  contactoPostulacion: string | null;
  createdAt: string;
  user: PasantiaUser;
}

interface PasantiasClientProps {
  userId: string;
  initialPasantias: PasantiaItem[];
}

// ─── Component ────────────────────────────────────────────

export function PasantiasClient({
  userId,
  initialPasantias,
}: PasantiasClientProps) {
  const router = useRouter();
  const [pasantias, setPasantias] = useState(initialPasantias);
  const [loading, setLoading] = useState(false);

  // Filters
  const [fArea, setFArea] = useState("");
  const [fCiudad, setFCiudad] = useState("");
  const [fFormato, setFFormato] = useState("");
  const [fRemu, setFRemu] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);

  // Detail view
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailItem = pasantias.find((p) => p.id === detailId);

  // Report modal
  const [reportingId, setReportingId] = useState<string | null>(null);

  // Expanded descriptions
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ─── Fetch ──────────────────────────────────────────────

  async function fetchPasantias() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fArea) params.set("areaPractica", fArea);
      if (fCiudad) params.set("ciudad", fCiudad);
      if (fFormato) params.set("formato", fFormato);
      if (fRemu) params.set("remuneracion", fRemu);

      const res = await fetch(`/api/sala/pasantias?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPasantias(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPasantias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fArea, fCiudad, fFormato, fRemu]);

  // ─── Report ─────────────────────────────────────────────

  async function handleReport(motivo: string, descripcion?: string) {
    if (!reportingId) return;
    const res = await fetch(`/api/sala/pasantias/${reportingId}/reportar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo, descripcion }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.hidden) {
        setPasantias((prev) => prev.filter((p) => p.id !== reportingId));
        toast.success("Publicación ocultada por reportes");
      } else {
        toast.success("Reporte enviado");
      }
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al reportar");
    }
    setReportingId(null);
  }

  // ─── Postular ───────────────────────────────────────────

  function handlePostular(p: PasantiaItem) {
    if (p.metodoPostulacion === "email" && p.contactoPostulacion) {
      window.open(`mailto:${p.contactoPostulacion}`, "_blank");
    } else if (p.metodoPostulacion === "formulario" && p.contactoPostulacion) {
      window.open(p.contactoPostulacion, "_blank");
    } else {
      toast.info("Contacta al publicador para postular");
    }
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Back */}
        <Link
          href="/dashboard/sala"
          className="inline-flex items-center gap-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-gold transition-colors mb-4"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          La Sala
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
              LA SALA &middot; PASANT&Iacute;AS
            </p>
            <h1 className="font-cormorant text-[28px] !font-bold text-gz-ink">
              Pasant&iacute;as
            </h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-gz-navy text-white font-archivo text-[13px] font-semibold px-5 py-2.5 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors"
          >
            + Publicar pasant&iacute;a
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <select
            value={fArea}
            onChange={(e) => setFArea(e.target.value)}
            className="border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[12px] text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
          >
            <option value="">&Aacute;rea de pr&aacute;ctica</option>
            {AREAS_PRACTICA.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <select
            value={fCiudad}
            onChange={(e) => setFCiudad(e.target.value)}
            className="border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[12px] text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
          >
            <option value="">Ciudad</option>
            {CIUDADES_CHILE.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={fFormato}
            onChange={(e) => setFFormato(e.target.value)}
            className="border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[12px] text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
          >
            <option value="">Formato</option>
            {FORMATOS_TRABAJO.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={fRemu}
            onChange={(e) => setFRemu(e.target.value)}
            className="border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[12px] text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
          >
            <option value="">Remuneraci&oacute;n</option>
            {REMUNERACION_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {(fArea || fCiudad || fFormato || fRemu) && (
            <button
              onClick={() => {
                setFArea("");
                setFCiudad("");
                setFFormato("");
                setFRemu("");
              }}
              className="font-archivo text-[11px] text-gz-ink-light hover:text-gz-burgundy transition-colors px-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-2 border-gz-gold border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Empty state */}
        {!loading && pasantias.length === 0 && (
          <div className="text-center py-12 border border-gz-rule rounded-[4px]" style={{ backgroundColor: "var(--gz-cream)" }}>
            <span className="text-[32px] block mb-2">💼</span>
            <p className="font-cormorant text-[18px] !font-bold text-gz-ink">
              No hay pasant&iacute;as publicadas
            </p>
            <p className="font-archivo text-[13px] text-gz-ink-mid mt-1">
              S&eacute; el primero en publicar una oportunidad
            </p>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {pasantias.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-gz-rule rounded-[4px] p-5 hover:border-gz-gold transition-colors"
            >
              {/* Remuneración badge */}
              <span
                className={`inline-block font-ibm-mono text-[9px] uppercase tracking-[1.5px] px-2.5 py-0.5 rounded-sm mb-2 ${
                  p.remuneracion === "pagada"
                    ? "bg-gz-sage/[0.1] text-gz-sage"
                    : p.remuneracion === "a_convenir"
                      ? "bg-gz-gold/[0.1] text-gz-gold"
                      : "bg-gz-ink-light/[0.1] text-gz-ink-light"
                }`}
              >
                {getRemuneracionLabel(p.remuneracion)}
              </span>

              {/* Title */}
              <h3 className="font-cormorant text-[18px] !font-bold text-gz-ink mb-1">
                {p.titulo}
              </h3>

              {/* Company */}
              <p className="font-archivo text-[14px] font-semibold text-gz-ink-mid mb-2">
                {p.empresa}
              </p>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 font-archivo text-[12px] text-gz-ink-light">
                <span>📍 {p.ciudad}</span>
                <span>🏢 {getFormatoLabel(p.formato)}</span>
                {p.duracion && <span>⏱ {p.duracion}</span>}
                <span>💼 {getAreaLabel(p.areaPractica)}</span>
              </div>

              {/* Monto */}
              {p.montoRemu && (
                <p className="font-ibm-mono text-[11px] text-gz-gold mt-2">
                  {p.montoRemu}
                </p>
              )}

              {/* Description */}
              <p
                className={`font-archivo text-[13px] text-gz-ink-mid mt-3 ${
                  expanded.has(p.id) ? "" : "line-clamp-3"
                }`}
              >
                {p.descripcion}
              </p>
              {p.descripcion.length > 200 && (
                <button
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                      return next;
                    })
                  }
                  className="font-archivo text-[11px] text-gz-gold hover:text-gz-ink transition-colors mt-1"
                >
                  {expanded.has(p.id) ? "Ver menos" : "Ver m\u00e1s..."}
                </button>
              )}

              {/* Requisitos */}
              {p.requisitos && (
                <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-2 line-clamp-2">
                  Requisitos: {p.requisitos}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gz-cream-dark">
                <button
                  onClick={() => setDetailId(p.id)}
                  className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors"
                >
                  Ver detalle y postular &rarr;
                </button>
                <div className="flex items-center gap-3">
                  <span className="font-archivo text-[10px] text-gz-ink-light">
                    {p.user.firstName} {p.user.lastName}
                  </span>
                  {p.userId !== userId && (
                    <button
                      onClick={() => setReportingId(p.id)}
                      className="font-archivo text-[10px] text-gz-ink-light hover:text-gz-burgundy transition-colors"
                    >
                      Reportar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {detailItem && (
        <DetailModal
          item={detailItem}
          onClose={() => setDetailId(null)}
          onPostular={() => handlePostular(detailItem)}
          isOwner={detailItem.userId === userId}
          onReport={() => {
            setDetailId(null);
            setReportingId(detailItem.id);
          }}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreatePasantiaModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {/* Report modal */}
      <ReporteModal
        isOpen={!!reportingId}
        onClose={() => setReportingId(null)}
        onSubmit={handleReport}
        tipoPublicacion="pasantía"
      />
    </main>
  );
}

// ─── Detail Modal ─────────────────────────────────────────

function DetailModal({
  item,
  onClose,
  onPostular,
  isOwner,
  onReport,
}: {
  item: PasantiaItem;
  onClose: () => void;
  onPostular: () => void;
  isOwner: boolean;
  onReport: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[4px] border border-gz-rule shadow-lg"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-6 py-4">
          <span
            className={`font-ibm-mono text-[9px] uppercase tracking-[1.5px] px-2.5 py-0.5 rounded-sm ${
              item.remuneracion === "pagada"
                ? "bg-gz-sage/[0.1] text-gz-sage"
                : item.remuneracion === "a_convenir"
                  ? "bg-gz-gold/[0.1] text-gz-gold"
                  : "bg-gz-ink-light/[0.1] text-gz-ink-light"
            }`}
          >
            {getRemuneracionLabel(item.remuneracion)}
          </span>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="M6 6 18 18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <h2 className="font-cormorant text-[24px] !font-bold text-gz-ink">
            {item.titulo}
          </h2>
          <p className="font-archivo text-[16px] font-semibold text-gz-ink-mid mt-1">
            {item.empresa}
          </p>

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-5 py-4 border-y border-gz-rule">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">Ciudad</p>
              <p className="font-archivo text-[13px] text-gz-ink mt-0.5">{item.ciudad}</p>
            </div>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">Formato</p>
              <p className="font-archivo text-[13px] text-gz-ink mt-0.5">{getFormatoLabel(item.formato)}</p>
            </div>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">&Aacute;rea</p>
              <p className="font-archivo text-[13px] text-gz-ink mt-0.5">{getAreaLabel(item.areaPractica)}</p>
            </div>
            {item.duracion && (
              <div>
                <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">Duraci&oacute;n</p>
                <p className="font-archivo text-[13px] text-gz-ink mt-0.5">{item.duracion}</p>
              </div>
            )}
            {item.montoRemu && (
              <div>
                <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">Remuneraci&oacute;n</p>
                <p className="font-archivo text-[13px] text-gz-gold font-semibold mt-0.5">{item.montoRemu}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-5">
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">Descripci&oacute;n</p>
            <p className="font-archivo text-[13px] text-gz-ink leading-relaxed whitespace-pre-wrap">
              {item.descripcion}
            </p>
          </div>

          {/* Requisitos */}
          {item.requisitos && (
            <div className="mt-4">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">Requisitos</p>
              <p className="font-archivo text-[13px] text-gz-ink-mid leading-relaxed whitespace-pre-wrap">
                {item.requisitos}
              </p>
            </div>
          )}

          {/* Author */}
          <div className="mt-5 pt-4 border-t border-gz-rule flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gz-navy text-white flex items-center justify-center font-cormorant text-[14px] !font-bold">
                {item.user.firstName[0]}
              </div>
              <div>
                <p className="font-archivo text-[13px] font-semibold text-gz-ink">
                  {item.user.firstName} {item.user.lastName}
                </p>
                {item.user.universidad && (
                  <p className="font-archivo text-[11px] text-gz-ink-light">{item.user.universidad}</p>
                )}
              </div>
            </div>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              {new Date(item.createdAt).toLocaleDateString("es-CL")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={onPostular}
              className="flex-1 bg-gz-gold text-white font-archivo text-[13px] font-semibold py-3 rounded-[3px] hover:bg-gz-gold/90 transition-colors text-center"
            >
              {item.metodoPostulacion === "email" ? "Postular por email" : "Postular"}
            </button>
            {!isOwner && (
              <button
                onClick={onReport}
                className="border border-gz-rule text-gz-ink-light font-archivo text-[11px] px-4 py-3 rounded-[3px] hover:border-gz-burgundy hover:text-gz-burgundy transition-colors"
              >
                Reportar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────

function CreatePasantiaModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [empresa, setEmpresa] = useState("");
  const [titulo, setTitulo] = useState("");
  const [areaPractica, setAreaPractica] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [formato, setFormato] = useState("");
  const [duracion, setDuracion] = useState("");
  const [remuneracion, setRemuneracion] = useState("");
  const [montoRemu, setMontoRemu] = useState("");
  const [requisitos, setRequisitos] = useState("");
  const [metodoPostulacion, setMetodoPostulacion] = useState("");
  const [contactoPostulacion, setContactoPostulacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit() {
    if (!empresa.trim() || !titulo.trim() || !descripcion.trim() || !areaPractica || !ciudad || !formato || !remuneracion || !metodoPostulacion) {
      setError("Completa todos los campos obligatorios");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/sala/pasantias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: empresa.trim(),
          titulo: titulo.trim(),
          areaPractica,
          descripcion: descripcion.trim(),
          ciudad,
          formato,
          duracion: duracion.trim() || null,
          remuneracion,
          montoRemu: montoRemu.trim() || null,
          requisitos: requisitos.trim() || null,
          metodoPostulacion,
          contactoPostulacion: contactoPostulacion.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success("Pasantía publicada");
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error ?? "Error al publicar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const LABEL_CLS = "font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1.5 block";
  const INPUT_CLS = "w-full border border-gz-rule rounded-[3px] px-3 py-2.5 font-archivo text-[13px] text-gz-ink bg-white focus:border-gz-gold focus:ring-1 focus:ring-gz-gold/20 focus:outline-none transition-colors placeholder:text-gz-ink-light/50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[4px] border border-gz-rule shadow-lg"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            PUBLICAR PASANT&Iacute;A
          </p>
          <button onClick={onClose} className="text-gz-ink-light hover:text-gz-ink transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="M6 6 18 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="bg-gz-burgundy/[0.06] border-l-[3px] border-gz-burgundy px-4 py-2.5 rounded-[3px]">
              <p className="font-archivo text-[12px] text-gz-burgundy">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Empresa *</label>
              <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={INPUT_CLS} placeholder="Nombre del estudio o empresa" />
            </div>
            <div>
              <label className={LABEL_CLS}>T&iacute;tulo *</label>
              <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={INPUT_CLS} placeholder="Pasantía en Litigación Civil" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>&Aacute;rea de pr&aacute;ctica *</label>
              <select value={areaPractica} onChange={(e) => setAreaPractica(e.target.value)} className={INPUT_CLS}>
                <option value="">Selecciona</option>
                {AREAS_PRACTICA.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Ciudad *</label>
              <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={INPUT_CLS}>
                <option value="">Selecciona</option>
                {CIUDADES_CHILE.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Formato *</label>
              <select value={formato} onChange={(e) => setFormato(e.target.value)} className={INPUT_CLS}>
                <option value="">Selecciona</option>
                {FORMATOS_TRABAJO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Duraci&oacute;n</label>
              <input type="text" value={duracion} onChange={(e) => setDuracion(e.target.value)} className={INPUT_CLS} placeholder="3 meses, 6 meses..." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Remuneraci&oacute;n *</label>
              <select value={remuneracion} onChange={(e) => setRemuneracion(e.target.value)} className={INPUT_CLS}>
                <option value="">Selecciona</option>
                {REMUNERACION_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {remuneracion === "pagada" && (
              <div>
                <label className={LABEL_CLS}>Monto</label>
                <input type="text" value={montoRemu} onChange={(e) => setMontoRemu(e.target.value)} className={INPUT_CLS} placeholder="$200.000/mes" />
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLS}>Descripci&oacute;n *</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} className={`${INPUT_CLS} resize-none`} placeholder="Describe la pasantía, funciones, equipo..." />
          </div>

          <div>
            <label className={LABEL_CLS}>Requisitos</label>
            <textarea value={requisitos} onChange={(e) => setRequisitos(e.target.value)} rows={2} className={`${INPUT_CLS} resize-none`} placeholder="Requisitos del postulante..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>M&eacute;todo de postulaci&oacute;n *</label>
              <select value={metodoPostulacion} onChange={(e) => setMetodoPostulacion(e.target.value)} className={INPUT_CLS}>
                <option value="">Selecciona</option>
                <option value="email">Email</option>
                <option value="formulario">Formulario externo</option>
                <option value="en_plataforma">En plataforma</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Contacto</label>
              <input type="text" value={contactoPostulacion} onChange={(e) => setContactoPostulacion(e.target.value)} className={INPUT_CLS} placeholder="Email o URL..." />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="border border-gz-rule text-gz-ink-mid font-archivo text-[13px] font-semibold px-5 py-2.5 rounded-[3px] hover:border-gz-gold hover:text-gz-gold transition-colors">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={saving} className="bg-gz-navy text-white font-archivo text-[13px] font-semibold px-6 py-2.5 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50">
              {saving ? "Publicando..." : "Publicar pasant\u00eda"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
