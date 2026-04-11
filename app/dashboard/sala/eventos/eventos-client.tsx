"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ReporteModal } from "../components/reporte-modal";

// ─── Types ─────────────────────────────────────────────

interface EventoItem {
  id: string;
  titulo: string;
  descripcion: string;
  organizador: string;
  fecha: string;
  fechaFin: string | null;
  hora: string | null;
  formato: string;
  lugar: string | null;
  linkOnline: string | null;
  costo: string;
  montoCosto: string | null;
  linkInscripcion: string | null;
  materias: string | null;
  approvalStatus: string;
  rejectionReason: string | null;
  interesadosCount: number;
  hasInteres: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

interface EventosClientProps {
  initialEventos: EventoItem[];
  userId: string;
  initialCalendarSourceIds?: string[];
}

// ─── Constants ──────────────────────────────────────────

const MESES_CORTOS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

const FORMATO_LABELS: Record<string, string> = {
  presencial: "PRESENCIAL",
  online: "ONLINE",
  hibrido: "HÍBRIDO",
};

const FORMATO_COLORS: Record<string, string> = {
  presencial: "text-gz-sage",
  online: "text-gz-navy",
  hibrido: "text-gz-gold",
};

// ─── Component ─────────────────────────────────────────

export function EventosClient({ initialEventos, userId, initialCalendarSourceIds = [] }: EventosClientProps) {
  const [tab, setTab] = useState<"proximos" | "pasados" | "mis">("proximos");
  const [eventos, setEventos] = useState<EventoItem[]>(initialEventos);
  const [misEventos, setMisEventos] = useState<EventoItem[]>([]);
  const [misLoaded, setMisLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<EventoItem | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [calendarIds, setCalendarIds] = useState<Set<string>>(new Set(initialCalendarSourceIds));
  const [addingToCalId, setAddingToCalId] = useState<string | null>(null);

  async function handleAddToCalendar(evento: EventoItem) {
    if (calendarIds.has(evento.id)) return;
    setAddingToCalId(evento.id);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: evento.titulo,
          description: `${evento.organizador} · ${evento.descripcion.slice(0, 200)}`,
          eventType: "seminario",
          startDate: evento.fecha,
          endDate: evento.fechaFin || undefined,
          allDay: !evento.hora,
          color: "#1e4080",
          sourceEventoId: evento.id,
        }),
      });
      if (res.ok || res.status === 409) {
        setCalendarIds((prev) => new Set(prev).add(evento.id));
        toast.success("Evento agregado a tu calendario");
      } else {
        toast.error("Error al agregar al calendario");
      }
    } catch {
      toast.error("Error al agregar al calendario");
    } finally {
      setAddingToCalId(null);
    }
  }

  // Fetch events when tab changes
  const fetchEventos = useCallback(async (periodo: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sala/eventos?periodo=${periodo}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setEventos(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const fetchMisEventos = useCallback(async () => {
    if (misLoaded) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sala/eventos/mis-eventos");
      if (res.ok) {
        const data = await res.json();
        setMisEventos(data);
        setMisLoaded(true);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [misLoaded]);

  useEffect(() => {
    if (tab === "mis") {
      fetchMisEventos();
    } else {
      fetchEventos(tab);
    }
  }, [tab, fetchEventos, fetchMisEventos]);

  // Toggle interest
  async function toggleInteres(eventoId: string) {
    try {
      const res = await fetch(`/api/sala/eventos/${eventoId}/interes`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error");
        return;
      }
      const { interesado } = await res.json();
      setEventos((prev) =>
        prev.map((e) =>
          e.id === eventoId
            ? {
                ...e,
                hasInteres: interesado,
                interesadosCount: e.interesadosCount + (interesado ? 1 : -1),
              }
            : e
        )
      );
      if (selectedEvento?.id === eventoId) {
        setSelectedEvento((prev) =>
          prev
            ? {
                ...prev,
                hasInteres: interesado,
                interesadosCount: prev.interesadosCount + (interesado ? 1 : -1),
              }
            : null
        );
      }
    } catch {
      toast.error("Error al procesar");
    }
  }

  // Report
  async function handleReport(motivo: string, descripcion?: string) {
    if (!reportingId) return;
    const res = await fetch(`/api/sala/eventos/${reportingId}/reportar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo, descripcion }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Error");
    }
  }

  // Delete own event
  async function handleDelete(eventoId: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      const res = await fetch(`/api/sala/eventos/${eventoId}`, { method: "DELETE" });
      if (res.ok) {
        setMisEventos((prev) => prev.filter((e) => e.id !== eventoId));
        toast.success("Evento eliminado");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  const displayList = tab === "mis" ? misEventos : eventos;

  return (
    <main
      className="gz-page min-h-screen pb-24"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="px-4 lg:px-0 pt-8 pb-10">
        {/* Header — full bleed */}
        <div className="gz-section-header mb-6">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
            La Sala &middot; Eventos Acad&eacute;micos
          </p>
          <div className="flex items-center gap-3 mb-1">
            <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-tight">
              Eventos Acad&eacute;micos
            </h1>
          </div>
          <div className="border-b-2 border-gz-rule-dark mt-3" />
        </div>

        {/* Tabs + Create button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex gap-1 border-b border-gz-rule">
            {(
              [
                { key: "proximos", label: "Próximos" },
                { key: "pasados", label: "Pasados" },
                { key: "mis", label: "Mis Eventos" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 font-archivo text-[13px] font-semibold border-b-2 transition-colors -mb-px ${
                  tab === t.key
                    ? "border-gz-gold text-gz-gold"
                    : "border-transparent text-gz-ink-mid hover:text-gz-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => setShowCreate(true)}
              className="bg-gz-navy text-white font-archivo text-[13px] font-semibold px-5 py-2.5 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors"
            >
              Proponer evento
            </button>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              Los eventos pasan por aprobaci&oacute;n antes de publicarse
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-gz-gold border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Empty state */}
        {!loading && displayList.length === 0 && (
          <div className="text-center py-16 border border-gz-rule rounded-[4px] bg-white">
            <span className="text-[40px] block mb-3">📅</span>
            <p className="font-cormorant text-[18px] !font-bold text-gz-ink mb-1">
              {tab === "mis"
                ? "No has propuesto eventos a\u00FAn"
                : tab === "proximos"
                ? "No hay eventos pr\u00F3ximos"
                : "No hay eventos pasados"}
            </p>
            <p className="font-archivo text-[13px] text-gz-ink-mid">
              {tab === "mis"
                ? "Propone un evento acad\u00E9mico para la comunidad."
                : "Los eventos aprobados aparecer\u00E1n aqu\u00ED."}
            </p>
          </div>
        )}

        {/* Events list */}
        {!loading && displayList.length > 0 && (
          <div className="space-y-3">
            {displayList.map((e) => (
              <EventoCard
                key={e.id}
                evento={e}
                isMine={e.user.id === userId}
                isMyTab={tab === "mis"}
                onToggleInteres={() => toggleInteres(e.id)}
                onSelect={() => setSelectedEvento(e)}
                onReport={() => setReportingId(e.id)}
                onDelete={() => handleDelete(e.id)}
                inCalendar={calendarIds.has(e.id)}
                addingToCal={addingToCalId === e.id}
                onAddToCalendar={() => handleAddToCalendar(e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvento && (
        <EventoDetailModal
          evento={selectedEvento}
          isMine={selectedEvento.user.id === userId}
          onClose={() => setSelectedEvento(null)}
          onToggleInteres={() => toggleInteres(selectedEvento.id)}
          onReport={() => {
            setSelectedEvento(null);
            setReportingId(selectedEvento.id);
          }}
          inCalendar={calendarIds.has(selectedEvento.id)}
          addingToCal={addingToCalId === selectedEvento.id}
          onAddToCalendar={() => handleAddToCalendar(selectedEvento)}
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateEventoModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setMisLoaded(false);
            setTab("mis");
          }}
        />
      )}

      {/* Report Modal */}
      <ReporteModal
        isOpen={!!reportingId}
        onClose={() => setReportingId(null)}
        onSubmit={handleReport}
        tipoPublicacion="evento"
      />
    </main>
  );
}

// ─── Event Card ────────────────────────────────────────

function EventoCard({
  evento,
  isMine,
  isMyTab,
  onToggleInteres,
  onSelect,
  onReport,
  onDelete,
  inCalendar,
  addingToCal,
  onAddToCalendar,
}: {
  evento: EventoItem;
  isMine: boolean;
  isMyTab: boolean;
  onToggleInteres: () => void;
  onSelect: () => void;
  onReport: () => void;
  onDelete: () => void;
  inCalendar: boolean;
  addingToCal: boolean;
  onAddToCalendar: () => void;
}) {
  const fecha = new Date(evento.fecha);
  const mes = MESES_CORTOS[fecha.getMonth()];
  const dia = fecha.getDate();

  return (
    <div className="bg-white border border-gz-rule rounded-[4px] p-5 hover:border-gz-gold transition-colors">
      <div className="flex items-start gap-4">
        {/* Date block */}
        <div className="flex-shrink-0 w-14 text-center bg-gz-navy rounded-[4px] p-2">
          <p className="font-ibm-mono text-[9px] uppercase text-gz-gold-bright">{mes}</p>
          <p className="font-cormorant text-[24px] !font-bold text-white leading-none">{dia}</p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Status badge for "mis eventos" tab */}
          {isMyTab && (
            <div className="mb-1.5">
              {evento.approvalStatus === "pendiente" && (
                <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] bg-gz-gold/[0.12] text-gz-gold px-2 py-0.5 rounded-sm">
                  En revisi&oacute;n
                </span>
              )}
              {evento.approvalStatus === "aprobado" && (
                <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] bg-gz-sage/[0.12] text-gz-sage px-2 py-0.5 rounded-sm">
                  Publicado
                </span>
              )}
              {evento.approvalStatus === "rechazado" && (
                <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] bg-gz-burgundy/[0.12] text-gz-burgundy px-2 py-0.5 rounded-sm">
                  No aprobado
                </span>
              )}
            </div>
          )}

          {/* Format badge */}
          <span className={`font-ibm-mono text-[9px] uppercase tracking-[1px] ${FORMATO_COLORS[evento.formato] || "text-gz-ink-light"}`}>
            {FORMATO_LABELS[evento.formato] || evento.formato}
          </span>

          {/* Title */}
          <h3
            className="font-cormorant text-[18px] !font-bold text-gz-ink mt-0.5 cursor-pointer hover:text-gz-gold transition-colors"
            onClick={onSelect}
          >
            {evento.titulo}
          </h3>

          {/* Organizador */}
          <p className="font-archivo text-[13px] text-gz-ink-mid">{evento.organizador}</p>

          {/* Details row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 font-archivo text-[12px] text-gz-ink-light">
            {evento.hora && <span>🕐 {evento.hora}</span>}
            {evento.lugar && <span>📍 {evento.lugar}</span>}
            {evento.linkOnline && <span>🔗 Online</span>}
            <span>💰 {evento.costo === "gratis" ? "Gratis" : evento.montoCosto ? `$${evento.montoCosto}` : "Pagado"}</span>
            <span>👥 {evento.interesadosCount} interesado{evento.interesadosCount !== 1 ? "s" : ""}</span>
          </div>

          {/* Rejection reason */}
          {isMyTab && evento.approvalStatus === "rechazado" && evento.rejectionReason && (
            <div className="mt-2 bg-gz-burgundy/[0.06] border border-gz-burgundy/20 rounded-[3px] px-3 py-2">
              <p className="font-archivo text-[12px] text-gz-burgundy">
                <strong>Motivo:</strong> {evento.rejectionReason}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-3">
            {evento.approvalStatus === "aprobado" && (
              <button
                onClick={onToggleInteres}
                className={`border rounded-[3px] px-4 py-1.5 font-archivo text-[12px] font-semibold transition-colors ${
                  evento.hasInteres
                    ? "border-gz-gold bg-gz-gold/[0.08] text-gz-gold"
                    : "border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold"
                }`}
              >
                {evento.hasInteres ? "✓ Me interesa" : "Me interesa"}
              </button>
            )}

            {evento.approvalStatus === "aprobado" && (
              <button
                onClick={onAddToCalendar}
                disabled={inCalendar || addingToCal}
                className={`border rounded-[3px] px-4 py-1.5 font-archivo text-[12px] font-semibold transition-colors ${
                  inCalendar
                    ? "border-gz-sage/30 bg-gz-sage/[0.08] text-gz-sage cursor-default"
                    : "border-gz-rule text-gz-ink-mid hover:border-gz-navy hover:text-gz-navy"
                }`}
              >
                {addingToCal ? "..." : inCalendar ? "✓ En calendario" : "📅 Mi calendario"}
              </button>
            )}

            {!isMine && evento.approvalStatus === "aprobado" && (
              <button
                onClick={onReport}
                className="font-archivo text-[10px] text-gz-ink-light hover:text-gz-burgundy transition-colors"
              >
                Reportar
              </button>
            )}

            {isMine && isMyTab && (
              <button
                onClick={onDelete}
                className="font-archivo text-[10px] text-gz-ink-light hover:text-gz-burgundy transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────

function EventoDetailModal({
  evento,
  isMine,
  onClose,
  onToggleInteres,
  onReport,
  inCalendar,
  addingToCal,
  onAddToCalendar,
}: {
  evento: EventoItem;
  isMine: boolean;
  onClose: () => void;
  onToggleInteres: () => void;
  onReport: () => void;
  inCalendar: boolean;
  addingToCal: boolean;
  onAddToCalendar: () => void;
}) {
  const fecha = new Date(evento.fecha);
  const fechaStr = fecha.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
        className="w-full max-w-lg rounded-[4px] border border-gz-rule shadow-lg max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            Detalle del evento
          </p>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="M6 6 18 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {/* Format badge */}
          <span className={`font-ibm-mono text-[9px] uppercase tracking-[1px] ${FORMATO_COLORS[evento.formato] || "text-gz-ink-light"}`}>
            {FORMATO_LABELS[evento.formato] || evento.formato}
          </span>

          <h2 className="font-cormorant text-[24px] !font-bold text-gz-ink mt-1 mb-1">
            {evento.titulo}
          </h2>
          <p className="font-archivo text-[14px] text-gz-ink-mid mb-4">
            {evento.organizador}
          </p>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="border border-gz-rule rounded-[3px] p-3">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Fecha</p>
              <p className="font-archivo text-[13px] text-gz-ink font-semibold">{fechaStr}</p>
              {evento.fechaFin && (
                <p className="font-archivo text-[11px] text-gz-ink-light mt-0.5">
                  hasta {new Date(evento.fechaFin).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                </p>
              )}
            </div>
            {evento.hora && (
              <div className="border border-gz-rule rounded-[3px] p-3">
                <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Hora</p>
                <p className="font-archivo text-[13px] text-gz-ink font-semibold">{evento.hora}</p>
              </div>
            )}
            {evento.lugar && (
              <div className="border border-gz-rule rounded-[3px] p-3">
                <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Lugar</p>
                <p className="font-archivo text-[13px] text-gz-ink font-semibold">{evento.lugar}</p>
              </div>
            )}
            <div className="border border-gz-rule rounded-[3px] p-3">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Costo</p>
              <p className="font-archivo text-[13px] text-gz-ink font-semibold">
                {evento.costo === "gratis" ? "Gratis" : evento.montoCosto ? `$${evento.montoCosto}` : "Pagado"}
              </p>
            </div>
          </div>

          {/* Link online */}
          {evento.linkOnline && (
            <div className="mb-4">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Link online</p>
              <a
                href={evento.linkOnline}
                target="_blank"
                rel="noopener noreferrer"
                className="font-archivo text-[13px] text-gz-gold hover:text-gz-ink transition-colors break-all"
              >
                {evento.linkOnline}
              </a>
            </div>
          )}

          {/* Description */}
          <div className="mb-5">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-2">Descripci&oacute;n</p>
            <p className="font-archivo text-[13px] text-gz-ink leading-relaxed whitespace-pre-wrap">
              {evento.descripcion}
            </p>
          </div>

          {/* Materias */}
          {evento.materias && (
            <div className="mb-5">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-2">Materias relacionadas</p>
              <p className="font-archivo text-[12px] text-gz-ink-mid">{evento.materias}</p>
            </div>
          )}

          {/* Interesados count */}
          <div className="flex items-center gap-2 mb-5 font-archivo text-[13px] text-gz-ink-mid">
            <span>👥</span>
            <span>{evento.interesadosCount} persona{evento.interesadosCount !== 1 ? "s" : ""} interesada{evento.interesadosCount !== 1 ? "s" : ""}</span>
          </div>

          {/* Inscription link */}
          {evento.linkInscripcion && (
            <a
              href={evento.linkInscripcion}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gz-navy text-white text-center font-archivo text-[13px] font-semibold py-3 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors mb-3"
            >
              Ir a inscripci&oacute;n &rarr;
            </a>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            {evento.approvalStatus === "aprobado" && (
              <button
                onClick={onToggleInteres}
                className={`border rounded-[3px] px-5 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                  evento.hasInteres
                    ? "border-gz-gold bg-gz-gold/[0.08] text-gz-gold"
                    : "border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold"
                }`}
              >
                {evento.hasInteres ? "✓ Me interesa" : "Me interesa"}
              </button>
            )}

            {evento.approvalStatus === "aprobado" && (
              <button
                onClick={onAddToCalendar}
                disabled={inCalendar || addingToCal}
                className={`border rounded-[3px] px-5 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                  inCalendar
                    ? "border-gz-sage/30 bg-gz-sage/[0.08] text-gz-sage cursor-default"
                    : "border-gz-rule text-gz-ink-mid hover:border-gz-navy hover:text-gz-navy"
                }`}
              >
                {addingToCal ? "..." : inCalendar ? "✓ En calendario" : "📅 Mi calendario"}
              </button>
            )}

            {!isMine && evento.approvalStatus === "aprobado" && (
              <button
                onClick={onReport}
                className="font-archivo text-[11px] text-gz-ink-light hover:text-gz-burgundy transition-colors"
              >
                Reportar
              </button>
            )}
          </div>

          {/* Author info */}
          <div className="mt-5 pt-4 border-t border-gz-rule">
            <p className="font-archivo text-[11px] text-gz-ink-light">
              Propuesto por {evento.user.firstName} {evento.user.lastName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create Modal ──────────────────────────────────────

function CreateEventoModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    titulo: "",
    organizador: "",
    descripcion: "",
    fecha: "",
    fechaFin: "",
    hora: "",
    formato: "presencial",
    lugar: "",
    linkOnline: "",
    costo: "gratis",
    montoCosto: "",
    linkInscripcion: "",
    materias: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.titulo.trim() || !form.organizador.trim() || !form.descripcion.trim() || !form.fecha) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/sala/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          organizador: form.organizador,
          descripcion: form.descripcion,
          fecha: form.fecha,
          fechaFin: form.fechaFin || undefined,
          hora: form.hora || undefined,
          formato: form.formato,
          lugar: form.lugar || undefined,
          linkOnline: form.linkOnline || undefined,
          costo: form.costo,
          montoCosto: form.costo === "pagado" ? form.montoCosto || undefined : undefined,
          linkInscripcion: form.linkInscripcion || undefined,
          materias: form.materias || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al crear");
        return;
      }
      setSuccess(true);
    } catch {
      toast.error("Error al crear evento");
    } finally {
      setLoading(false);
    }
  }

  const LABEL = "font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1.5 block";
  const INPUT = "w-full border border-gz-rule rounded-[3px] px-3 py-2.5 font-archivo text-[13px] text-gz-ink bg-white focus:border-gz-gold focus:ring-1 focus:ring-gz-gold/20 focus:outline-none transition-colors placeholder:text-gz-ink-light/50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-[4px] border border-gz-rule shadow-lg max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4 sticky top-0 z-10" style={{ backgroundColor: "var(--gz-cream)" }}>
          <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            Proponer evento
          </p>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="M6 6 18 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {success ? (
            <div className="text-center py-8">
              <span className="text-[40px] block mb-3">📅</span>
              <p className="font-cormorant text-[20px] !font-bold text-gz-ink mb-2">
                Evento publicado
              </p>
              <p className="font-archivo text-[13px] text-gz-ink-mid mb-5">
                Tu evento ha sido publicado exitosamente y ya es visible para todos los usuarios.
              </p>
              <button
                onClick={onCreated}
                className="bg-gz-navy text-white font-archivo text-[13px] font-semibold px-6 py-2.5 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              {/* Notice */}
              <div className="bg-gz-sage/[0.08] border border-gz-sage/20 rounded-[3px] px-4 py-3 mb-5">
                <p className="font-archivo text-[12px] text-gz-sage font-medium">
                  Tu evento será publicado inmediatamente y visible para todos los usuarios.
                </p>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className={LABEL}>T&iacute;tulo *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => update("titulo", e.target.value)}
                  placeholder="Ej: Seminario de Derecho Digital"
                  className={INPUT}
                />
              </div>

              {/* Organizador */}
              <div className="mb-4">
                <label className={LABEL}>Organizador *</label>
                <input
                  type="text"
                  value={form.organizador}
                  onChange={(e) => update("organizador", e.target.value)}
                  placeholder="Ej: Facultad de Derecho UC"
                  className={INPUT}
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className={LABEL}>Descripci&oacute;n *</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => update("descripcion", e.target.value)}
                  rows={4}
                  placeholder="Describe el evento, temas a tratar, expositores..."
                  className={`${INPUT} resize-none`}
                />
              </div>

              {/* Date + Time row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className={LABEL}>Fecha *</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => update("fecha", e.target.value)}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL}>Hora</label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) => update("hora", e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>

              {/* End date */}
              <div className="mb-4">
                <label className={LABEL}>Fecha fin (opcional, para eventos multi-d&iacute;a)</label>
                <input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => update("fechaFin", e.target.value)}
                  className={INPUT}
                />
              </div>

              {/* Formato */}
              <div className="mb-4">
                <label className={LABEL}>Formato *</label>
                <select
                  value={form.formato}
                  onChange={(e) => update("formato", e.target.value)}
                  className={INPUT}
                >
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="hibrido">H&iacute;brido</option>
                </select>
              </div>

              {/* Lugar */}
              {(form.formato === "presencial" || form.formato === "hibrido") && (
                <div className="mb-4">
                  <label className={LABEL}>Lugar</label>
                  <input
                    type="text"
                    value={form.lugar}
                    onChange={(e) => update("lugar", e.target.value)}
                    placeholder="Ej: Aula Magna, Av. Libertador Bernardo O'Higgins 340"
                    className={INPUT}
                  />
                </div>
              )}

              {/* Link online */}
              {(form.formato === "online" || form.formato === "hibrido") && (
                <div className="mb-4">
                  <label className={LABEL}>Link online</label>
                  <input
                    type="url"
                    value={form.linkOnline}
                    onChange={(e) => update("linkOnline", e.target.value)}
                    placeholder="https://zoom.us/..."
                    className={INPUT}
                  />
                </div>
              )}

              {/* Costo */}
              <div className="mb-4">
                <label className={LABEL}>Costo</label>
                <div className="flex gap-3">
                  {(["gratis", "pagado"] as const).map((c) => (
                    <label key={c} className="flex items-center gap-2 cursor-pointer">
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          form.costo === c
                            ? "border-gz-gold bg-gz-gold"
                            : "border-gz-rule hover:border-gz-gold/50"
                        }`}
                      >
                        {form.costo === c && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="font-archivo text-[13px] text-gz-ink capitalize">{c}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Monto costo */}
              {form.costo === "pagado" && (
                <div className="mb-4">
                  <label className={LABEL}>Monto</label>
                  <input
                    type="text"
                    value={form.montoCosto}
                    onChange={(e) => update("montoCosto", e.target.value)}
                    placeholder="Ej: $15.000"
                    className={INPUT}
                  />
                </div>
              )}

              {/* Link inscripción */}
              <div className="mb-4">
                <label className={LABEL}>Link de inscripci&oacute;n (opcional)</label>
                <input
                  type="url"
                  value={form.linkInscripcion}
                  onChange={(e) => update("linkInscripcion", e.target.value)}
                  placeholder="https://..."
                  className={INPUT}
                />
              </div>

              {/* Materias */}
              <div className="mb-5">
                <label className={LABEL}>Materias relacionadas (opcional)</label>
                <input
                  type="text"
                  value={form.materias}
                  onChange={(e) => update("materias", e.target.value)}
                  placeholder="Ej: Derecho Civil, Derecho Constitucional"
                  className={INPUT}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="border border-gz-rule text-gz-ink-mid font-archivo text-[13px] font-semibold px-5 py-2.5 rounded-[3px] hover:border-gz-gold hover:text-gz-gold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-gz-navy text-white font-archivo text-[13px] font-semibold px-5 py-2.5 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar para aprobación"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
