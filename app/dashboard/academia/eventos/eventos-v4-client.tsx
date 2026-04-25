"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ReporteModal } from "@/app/dashboard/sala/components/reporte-modal";
import { MastheadAcademia } from "@/components/academia/masthead-academia";
import {
  FilterShellAcademia,
  SegmentedControlAcademia,
  FilterChipAcademia,
  SortSelectAcademia,
} from "@/components/academia/filter-row-academia";
import { EmptyStateAcademia } from "@/components/academia/empty-state-academia";
import {
  eventoFormatoGradient,
  eventoFormatoLabel,
  formatFechaEditorial,
} from "@/lib/academia-helpers";

// ─── Types ─────────────────────────────────────────────────

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

interface EventosV4ClientProps {
  initialEventos: EventoItem[];
  userId: string;
  initialCalendarSourceIds?: string[];
}

type Tab = "proximos" | "pasados" | "mis";
type FormatoFilter = "TODOS" | "presencial" | "online" | "hibrido";
type Sort = "fecha-asc" | "fecha-desc" | "interesados";

const FORMATO_CHIPS: ReadonlyArray<{ value: FormatoFilter; label: string; glyph: string }> = [
  { value: "TODOS", label: "Todos", glyph: "✦" },
  { value: "presencial", label: "Presencial", glyph: "◐" },
  { value: "online", label: "Online", glyph: "◯" },
  { value: "hibrido", label: "Híbrido", glyph: "◑" },
];

// ─── Component ────────────────────────────────────────────

export function EventosV4Client({
  initialEventos,
  userId,
  initialCalendarSourceIds = [],
}: EventosV4ClientProps) {
  const [tab, setTab] = useState<Tab>("proximos");
  const [eventos, setEventos] = useState<EventoItem[]>(initialEventos);
  const [misEventos, setMisEventos] = useState<EventoItem[]>([]);
  const [misLoaded, setMisLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<EventoItem | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [calendarIds, setCalendarIds] = useState<Set<string>>(
    new Set(initialCalendarSourceIds)
  );
  const [addingToCalId, setAddingToCalId] = useState<string | null>(null);

  // Filtros
  const [query, setQuery] = useState("");
  const [formato, setFormato] = useState<FormatoFilter>("TODOS");
  const [sort, setSort] = useState<Sort>("fecha-asc");

  const fetchEventos = useCallback(async (periodo: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sala/eventos?periodo=${periodo}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setEventos(data);
      }
    } catch {
      /* silent */
    }
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
    } catch {
      /* silent */
    }
    setLoading(false);
  }, [misLoaded]);

  useEffect(() => {
    if (tab === "mis") {
      fetchMisEventos();
    } else {
      fetchEventos(tab);
    }
  }, [tab, fetchEventos, fetchMisEventos]);

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
      const apply = (e: EventoItem) =>
        e.id === eventoId
          ? {
              ...e,
              hasInteres: interesado,
              interesadosCount: e.interesadosCount + (interesado ? 1 : -1),
            }
          : e;
      setEventos((prev) => prev.map(apply));
      setMisEventos((prev) => prev.map(apply));
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

  async function handleDelete(eventoId: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      const res = await fetch(`/api/sala/eventos/${eventoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMisEventos((prev) => prev.filter((e) => e.id !== eventoId));
        toast.success("Evento eliminado");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  const baseList = tab === "mis" ? misEventos : eventos;

  const filtered = useMemo(() => {
    let arr = baseList;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      arr = arr.filter(
        (e) =>
          e.titulo.toLowerCase().includes(q) ||
          e.organizador.toLowerCase().includes(q) ||
          (e.materias ?? "").toLowerCase().includes(q),
      );
    }
    if (formato !== "TODOS") {
      arr = arr.filter((e) => e.formato === formato);
    }
    const sorted = [...arr];
    sorted.sort((a, b) => {
      if (sort === "interesados") {
        return b.interesadosCount - a.interesadosCount;
      }
      const da = new Date(a.fecha).getTime();
      const db = new Date(b.fecha).getTime();
      return sort === "fecha-desc" ? db - da : da - db;
    });
    return sorted;
  }, [baseList, query, formato, sort]);

  // Counts for segmented (sobre la lista cruda del tab activo, sin filtro)
  const tabCounts = useMemo(
    () => ({
      proximos: tab === "proximos" ? baseList.length : undefined,
      pasados: tab === "pasados" ? baseList.length : undefined,
      mis: tab === "mis" ? baseList.length : undefined,
    }),
    [tab, baseList.length],
  );

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: "var(--gz-cream)" }}>
      {/* Masthead */}
      <MastheadAcademia
        seccion="Eventos Académicos"
        glyph="✦"
        subtitulo="Seminarios, congresos y actividades propuestos por la comunidad."
        resultCount={filtered.length}
        resultLabel="eventos"
      />

      {/* Filter shell */}
      <FilterShellAcademia
        searchLabel="Buscar evento"
        searchPlaceholder="Título, organizador o materia"
        query={query}
        onQueryChange={setQuery}
        segmentedSlot={
          <SegmentedControlAcademia<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "proximos", label: "Próximos", count: tabCounts.proximos },
              { value: "pasados", label: "Pasados", count: tabCounts.pasados },
              { value: "mis", label: "Mis eventos", count: tabCounts.mis },
            ]}
          />
        }
        chipsSlot={FORMATO_CHIPS.map((c) => (
          <FilterChipAcademia
            key={c.value}
            active={formato === c.value}
            onClick={() => setFormato(c.value)}
            label={c.label}
            glyph={c.glyph}
          />
        ))}
        sortSlot={
          <SortSelectAcademia<Sort>
            value={sort}
            onChange={setSort}
            options={[
              { value: "fecha-asc", label: "Fecha (próximos primero)" },
              { value: "fecha-desc", label: "Fecha (recientes primero)" },
              { value: "interesados", label: "Más interesados" },
            ]}
          />
        }
      />

      {/* Acción: Proponer evento */}
      <div className="max-w-[1400px] mx-auto px-7 mt-6 flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase
                     border border-gz-ink text-gz-ink rounded-[3px]
                     hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
        >
          + Proponer evento
        </button>
      </div>

      {/* Listado */}
      <section className="max-w-[1400px] mx-auto px-7 mt-8">
        {loading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <EmptyStateAcademia
            glyph="✦"
            titulo={
              tab === "mis"
                ? "Aún no has propuesto eventos"
                : tab === "proximos"
                  ? "No hay eventos próximos por ahora"
                  : "No hay eventos pasados que mostrar"
            }
            descripcion={
              tab === "mis"
                ? "Propón un seminario, congreso o actividad académica para la comunidad."
                : "Vuelve pronto, la programación se actualiza con las nuevas propuestas aprobadas."
            }
            ctaLabel={tab === "mis" ? "Proponer evento" : undefined}
            ctaOnClick={tab === "mis" ? () => setShowCreate(true) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 border-l border-t border-gz-rule">
            {filtered.map((e) => (
              <EventoTile
                key={e.id}
                evento={e}
                isMine={e.user.id === userId}
                isMyTab={tab === "mis"}
                onSelect={() => setSelectedEvento(e)}
                onToggleInteres={() => toggleInteres(e.id)}
                onReport={() => setReportingId(e.id)}
                onDelete={() => handleDelete(e.id)}
                inCalendar={calendarIds.has(e.id)}
                addingToCal={addingToCalId === e.id}
                onAddToCalendar={() => handleAddToCalendar(e)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Detail drawer */}
      {selectedEvento && (
        <EventoDetailDrawer
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

      {/* Create modal */}
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

      {/* Report modal */}
      <ReporteModal
        isOpen={!!reportingId}
        onClose={() => setReportingId(null)}
        onSubmit={handleReport}
        tipoPublicacion="evento"
      />
    </main>
  );
}

// ─── Tile ───────────────────────────────────────────────────

function EventoTile({
  evento,
  isMine,
  isMyTab,
  onSelect,
  onToggleInteres,
  onReport,
  onDelete,
  inCalendar,
  addingToCal,
  onAddToCalendar,
}: {
  evento: EventoItem;
  isMine: boolean;
  isMyTab: boolean;
  onSelect: () => void;
  onToggleInteres: () => void;
  onReport: () => void;
  onDelete: () => void;
  inCalendar: boolean;
  addingToCal: boolean;
  onAddToCalendar: () => void;
}) {
  const fecha = new Date(evento.fecha);
  const dia = fecha.getDate();
  const meses = [
    "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
    "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
  ];
  const dias = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const mes = meses[fecha.getMonth()];
  const diaSemana = dias[fecha.getDay()];

  return (
    <article className="flex flex-col bg-gz-cream border-r border-b border-gz-rule">
      {/* Cover */}
      <button
        onClick={onSelect}
        className="relative aspect-[16/9] w-full overflow-hidden cursor-pointer text-left group"
        style={{ background: eventoFormatoGradient(evento.formato) }}
        aria-label={`Ver detalle de ${evento.titulo}`}
      >
        {/* Patrón sutil */}
        <div
          className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 22px, rgba(255,255,255,0.4) 22px 23px)",
          }}
        />

        {/* Format badge top-left */}
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-gz-cream/95 text-gz-ink font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase rounded-[2px]">
          {eventoFormatoLabel(evento.formato)}
        </span>

        {/* Status badge for mis eventos */}
        {isMyTab && evento.approvalStatus !== "aprobado" && (
          <span
            className={`absolute top-3 right-3 px-2.5 py-1 font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase rounded-[2px] ${
              evento.approvalStatus === "pendiente"
                ? "bg-gz-gold text-gz-ink"
                : "bg-gz-burgundy text-gz-cream"
            }`}
          >
            {evento.approvalStatus === "pendiente" ? "En revisión" : "No aprobado"}
          </span>
        )}

        {/* Costo top-right (solo aprobados) */}
        {(!isMyTab || evento.approvalStatus === "aprobado") && (
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-gz-ink/85 text-gz-cream font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase rounded-[2px]">
            {evento.costo === "gratis"
              ? "Gratis"
              : evento.montoCosto
                ? `$${evento.montoCosto}`
                : "Pagado"}
          </span>
        )}

        {/* Date block — center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gz-cream">
          <span className="font-ibm-mono text-[10px] tracking-[2px] uppercase opacity-80">
            {diaSemana}
          </span>
          <span className="font-cormorant text-[64px] font-semibold leading-none tracking-tight my-1">
            {dia}
          </span>
          <span className="font-ibm-mono text-[11px] tracking-[2.5px] uppercase">
            {mes}
          </span>
          {evento.hora && (
            <span className="mt-2 font-ibm-mono text-[10px] tracking-[1.5px] uppercase opacity-80">
              {evento.hora}
            </span>
          )}
        </div>
      </button>

      {/* Body */}
      <div className="flex-1 flex flex-col p-5 gap-2">
        <div className="h-px w-10 bg-gz-gold" />
        <h3
          className="font-cormorant font-semibold text-[22px] leading-[1.15] text-gz-ink cursor-pointer hover:text-gz-burgundy transition-colors"
          onClick={onSelect}
        >
          {evento.titulo}
        </h3>
        <p className="font-archivo text-[13px] text-gz-ink-mid leading-snug">
          {evento.organizador}
        </p>

        {evento.lugar && (
          <p className="font-archivo text-[12px] text-gz-ink-light">
            <span className="font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase mr-1.5">
              Lugar
            </span>
            {evento.lugar}
          </p>
        )}

        {evento.materias && (
          <p className="font-cormorant italic text-[13px] text-gz-ink-light">
            {evento.materias}
          </p>
        )}

        {/* Rejection reason */}
        {isMyTab && evento.approvalStatus === "rechazado" && evento.rejectionReason && (
          <div className="mt-1 border-l-2 border-gz-burgundy bg-gz-burgundy/[0.06] px-3 py-2">
            <p className="font-archivo text-[12px] text-gz-burgundy leading-snug">
              <span className="font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase mr-1">
                Motivo
              </span>
              {evento.rejectionReason}
            </p>
          </div>
        )}

        {/* Footer: stats + actions */}
        <div className="mt-auto pt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gz-rule">
          <span className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-light">
            {evento.interesadosCount}{" "}
            {evento.interesadosCount === 1 ? "interesado" : "interesados"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {evento.approvalStatus === "aprobado" && (
              <>
                <button
                  onClick={onToggleInteres}
                  className={`px-3 py-1.5 font-ibm-mono text-[10px] tracking-[1.4px] uppercase rounded-[3px] border transition cursor-pointer ${
                    evento.hasInteres
                      ? "border-gz-gold bg-gz-gold/[0.12] text-gz-gold"
                      : "border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold"
                  }`}
                >
                  {evento.hasInteres ? "✓ Interesado" : "Me interesa"}
                </button>
                <button
                  onClick={onAddToCalendar}
                  disabled={inCalendar || addingToCal}
                  className={`px-3 py-1.5 font-ibm-mono text-[10px] tracking-[1.4px] uppercase rounded-[3px] border transition cursor-pointer ${
                    inCalendar
                      ? "border-gz-sage/30 bg-gz-sage/[0.08] text-gz-sage cursor-default"
                      : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"
                  } disabled:opacity-60`}
                >
                  {addingToCal ? "..." : inCalendar ? "✓ Calendario" : "+ Calendario"}
                </button>
              </>
            )}
            {!isMine && evento.approvalStatus === "aprobado" && (
              <button
                onClick={onReport}
                className="font-archivo text-[10px] text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer"
              >
                Reportar
              </button>
            )}
            {isMine && isMyTab && (
              <button
                onClick={onDelete}
                className="font-archivo text-[10px] text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Skeleton ──────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 border-l border-t border-gz-rule">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col bg-gz-cream border-r border-b border-gz-rule"
        >
          <div className="aspect-[16/9] w-full bg-gz-rule/30 animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-4 w-24 bg-gz-rule/40 animate-pulse rounded-sm" />
            <div className="h-6 w-3/4 bg-gz-rule/40 animate-pulse rounded-sm" />
            <div className="h-3 w-1/2 bg-gz-rule/30 animate-pulse rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────

function EventoDetailDrawer({
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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Cerrar"
        className="flex-1 bg-gz-ink/40 cursor-pointer"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className="w-full max-w-[520px] h-full overflow-y-auto bg-gz-cream border-l border-gz-ink shadow-xl"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        {/* Cover top */}
        <div
          className="relative aspect-[16/8] w-full"
          style={{ background: eventoFormatoGradient(evento.formato) }}
        >
          <div
            className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent 0 22px, rgba(255,255,255,0.4) 22px 23px)",
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gz-cream text-gz-ink rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
            aria-label="Cerrar"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="M6 6 18 18" />
            </svg>
          </button>
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-gz-cream/95 text-gz-ink font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase rounded-[2px]">
            {eventoFormatoLabel(evento.formato)}
          </span>
          <div className="absolute inset-0 flex items-center justify-center text-gz-cream text-center px-6">
            <div>
              <p className="font-ibm-mono text-[11px] tracking-[2px] uppercase opacity-90">
                {formatFechaEditorial(evento.fecha)}
              </p>
              <h2 className="mt-2 font-cormorant text-[34px] font-semibold leading-[1.05]">
                {evento.titulo}
              </h2>
            </div>
          </div>
        </div>

        <div className="px-7 py-7">
          <p className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-light">
            Organizador
          </p>
          <p className="font-archivo text-[15px] text-gz-ink mt-1">
            {evento.organizador}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <DetailField label="Fecha" value={fechaStr} />
            {evento.fechaFin && (
              <DetailField
                label="Hasta"
                value={new Date(evento.fechaFin).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "long",
                })}
              />
            )}
            {evento.hora && <DetailField label="Hora" value={evento.hora} />}
            {evento.lugar && <DetailField label="Lugar" value={evento.lugar} />}
            <DetailField
              label="Costo"
              value={
                evento.costo === "gratis"
                  ? "Gratis"
                  : evento.montoCosto
                    ? `$${evento.montoCosto}`
                    : "Pagado"
              }
            />
          </div>

          {evento.linkOnline && (
            <div className="mt-5">
              <p className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-light">
                Link online
              </p>
              <a
                href={evento.linkOnline}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-1 font-archivo text-[13px] text-gz-gold hover:text-gz-ink transition-colors break-all"
              >
                {evento.linkOnline}
              </a>
            </div>
          )}

          <div className="mt-6 border-t border-gz-rule pt-5">
            <p className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-light mb-2">
              Descripción
            </p>
            <p className="font-archivo text-[14px] text-gz-ink leading-[1.65] whitespace-pre-wrap">
              {evento.descripcion}
            </p>
          </div>

          {evento.materias && (
            <p className="mt-5 font-cormorant italic text-[14px] text-gz-ink-mid">
              {evento.materias}
            </p>
          )}

          <p className="mt-6 font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-light">
            {evento.interesadosCount}{" "}
            {evento.interesadosCount === 1
              ? "persona interesada"
              : "personas interesadas"}
          </p>

          {evento.linkInscripcion && (
            <a
              href={evento.linkInscripcion}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 block w-full text-center px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.6px] uppercase rounded-[3px] hover:bg-gz-gold hover:text-gz-ink transition cursor-pointer"
            >
              Ir a inscripción →
            </a>
          )}

          <div className="mt-4 flex items-center gap-3">
            {evento.approvalStatus === "aprobado" && (
              <>
                <button
                  onClick={onToggleInteres}
                  className={`px-4 py-2 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition cursor-pointer ${
                    evento.hasInteres
                      ? "border-gz-gold bg-gz-gold/[0.12] text-gz-gold"
                      : "border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold"
                  }`}
                >
                  {evento.hasInteres ? "✓ Interesado" : "Me interesa"}
                </button>
                <button
                  onClick={onAddToCalendar}
                  disabled={inCalendar || addingToCal}
                  className={`px-4 py-2 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition cursor-pointer ${
                    inCalendar
                      ? "border-gz-sage/30 bg-gz-sage/[0.08] text-gz-sage cursor-default"
                      : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"
                  } disabled:opacity-60`}
                >
                  {addingToCal
                    ? "..."
                    : inCalendar
                      ? "✓ En calendario"
                      : "+ Mi calendario"}
                </button>
              </>
            )}
            {!isMine && evento.approvalStatus === "aprobado" && (
              <button
                onClick={onReport}
                className="font-archivo text-[11px] text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer"
              >
                Reportar
              </button>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-gz-rule">
            <p className="font-archivo text-[11px] text-gz-ink-light">
              Propuesto por{" "}
              <span className="text-gz-ink">
                {evento.user.firstName} {evento.user.lastName}
              </span>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gz-rule rounded-[3px] px-3 py-2.5 bg-white">
      <p className="font-ibm-mono text-[9.5px] tracking-[1.4px] uppercase text-gz-ink-light">
        {label}
      </p>
      <p className="mt-1 font-archivo text-[13px] text-gz-ink leading-snug">
        {value}
      </p>
    </div>
  );
}

// ─── Create Modal ──────────────────────────────────────────

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
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (
      !form.titulo.trim() ||
      !form.organizador.trim() ||
      !form.descripcion.trim() ||
      !form.fecha
    ) {
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
          montoCosto:
            form.costo === "pagado" ? form.montoCosto || undefined : undefined,
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

  const LABEL =
    "font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1.5 block";
  const INPUT =
    "w-full border border-gz-rule rounded-[3px] px-3 py-2.5 font-archivo text-[13px] text-gz-ink bg-white focus:border-gz-gold focus:ring-1 focus:ring-gz-gold/20 focus:outline-none transition-colors placeholder:text-gz-ink-light/50";

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
        <div
          className="flex items-center justify-between border-b border-gz-rule px-5 py-4 sticky top-0 z-10"
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            Proponer evento
          </p>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="M6 6 18 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {success ? (
            <div className="text-center py-8">
              <p className="font-cormorant text-[36px] italic text-gz-gold leading-none mb-3">
                ✦
              </p>
              <p className="font-cormorant !font-semibold text-[24px] text-gz-ink mb-2">
                Evento enviado
              </p>
              <p className="font-archivo text-[13px] text-gz-ink-mid mb-5 max-w-[320px] mx-auto leading-relaxed">
                Tu propuesta entró a la cola de revisión. Te avisaremos cuando
                esté publicada.
              </p>
              <button
                onClick={onCreated}
                className="px-5 py-2.5 font-ibm-mono text-[11px] tracking-[1.6px] uppercase border border-gz-ink text-gz-ink rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gz-gold/[0.08] border-l-2 border-gz-gold px-4 py-3 mb-5">
                <p className="font-archivo text-[12px] text-gz-ink leading-snug">
                  Tu propuesta pasará por moderación antes de publicarse en
                  Academia.
                </p>
              </div>

              <div className="mb-4">
                <label className={LABEL}>Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => update("titulo", e.target.value)}
                  placeholder="Ej: Seminario de Derecho Digital"
                  className={INPUT}
                />
              </div>

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

              <div className="mb-4">
                <label className={LABEL}>Descripción *</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => update("descripcion", e.target.value)}
                  rows={4}
                  placeholder="Describe el evento, temas a tratar, expositores..."
                  className={`${INPUT} resize-none`}
                />
              </div>

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

              <div className="mb-4">
                <label className={LABEL}>
                  Fecha fin (opcional, para eventos multi-día)
                </label>
                <input
                  type="date"
                  value={form.fechaFin}
                  onChange={(e) => update("fechaFin", e.target.value)}
                  className={INPUT}
                />
              </div>

              <div className="mb-4">
                <label className={LABEL}>Formato *</label>
                <select
                  value={form.formato}
                  onChange={(e) => update("formato", e.target.value)}
                  className={INPUT}
                >
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>

              {(form.formato === "presencial" || form.formato === "hibrido") && (
                <div className="mb-4">
                  <label className={LABEL}>Lugar</label>
                  <input
                    type="text"
                    value={form.lugar}
                    onChange={(e) => update("lugar", e.target.value)}
                    placeholder="Ej: Aula Magna, Av. Libertador..."
                    className={INPUT}
                  />
                </div>
              )}

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

              <div className="mb-4">
                <label className={LABEL}>Costo</label>
                <div className="flex gap-3">
                  {(["gratis", "pagado"] as const).map((c) => (
                    <label
                      key={c}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          form.costo === c
                            ? "border-gz-gold bg-gz-gold"
                            : "border-gz-rule hover:border-gz-gold/50"
                        }`}
                      >
                        {form.costo === c && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </span>
                      <span className="font-archivo text-[13px] text-gz-ink capitalize">
                        {c}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

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

              <div className="mb-4">
                <label className={LABEL}>Link de inscripción (opcional)</label>
                <input
                  type="url"
                  value={form.linkInscripcion}
                  onChange={(e) => update("linkInscripcion", e.target.value)}
                  placeholder="https://..."
                  className={INPUT}
                />
              </div>

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

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase border border-gz-rule text-gz-ink-mid rounded-[3px] hover:border-gz-ink hover:text-gz-ink transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-5 py-2.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase bg-gz-ink text-gz-cream rounded-[3px] hover:bg-gz-gold hover:text-gz-ink transition cursor-pointer disabled:opacity-50"
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
