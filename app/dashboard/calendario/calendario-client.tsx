"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CountdownsSidebar } from "./countdown-sidebar";

// ─── Types ─────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  color: string | null;
  sourceEventoId?: string | null;
  location?: string | null;
  url?: string | null;
  recurrence?: string | null;
  reminderMinutes?: number | null;
  materia?: string | null;
  attendees?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CountdownItem {
  id: string;
  titulo: string;
  fecha: string;
  color: string;
  isGrado: boolean;
}

interface XpLogEntry {
  id: string;
  amount: number;
  category: string;
  detalle: string | null;
  materia: string | null;
  createdAt: string;
}

interface ActividadDia {
  modo: "dia";
  fecha: string;
  totalXp: number;
  totalActividades: number;
  porHora: Record<number, { logs: XpLogEntry[]; totalXp: number }>;
  porMateria: Record<string, number>;
  porDetalle: Record<string, number>;
  logs: XpLogEntry[];
}

interface ActividadMes {
  modo: "mes";
  mes: string;
  porDia: Record<string, { totalXp: number; actividades: number }>;
}

interface CalendarioClientProps {
  initialEvents: CalendarEvent[];
  initialMonth: number;
  initialYear: number;
  initialCountdowns: CountdownItem[];
  initialStreak?: number;
  initialBestStreak?: number;
}

type CalView = "year" | "month" | "day";

// ─── Constants ─────────────────────────────────────────────

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DAYS_ES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTHS_ES_SHORT = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

const EVENT_TYPE_OPTIONS = [
  { value: "estudio", label: "Sesión de estudio", glyph: "❡" },
  { value: "causa", label: "Causa programada", glyph: "⚖" },
  { value: "ayudantia", label: "Ayudantía", glyph: "✦" },
  { value: "seminario", label: "Seminario / Conferencia", glyph: "✠" },
  { value: "personal", label: "Personal", glyph: "•" },
];

const EVENT_COLORS: Record<string, string> = {
  estudio: "#9a7230", // gold
  causa: "#6b1d2a", // burgundy
  ayudantia: "#1A5C3A", // verde
  seminario: "#1e4080", // navy
  personal: "#8a8074", // ink-mid neutro
};

const EVENT_ICONS: Record<string, string> = {
  estudio: "❡",
  causa: "⚖",
  ayudantia: "✦",
  seminario: "✠",
  personal: "•",
};

// Para los chips de filtro
const TIPOS_FILTRO: { key: string; label: string; glyph: string }[] = [
  { key: "TODOS", label: "Todos", glyph: "✶" },
  { key: "estudio", label: "Estudio", glyph: "❡" },
  { key: "causa", label: "Causas", glyph: "⚖" },
  { key: "ayudantia", label: "Ayudantías", glyph: "✦" },
  { key: "seminario", label: "Seminarios", glyph: "✠" },
  { key: "personal", label: "Personal", glyph: "•" },
];

const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Sin aviso" },
  { value: 0, label: "Al iniciar" },
  { value: 5, label: "5 minutos antes" },
  { value: 15, label: "15 minutos antes" },
  { value: 30, label: "30 minutos antes" },
  { value: 60, label: "1 hora antes" },
  { value: 120, label: "2 horas antes" },
  { value: 1440, label: "1 día antes" },
  { value: 2880, label: "2 días antes" },
  { value: 10080, label: "1 semana antes" },
];

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "Nunca" },
  { value: "daily", label: "Cada día" },
  { value: "weekly", label: "Cada semana" },
  { value: "biweekly", label: "Cada dos semanas" },
  { value: "monthly", label: "Cada mes" },
  { value: "yearly", label: "Cada año" },
];

const RECURRENCE_LABELS: Record<string, string> = {
  none: "—",
  daily: "Cada día",
  weekly: "Cada semana",
  biweekly: "Cada dos semanas",
  monthly: "Cada mes",
  yearly: "Cada año",
};

const DETALLE_ICONS: Record<string, string> = {
  MCQ: "🎯",
  "Verdadero/Falso": "✓✗",
  Flashcards: "🃏",
  Definiciones: "📖",
  "Simulacro Oral": "🎙️",
  Causa: "⚔️",
  "Análisis de Sentencia": "📝",
  Ensayo: "✍️",
  "Obiter Dictum": "💬",
  "Comuníquese": "📣",
  "Racha diaria": "🔥",
  "Racha rota": "💔",
};

const CATEGORY_LABELS: Record<string, string> = {
  estudio: "Estudio",
  simulacro: "Simulacro",
  causas: "Causas",
  publicaciones: "Publicaciones",
  bonus: "Bonus",
};

// ─── Helpers ───────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function isTodayCheck(year: number, month: number, day: number) {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function getISODayOfWeek(date: Date) {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

// ─── Component ─────────────────────────────────────────────

export function CalendarioClient({
  initialEvents,
  initialMonth,
  initialYear,
  initialCountdowns,
  initialStreak = 0,
  initialBestStreak = 0,
}: CalendarioClientProps) {
  const [view, setView] = useState<CalView>("month");
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [dayDate, setDayDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Year view: cache events for all 12 months
  const [yearEvents, setYearEvents] = useState<Record<string, boolean>>({});

  // Activity data
  const [actividadDia, setActividadDia] = useState<ActividadDia | null>(null);
  const [actividadMes, setActividadMes] = useState<ActividadMes | null>(null);
  const [yearActividad, setYearActividad] = useState<Record<string, { totalXp: number; actividades: number }>>({});
  const streak = initialStreak;
  const bestStreak = initialBestStreak;

  // Modal form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("personal");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndDate, setFormEndDate] = useState("");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formAllDay, setFormAllDay] = useState(true);
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formRecurrence, setFormRecurrence] = useState("none");
  const [formReminder, setFormReminder] = useState<number | null>(null);
  const [formMateria, setFormMateria] = useState("");
  const [formAttendees, setFormAttendees] = useState("");

  // Filtro de tipo (chip rail)
  const [tipoFiltro, setTipoFiltro] = useState<string>("TODOS");

  const gridRef = useRef<HTMLDivElement>(null);

  // ─── Fetch events ──────────────────────────────────────────

  const fetchEvents = useCallback(async (m: number, y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${m}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  // Fetch year overview (all 12 months, just day-has-events map)
  const fetchYearOverview = useCallback(async (y: number) => {
    setLoading(true);
    const map: Record<string, boolean> = {};
    try {
      const promises = Array.from({ length: 12 }, (_, i) =>
        fetch(`/api/calendar?month=${i + 1}&year=${y}`).then((r) => r.ok ? r.json() : [])
      );
      const results = await Promise.all(promises);
      results.forEach((monthEvents: CalendarEvent[]) => {
        monthEvents.forEach((e) => {
          const d = new Date(e.startDate);
          map[`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`] = true;
        });
      });
    } catch { /* silent */ }
    setYearEvents(map);
    setLoading(false);
  }, []);

  // Fetch activity for a day
  const fetchActividadDia = useCallback(async (fecha: string) => {
    try {
      const res = await fetch(`/api/calendario/actividad?fecha=${fecha}`);
      if (res.ok) setActividadDia(await res.json());
    } catch { /* silent */ }
  }, []);

  // Fetch activity for a month
  const fetchActividadMes = useCallback(async (y: number, m: number) => {
    try {
      const mes = `${y}-${String(m).padStart(2, "0")}`;
      const res = await fetch(`/api/calendario/actividad?mes=${mes}`);
      if (res.ok) {
        const data: ActividadMes = await res.json();
        setActividadMes(data);
      }
    } catch { /* silent */ }
  }, []);

  // Fetch activity for entire year (for heatmap)
  const fetchYearActividad = useCallback(async (y: number) => {
    const combined: Record<string, { totalXp: number; actividades: number }> = {};
    try {
      const promises = Array.from({ length: 12 }, (_, i) => {
        const mes = `${y}-${String(i + 1).padStart(2, "0")}`;
        return fetch(`/api/calendario/actividad?mes=${mes}`).then((r) => r.ok ? r.json() : { porDia: {} });
      });
      const results = await Promise.all(promises);
      results.forEach((data: ActividadMes) => {
        if (data.porDia) Object.assign(combined, data.porDia);
      });
    } catch { /* silent */ }
    setYearActividad(combined);
  }, []);

  // Auto-fetch activity on mount and view changes
  useEffect(() => {
    fetchActividadMes(year, month);
  }, [year, month, fetchActividadMes]);

  // Fetch today's activity for sidebar XP summary
  useEffect(() => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    fetchActividadDia(dateStr);
  }, [fetchActividadDia]);

  // ─── Navigation ────────────────────────────────────────────

  function handlePrev() {
    setSelectedDay(null);
    if (view === "year") {
      setYear(year - 1);
      fetchYearOverview(year - 1);
    } else if (view === "month") {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
        fetchEvents(12, year - 1);
      } else {
        setMonth(month - 1);
        fetchEvents(month - 1, year);
      }
    } else {
      const prev = new Date(dayDate);
      prev.setDate(prev.getDate() - 1);
      setDayDate(prev);
      setMonth(prev.getMonth() + 1);
      setYear(prev.getFullYear());
      fetchEvents(prev.getMonth() + 1, prev.getFullYear());
      const ds = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
      fetchActividadDia(ds);
    }
  }

  function handleNext() {
    setSelectedDay(null);
    if (view === "year") {
      setYear(year + 1);
      fetchYearOverview(year + 1);
      fetchYearActividad(year + 1);
    } else if (view === "month") {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
        fetchEvents(1, year + 1);
      } else {
        setMonth(month + 1);
        fetchEvents(month + 1, year);
      }
    } else {
      const next = new Date(dayDate);
      next.setDate(next.getDate() + 1);
      setDayDate(next);
      setMonth(next.getMonth() + 1);
      setYear(next.getFullYear());
      fetchEvents(next.getMonth() + 1, next.getFullYear());
      const ds = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
      fetchActividadDia(ds);
    }
  }

  function switchToView(v: CalView) {
    setSelectedDay(null);
    setView(v);
    if (v === "year") {
      fetchYearOverview(year);
      fetchYearActividad(year);
    }
    if (v === "day") {
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
      fetchActividadDia(dateStr);
    }
  }

  function goToMonth(m: number) {
    setMonth(m);
    setView("month");
    fetchEvents(m, year);
  }

  function goToDay(y: number, m: number, d: number) {
    const date = new Date(y, m - 1, d);
    setDayDate(date);
    setMonth(m);
    setYear(y);
    setView("day");
    fetchEvents(m, y);
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    fetchActividadDia(dateStr);
  }

  // ─── Events helpers ────────────────────────────────────────

  function getEventsForDate(date: Date) {
    return events.filter((e) => {
      const d = new Date(e.startDate);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  }

  // ─── Quick add ─────────────────────────────────────────────

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const targetDate = view === "day"
      ? dayDate
      : selectedDay
      ? new Date(year, month - 1, selectedDay)
      : null;
    if (!targetDate) return;

    setQuickLoading(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickInput.trim(),
          eventType: "personal",
          startDate: targetDate.toISOString(),
          allDay: true,
        }),
      });
      if (res.ok) {
        const newEvent = await res.json();
        setEvents((prev) => [...prev, newEvent]);
        setQuickInput("");
      }
    } catch { /* silent */ }
    setQuickLoading(false);
  }

  // ─── Modal helpers ─────────────────────────────────────────

  function openCreateModal(day?: number) {
    setEditingEvent(null);
    setFormTitle("");
    setFormType("personal");
    const d = day ?? selectedDay ?? (view === "day" ? dayDate.getDate() : new Date().getDate());
    const m = view === "day" ? dayDate.getMonth() + 1 : month;
    const y = view === "day" ? dayDate.getFullYear() : year;
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    setFormStartDate(dateStr);
    setFormStartTime("09:00");
    setFormEndDate("");
    setFormEndTime("10:00");
    setFormAllDay(true);
    setFormDescription("");
    setFormLocation("");
    setFormUrl("");
    setFormRecurrence("none");
    setFormReminder(null);
    setFormMateria("");
    setFormAttendees("");
    setModalOpen(true);
  }

  function openEditModal(event: CalendarEvent) {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormType(event.eventType);
    const sd = new Date(event.startDate);
    setFormStartDate(`${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}-${String(sd.getDate()).padStart(2, "0")}`);
    setFormStartTime(`${String(sd.getHours()).padStart(2, "0")}:${String(sd.getMinutes()).padStart(2, "0")}`);
    setFormAllDay(event.allDay);
    if (event.endDate) {
      const ed = new Date(event.endDate);
      setFormEndDate(`${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, "0")}-${String(ed.getDate()).padStart(2, "0")}`);
      setFormEndTime(`${String(ed.getHours()).padStart(2, "0")}:${String(ed.getMinutes()).padStart(2, "0")}`);
    } else {
      setFormEndDate("");
      setFormEndTime("10:00");
    }
    setFormDescription(event.description ?? "");
    setFormLocation(event.location ?? "");
    setFormUrl(event.url ?? "");
    setFormRecurrence(event.recurrence ?? "none");
    setFormReminder(event.reminderMinutes ?? null);
    setFormMateria(event.materia ?? "");
    setFormAttendees(event.attendees ?? "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formStartDate) return;
    setSaving(true);
    try {
      let startDate: string;
      let endDate: string | undefined;
      if (formAllDay) {
        startDate = new Date(`${formStartDate}T00:00:00`).toISOString();
        endDate = formEndDate ? new Date(`${formEndDate}T23:59:59`).toISOString() : undefined;
      } else {
        startDate = new Date(`${formStartDate}T${formStartTime}:00`).toISOString();
        endDate = formEndDate && formEndTime ? new Date(`${formEndDate}T${formEndTime}:00`).toISOString() : undefined;
      }
      const payload = {
        title: formTitle.trim(),
        eventType: formType,
        startDate,
        endDate,
        allDay: formAllDay,
        description: formDescription.trim() || null,
        location: formLocation.trim() || null,
        url: formUrl.trim() || null,
        recurrence: formRecurrence === "none" ? null : formRecurrence,
        reminderMinutes: formReminder,
        materia: formMateria.trim() || null,
        attendees: formAttendees.trim() || null,
      };

      if (editingEvent) {
        const res = await fetch(`/api/calendar/${editingEvent.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) { const updated = await res.json(); setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e))); }
      } else {
        const res = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.ok) { const created = await res.json(); setEvents((prev) => [...prev, created]); }
      }
      setModalOpen(false);
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleDelete() {
    if (!editingEvent || !confirm("¿Eliminar este evento?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendar/${editingEvent.id}`, { method: "DELETE" });
      if (res.ok) { setEvents((prev) => prev.filter((e) => e.id !== editingEvent.id)); setModalOpen(false); }
    } catch { /* silent */ }
    setDeleting(false);
  }

  // ─── Close expanded day on outside click ───────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) setSelectedDay(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ─── Header label ──────────────────────────────────────────

  function getHeaderLabel() {
    if (view === "year") return `${year}`;
    if (view === "day") {
      const dow = getISODayOfWeek(dayDate);
      return `${DAYS_ES_FULL[dow]} ${dayDate.getDate()} de ${MONTHS_ES[dayDate.getMonth()]}, ${dayDate.getFullYear()}`;
    }
    return `${MONTHS_ES[month - 1]} ${year}`;
  }

  // ─── View tabs ─────────────────────────────────────────────

  const VIEW_TABS: { key: CalView; label: string }[] = [
    { key: "year", label: "Año" },
    { key: "month", label: "Mes" },
    { key: "day", label: "Día" },
  ];

  // ─── Render ────────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="px-4 py-8 sm:px-6">
        <div className="flex gap-6">
        {/* ─── Calendar content ──────────────────────── */}
        <div className="min-w-0 flex-1">

        {/* ─── Header editorial ───────────────────────── */}
        <div className="mb-5">
          {/* Linea 1: Mes en grande + acciones */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrev}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold hover:bg-gz-cream-dark/40 transition-all cursor-pointer"
                aria-label="Mes anterior"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <div className="flex flex-col">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light leading-none mb-1">
                  {view === "year" ? "Vista anual" : view === "day" ? "Día" : "Mes"}
                </p>
                <h2 className="font-cormorant text-[34px] sm:text-[40px] font-bold text-gz-ink leading-none tracking-tight">
                  {getHeaderLabel()}
                </h2>
              </div>
              <button
                onClick={handleNext}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold hover:bg-gz-cream-dark/40 transition-all cursor-pointer"
                aria-label="Mes siguiente"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* View tabs como pestañas editoriales */}
              <div className="inline-flex rounded-full border border-gz-rule overflow-hidden bg-white">
                {VIEW_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => switchToView(t.key)}
                    className={`font-ibm-mono text-[11px] uppercase tracking-[1.5px] px-4 py-1.5 transition-all cursor-pointer ${
                      view === t.key
                        ? "bg-gz-navy text-white"
                        : "text-gz-ink-mid hover:bg-gz-cream-dark/60 hover:text-gz-ink"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => openCreateModal()}
                className="group inline-flex items-center gap-2 rounded-full bg-gz-navy px-4 py-2 font-archivo text-[12px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors cursor-pointer shadow-sm"
              >
                <span className="font-cormorant text-[18px] leading-none -mt-px">+</span>
                <span>Nuevo evento</span>
              </button>
            </div>
          </div>

          {/* Linea 2: rule + chip rail con tipos */}
          {view === "month" && (
            <>
              <div className="mt-5 mb-3 h-px bg-gradient-to-r from-gz-rule via-gz-gold/30 to-transparent" />
              <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light shrink-0 mr-1">
                  Tipo
                </span>
                {TIPOS_FILTRO.map((t) => {
                  const isActive = tipoFiltro === t.key;
                  const tipoColor = t.key === "TODOS" ? "var(--gz-ink)" : (EVENT_COLORS[t.key] ?? EVENT_COLORS.personal);
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTipoFiltro(t.key)}
                      className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-ibm-mono text-[10px] uppercase tracking-[1px] transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? "border-transparent text-white shadow-sm"
                          : "border-gz-rule text-gz-ink-mid bg-white hover:border-gz-gold/60"
                      }`}
                      style={isActive ? { backgroundColor: tipoColor } : undefined}
                    >
                      <span className={`text-[12px] leading-none ${isActive ? "" : ""}`} style={{ color: isActive ? "#fff" : tipoColor }}>{t.glyph}</span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gz-gold border-t-transparent" />
          </div>
        )}

        {/* ═══ YEAR VIEW ═══ */}
        {view === "year" && <YearView year={year} yearEvents={yearEvents} yearActividad={yearActividad} onMonthClick={goToMonth} onDayClick={goToDay} />}

        {/* ═══ MONTH VIEW ═══ */}
        {view === "month" && (
          <>
            <div ref={gridRef} className="rounded-[6px] border border-gz-rule bg-white overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_4px_18px_-12px_rgba(15,15,15,0.18)]">
              {/* Cabecera de días con acento dominical */}
              <div className="grid grid-cols-7 border-b border-gz-rule bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
                {DAYS_ES.map((d, idx) => (
                  <div
                    key={d}
                    className={`py-2.5 text-center font-ibm-mono text-[10px] uppercase tracking-[2px] ${
                      idx >= 5 ? "text-gz-burgundy/70" : "text-gz-ink-light"
                    } ${idx > 0 ? "border-l border-gz-rule/60" : ""}`}
                  >
                    {d}
                  </div>
                ))}
              </div>
              <MonthGrid
                year={year}
                month={month}
                selectedDay={selectedDay}
                events={events.filter((e) => tipoFiltro === "TODOS" || e.eventType === tipoFiltro)}
                actividadMes={actividadMes}
                onDayClick={(day) => {
                  const isSame = selectedDay === day;
                  setSelectedDay(isSame ? null : day);
                  setQuickInput("");
                  if (!isSame) {
                    const ds = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    fetchActividadDia(ds);
                  }
                }}
                onDayDoubleClick={(day) => goToDay(year, month, day)}
                onEditEvent={openEditModal}
                quickInput={quickInput}
                quickLoading={quickLoading}
                onQuickInputChange={setQuickInput}
                onQuickAdd={handleQuickAdd}
                onCloseDetail={() => setSelectedDay(null)}
              />
            </div>

            {/* ─── Bitácora del día seleccionado ─── */}
            {selectedDay !== null && (
              <DayActivityPanel
                year={year}
                month={month}
                day={selectedDay}
                actividadDia={actividadDia}
                events={events.filter((e) => {
                  const d = new Date(e.startDate);
                  return d.getDate() === selectedDay && d.getMonth() + 1 === month && d.getFullYear() === year;
                })}
                onEditEvent={openEditModal}
                onCreateEvent={() => openCreateModal(selectedDay)}
                onClose={() => setSelectedDay(null)}
                onJumpToDay={() => goToDay(year, month, selectedDay)}
              />
            )}

            {/* Leyenda */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-ibm-mono text-[10px] text-gz-ink-light">
              {EVENT_TYPE_OPTIONS.map((t) => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[t.value] ?? EVENT_COLORS.personal }} />
                  <span><span className="mr-1" style={{ color: EVENT_COLORS[t.value] ?? EVENT_COLORS.personal }}>{t.glyph}</span>{t.label}</span>
                </div>
              ))}
              <span className="ml-auto inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-3 rounded-full bg-gz-gold/60" />
                XP del día
              </span>
            </div>
          </>
        )}

        {/* ═══ DAY VIEW ═══ */}
        {view === "day" && (
          <DayView
            events={getEventsForDate(dayDate)}
            actividadDia={actividadDia}
            onEditEvent={openEditModal}
            onCreateEvent={() => openCreateModal(dayDate.getDate())}
            quickInput={quickInput}
            quickLoading={quickLoading}
            onQuickInputChange={setQuickInput}
            onQuickAdd={handleQuickAdd}
            onBackToMonth={() => { setView("month"); }}
          />
        )}

        </div>{/* end calendar flex-1 */}

        {/* ─── Sidebar ───────────────────────────────── */}
        <aside className="hidden lg:block w-[280px] shrink-0">
          <div className="sticky top-[72px] space-y-5">
            {/* Streak card */}
            <div className="rounded-[4px] border border-gz-rule bg-white p-4">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">Racha de estudio</p>
              <div className="flex items-baseline gap-2">
                <span className="font-cormorant text-[36px] font-bold leading-none" style={{ color: streak > 0 ? "var(--gz-gold)" : "var(--gz-ink-light)" }}>
                  {streak}
                </span>
                <span className="font-archivo text-[13px] text-gz-ink-mid">
                  {streak === 1 ? "día" : "días"} {streak > 0 ? "🔥" : ""}
                </span>
              </div>
              {bestStreak > 0 && (
                <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-1">
                  Mejor racha: {bestStreak} días
                </p>
              )}
            </div>

            {/* Today XP summary */}
            {actividadDia && isTodayCheck(
              parseInt(actividadDia.fecha.split("-")[0]),
              parseInt(actividadDia.fecha.split("-")[1]),
              parseInt(actividadDia.fecha.split("-")[2])
            ) && actividadDia.totalXp > 0 && (
              <div className="rounded-[4px] border border-gz-rule bg-white p-4">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">XP hoy</p>
                <p className="font-cormorant text-[28px] font-bold leading-none text-gz-ink">
                  +{actividadDia.totalXp} <span className="font-archivo text-[12px] font-normal text-gz-ink-light">XP</span>
                </p>
                {Object.keys(actividadDia.porDetalle).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(actividadDia.porDetalle).slice(0, 5).map(([detalle, xp]) => (
                      <div key={detalle} className="flex items-center justify-between">
                        <span className="font-archivo text-[11px] text-gz-ink-mid truncate">
                          {DETALLE_ICONS[detalle] ?? "📊"} {detalle}
                        </span>
                        <span className="font-ibm-mono text-[10px] text-gz-gold">+{xp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <CountdownsSidebar initialCountdowns={initialCountdowns} />
          </div>
        </aside>
        </div>{/* end flex row */}
      </div>

      {/* ─── Event Modal ──────────────────────────────── */}
      {modalOpen && (
        <EventModal
          editing={editingEvent}
          formTitle={formTitle} setFormTitle={setFormTitle}
          formType={formType} setFormType={setFormType}
          formStartDate={formStartDate} setFormStartDate={setFormStartDate}
          formStartTime={formStartTime} setFormStartTime={setFormStartTime}
          formEndDate={formEndDate} setFormEndDate={setFormEndDate}
          formEndTime={formEndTime} setFormEndTime={setFormEndTime}
          formAllDay={formAllDay} setFormAllDay={setFormAllDay}
          formDescription={formDescription} setFormDescription={setFormDescription}
          formLocation={formLocation} setFormLocation={setFormLocation}
          formUrl={formUrl} setFormUrl={setFormUrl}
          formRecurrence={formRecurrence} setFormRecurrence={setFormRecurrence}
          formReminder={formReminder} setFormReminder={setFormReminder}
          formMateria={formMateria} setFormMateria={setFormMateria}
          formAttendees={formAttendees} setFormAttendees={setFormAttendees}
          saving={saving} deleting={deleting}
          onSave={handleSave} onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
        />
      )}
    </main>
  );
}

// ═══════════════════════════════════════════════════════════
// YEAR VIEW
// ═══════════════════════════════════════════════════════════

function YearView({
  year,
  yearEvents,
  yearActividad,
  onMonthClick,
  onDayClick,
}: {
  year: number;
  yearEvents: Record<string, boolean>;
  yearActividad: Record<string, { totalXp: number; actividades: number }>;
  onMonthClick: (m: number) => void;
  onDayClick: (y: number, m: number, d: number) => void;
}) {
  // Calculate max XP for heatmap scaling
  const maxXp = Math.max(1, ...Object.values(yearActividad).map((a) => a.totalXp));

  function getHeatColor(xp: number): string {
    if (xp <= 0) return "transparent";
    const intensity = Math.min(1, xp / maxXp);
    if (intensity < 0.25) return "rgba(154, 114, 48, 0.15)";
    if (intensity < 0.5) return "rgba(154, 114, 48, 0.3)";
    if (intensity < 0.75) return "rgba(154, 114, 48, 0.5)";
    return "rgba(154, 114, 48, 0.75)";
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const daysInMonth = getDaysInMonth(year, m);
        const firstDay = getFirstDayOfWeek(year, m);

        return (
          <button
            key={m}
            onClick={() => onMonthClick(m)}
            className="rounded-[4px] border border-gz-rule bg-white p-3 hover:border-gz-gold transition-colors text-left"
          >
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
              {MONTHS_ES_SHORT[i]}
            </p>
            {/* Mini grid */}
            <div className="grid grid-cols-7 gap-px">
              {/* Day headers */}
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <div key={d} className="text-center text-[8px] text-gz-ink-light/50">{d}</div>
              ))}
              {/* Padding */}
              {Array.from({ length: firstDay }, (_, j) => (
                <div key={`p${j}`} />
              ))}
              {/* Days */}
              {Array.from({ length: daysInMonth }, (_, j) => {
                const day = j + 1;
                const hasEvent = yearEvents[`${year}-${m}-${day}`];
                const today = isTodayCheck(year, m, day);
                const dayKey = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayAct = yearActividad[dayKey];
                const heatBg = dayAct ? getHeatColor(dayAct.totalXp) : "transparent";

                return (
                  <div
                    key={day}
                    onClick={(e) => { e.stopPropagation(); onDayClick(year, m, day); }}
                    className={`flex items-center justify-center h-4 w-4 mx-auto rounded-full text-[8px] cursor-pointer ${
                      today ? "bg-gz-gold text-white font-bold" : hasEvent ? "text-gz-ink font-medium" : "text-gz-ink-light"
                    }`}
                    style={{ backgroundColor: today ? undefined : heatBg }}
                    title={dayAct ? `${dayAct.totalXp} XP` : undefined}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MONTH GRID (extracted from original)
// ═══════════════════════════════════════════════════════════

function MonthGrid({
  year, month, selectedDay, events, actividadMes,
  onDayClick, onDayDoubleClick, onEditEvent,
  quickInput, quickLoading, onQuickInputChange, onQuickAdd, onCloseDetail,
}: {
  year: number; month: number; selectedDay: number | null;
  events: CalendarEvent[];
  actividadMes: ActividadMes | null;
  onDayClick: (day: number) => void;
  onDayDoubleClick: (day: number) => void;
  onEditEvent: (e: CalendarEvent) => void;
  quickInput: string; quickLoading: boolean;
  onQuickInputChange: (v: string) => void;
  onQuickAdd: (e: React.FormEvent) => void;
  onCloseDetail: () => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1);

  const cells: { day: number; currentMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, currentMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, currentMonth: true });
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) for (let d = 1; d <= remaining; d++) cells.push({ day: d, currentMonth: false });

  // Compute streak days (consecutive days with activity)
  const streakDays = new Set<number>();
  if (actividadMes?.porDia) {
    const activeDays = new Set<number>();
    for (const key of Object.keys(actividadMes.porDia)) {
      const parts = key.split("-");
      const m = parseInt(parts[1]);
      const d = parseInt(parts[2]);
      if (m === month) activeDays.add(d);
    }
    // Find consecutive runs of 2+ days
    for (let d = 1; d <= daysInMonth; d++) {
      if (!activeDays.has(d)) continue;
      // Check if part of a streak (prev or next day also active)
      if (activeDays.has(d - 1) || activeDays.has(d + 1)) {
        streakDays.add(d);
      }
    }
  }

  function getEventsForDay(day: number) {
    return events.filter((e) => {
      const d = new Date(e.startDate);
      return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  }

  // Calcular max XP del mes para escalar el heat
  const maxXpMes = (() => {
    if (!actividadMes?.porDia) return 0;
    let max = 0;
    for (const d of Object.values(actividadMes.porDia)) if (d.totalXp > max) max = d.totalXp;
    return max;
  })();

  function getHeatBg(xp: number): string {
    if (xp <= 0 || maxXpMes <= 0) return "transparent";
    const intensity = Math.min(1, xp / maxXpMes);
    if (intensity < 0.25) return "rgba(154, 114, 48, 0.05)";
    if (intensity < 0.5) return "rgba(154, 114, 48, 0.10)";
    if (intensity < 0.75) return "rgba(154, 114, 48, 0.16)";
    return "rgba(154, 114, 48, 0.22)";
  }

  return (
    <div>
      {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => {
        const rowCells = cells.slice(rowIdx * 7, rowIdx * 7 + 7);
        const selectedInRow = rowCells.some((c) => c.currentMonth && selectedDay === c.day);
        const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

        return (
          <div key={rowIdx}>
            <div className="grid grid-cols-7">
              {rowCells.map((cell, colIdx) => {
                const dayEvents = cell.currentMonth ? getEventsForDay(cell.day) : [];
                const isSelected = cell.currentMonth && selectedDay === cell.day;
                const isTodayCell = cell.currentMonth && isTodayCheck(year, month, cell.day);
                const maxVisible = 3;
                const hiddenCount = Math.max(0, dayEvents.length - maxVisible);
                const dayKey = cell.currentMonth
                  ? `${year}-${String(month).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`
                  : "";
                const dayAct = cell.currentMonth ? actividadMes?.porDia?.[dayKey] : undefined;
                const heatBg = dayAct ? getHeatBg(dayAct.totalXp) : "transparent";
                const isWeekend = colIdx >= 5;
                const isStreak = cell.currentMonth && streakDays.has(cell.day);

                return (
                  <div
                    key={colIdx}
                    onClick={() => { if (cell.currentMonth) onDayClick(cell.day); }}
                    onDoubleClick={() => { if (cell.currentMonth) onDayDoubleClick(cell.day); }}
                    className={`group relative min-h-[100px] border-b border-r border-gz-cream-dark cursor-pointer transition-all duration-150 ${
                      cell.currentMonth
                        ? "hover:bg-gz-cream-dark/40 hover:shadow-[inset_0_0_0_1px_rgba(154,114,48,0.18)]"
                        : "opacity-30 bg-gz-cream-dark/[0.15]"
                    } ${
                      isSelected ? "bg-gz-gold/[0.08] !shadow-[inset_0_0_0_1.5px_var(--gz-gold)]" : ""
                    } ${isWeekend && cell.currentMonth ? "bg-gz-cream-dark/[0.18]" : ""}`}
                    style={{
                      backgroundImage:
                        !isSelected && cell.currentMonth && heatBg !== "transparent"
                          ? `linear-gradient(180deg, ${heatBg} 0%, transparent 65%)`
                          : undefined,
                    }}
                  >
                    {/* Today rail (top accent) */}
                    {isTodayCell && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gz-burgundy" />
                    )}
                    {/* Streak rail (left accent) */}
                    {isStreak && !isSelected && (
                      <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gz-gold/70" />
                    )}

                    <div className="flex items-start justify-between p-1.5">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full font-cormorant text-[15px] leading-none transition-colors ${
                          isTodayCell
                            ? "bg-gz-burgundy text-white font-bold shadow-sm"
                            : isSelected
                            ? "bg-gz-gold text-white font-bold"
                            : "text-gz-ink"
                        } ${!cell.currentMonth ? "!text-gz-ink-light/40" : ""}`}
                      >
                        {cell.day}
                      </span>
                      {cell.currentMonth && dayAct && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full bg-gz-gold/15 px-1.5 py-0.5 font-ibm-mono text-[9px] font-semibold text-gz-gold leading-none"
                          title={`${dayAct.totalXp} XP · ${dayAct.actividades} actividades`}
                        >
                          +{dayAct.totalXp}
                        </span>
                      )}
                    </div>
                    {cell.currentMonth && (
                      <div className="px-1.5 pb-1.5 space-y-1">
                        {dayEvents.slice(0, maxVisible).map((ev) => {
                          const c = EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal;
                          return (
                            <div
                              key={ev.id}
                              className="flex items-center gap-1 rounded-[3px] pl-1 pr-1.5 py-0.5 font-archivo text-[10px] font-medium truncate border-l-[2px] bg-white/70"
                              style={{ borderLeftColor: c, color: c }}
                              title={ev.title}
                            >
                              <span className="shrink-0 font-cormorant text-[12px] leading-none">
                                {EVENT_ICONS[ev.eventType] ?? "•"}
                              </span>
                              <span className="truncate text-gz-ink">{ev.title}</span>
                              {!ev.allDay && (
                                <span className="ml-auto shrink-0 font-ibm-mono text-[8px] text-gz-ink-light">
                                  {formatTime(ev.startDate).slice(0, 5)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {hiddenCount > 0 && (
                          <div className="font-ibm-mono text-[9px] text-gz-ink-light pl-1.5 italic">
                            +{hiddenCount} más
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detail strip — solo el quick-add inline (la bitácora completa va abajo del grid) */}
            {selectedInRow && selectedDay && (
              <div className="border-b border-gz-rule bg-gz-cream-dark/30 px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <h4 className="font-cormorant text-[15px] font-bold text-gz-ink shrink-0">
                      {selectedDay} {MONTHS_ES[month - 1]}
                    </h4>
                    {selectedDayEvents.length > 0 ? (
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {selectedDayEvents.slice(0, 3).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={() => onEditEvent(ev)}
                            className="inline-flex items-center gap-1 rounded-full bg-white border border-gz-rule pl-1 pr-2.5 py-0.5 font-archivo text-[11px] hover:border-gz-gold/60 transition-colors cursor-pointer shrink-0"
                            title={ev.title}
                          >
                            <span
                              className="font-cormorant text-[12px] leading-none"
                              style={{ color: EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal }}
                            >
                              {EVENT_ICONS[ev.eventType] ?? "•"}
                            </span>
                            <span className="truncate max-w-[120px] text-gz-ink">{ev.title}</span>
                            {!ev.allDay && (
                              <span className="font-ibm-mono text-[9px] text-gz-ink-light ml-0.5">
                                {formatTime(ev.startDate)}
                              </span>
                            )}
                          </button>
                        ))}
                        {selectedDayEvents.length > 3 && (
                          <span className="font-ibm-mono text-[10px] text-gz-ink-light shrink-0">
                            +{selectedDayEvents.length - 3} más
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="font-cormorant italic text-[12px] text-gz-ink-light">
                        Sin eventos
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <form onSubmit={onQuickAdd} className="flex gap-2">
                      <input
                        type="text"
                        value={quickInput}
                        onChange={(e) => onQuickInputChange(e.target.value)}
                        placeholder="＋ Evento rápido..."
                        className="w-44 rounded-full border border-gz-rule bg-white px-3 py-1 font-archivo text-[11px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
                        disabled={quickLoading}
                        autoFocus
                      />
                      {quickInput.trim() && (
                        <button
                          type="submit"
                          disabled={quickLoading}
                          className="rounded-full bg-gz-navy px-3 py-1 font-archivo text-[11px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {quickLoading ? "..." : "Agregar"}
                        </button>
                      )}
                    </form>
                    <button
                      onClick={onCloseDetail}
                      className="text-gz-ink-light hover:text-gz-ink-mid transition-colors cursor-pointer"
                      aria-label="Cerrar"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DAY ACTIVITY PANEL — bitácora del día seleccionado en vista mensual
// ═══════════════════════════════════════════════════════════

function DayActivityPanel({
  year, month, day, actividadDia, events,
  onEditEvent, onCreateEvent, onClose, onJumpToDay,
}: {
  year: number;
  month: number;
  day: number;
  actividadDia: ActividadDia | null;
  events: CalendarEvent[];
  onEditEvent: (e: CalendarEvent) => void;
  onCreateEvent: () => void;
  onClose: () => void;
  onJumpToDay: () => void;
}) {
  const dateObj = new Date(year, month - 1, day);
  const dow = getISODayOfWeek(dateObj);
  const isToday = isTodayCheck(year, month, day);
  const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const matchesActividad = actividadDia?.fecha === dayKey;

  // Time-of-day events (sorted)
  const sortedEvents = [...events].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const totalXp = matchesActividad ? actividadDia!.totalXp : 0;
  const totalAct = matchesActividad ? actividadDia!.totalActividades : 0;
  const porMateria = matchesActividad ? actividadDia!.porMateria : {};
  const logs = matchesActividad ? actividadDia!.logs : [];

  return (
    <div className="mt-5 rounded-[6px] border border-gz-rule bg-white overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_4px_18px_-12px_rgba(15,15,15,0.18)]">
      {/* Header con rail editorial */}
      <div className="relative border-b border-gz-rule px-5 py-4">
        <div className="absolute top-0 left-0 h-full w-[3px] bg-gz-gold" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
              {isToday ? "Hoy · " : ""}{DAYS_ES_FULL[dow]}
            </p>
            <h3 className="font-cormorant text-[26px] font-bold text-gz-ink leading-tight">
              {day} de {MONTHS_ES[month - 1]}
              <span className="font-archivo text-[14px] font-normal text-gz-ink-light ml-2">{year}</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onJumpToDay}
              className="hidden sm:inline-flex font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors cursor-pointer"
            >
              Vista día →
            </button>
            <button
              onClick={onCreateEvent}
              className="inline-flex items-center gap-1.5 rounded-full bg-gz-navy px-3 py-1.5 font-archivo text-[11px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors cursor-pointer"
            >
              <span className="font-cormorant text-[15px] leading-none -mt-px">+</span>
              Evento
            </button>
            <button
              onClick={onClose}
              className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer"
              aria-label="Cerrar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* KPIs */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <div className="flex items-baseline gap-1">
            <span className="font-cormorant text-[28px] font-bold text-gz-gold leading-none">+{totalXp}</span>
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">XP</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-cormorant text-[20px] font-bold text-gz-ink leading-none">{totalAct}</span>
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">actividades</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-cormorant text-[20px] font-bold text-gz-ink leading-none">{events.length}</span>
            <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">eventos</span>
          </div>
        </div>
      </div>

      {/* Body — dos columnas: eventos | bitácora XP */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gz-cream-dark">
        {/* COL 1 — Eventos */}
        <div className="p-5">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-3 flex items-center gap-2">
            <span>Eventos del día</span>
            <span className="flex-1 h-px bg-gz-rule/60" />
          </p>
          {sortedEvents.length === 0 ? (
            <div className="rounded-[4px] border border-dashed border-gz-rule bg-gz-cream-dark/20 px-4 py-6 text-center">
              <p className="font-cormorant italic text-[13px] text-gz-ink-light mb-2">
                Día sin eventos programados
              </p>
              <button
                onClick={onCreateEvent}
                className="font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors cursor-pointer"
              >
                + Agregar el primero
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEvents.map((ev) => {
                const c = EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal;
                return (
                  <div
                    key={ev.id}
                    onClick={() => onEditEvent(ev)}
                    className="group relative flex items-start gap-3 rounded-[4px] border border-gz-rule bg-white pl-4 pr-3 py-2.5 cursor-pointer hover:border-gz-gold/50 hover:shadow-sm transition-all"
                  >
                    <div
                      className="absolute top-0 bottom-0 left-0 w-[3px] rounded-l-[4px]"
                      style={{ backgroundColor: c }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-cormorant text-[16px] leading-none -mt-0.5"
                          style={{ color: c }}
                        >
                          {EVENT_ICONS[ev.eventType] ?? "•"}
                        </span>
                        <span className="font-archivo text-[13px] font-semibold text-gz-ink truncate">
                          {ev.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-ibm-mono text-[10px] text-gz-ink-light">
                        <span>
                          {ev.allDay
                            ? "Todo el día"
                            : `${formatTime(ev.startDate)}${ev.endDate ? ` – ${formatTime(ev.endDate)}` : ""}`}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-0.5 truncate max-w-[180px]">
                            <span>📍</span>
                            <span className="truncate">{ev.location}</span>
                          </span>
                        )}
                        {ev.materia && (
                          <span className="flex items-center gap-0.5">
                            <span className="font-archivo">·</span> {ev.materia}
                          </span>
                        )}
                        {ev.recurrence && ev.recurrence !== "none" && (
                          <span>↻ {RECURRENCE_LABELS[ev.recurrence] ?? ev.recurrence}</span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="mt-1.5 font-archivo text-[11px] text-gz-ink-mid line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                    </div>
                    <svg className="h-3.5 w-3.5 text-gz-ink-light/40 group-hover:text-gz-gold transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COL 2 — Bitácora XP */}
        <div className="p-5">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-3 flex items-center gap-2">
            <span>Bitácora de puntos</span>
            <span className="flex-1 h-px bg-gz-rule/60" />
          </p>
          {totalXp <= 0 ? (
            <div className="rounded-[4px] border border-dashed border-gz-rule bg-gz-cream-dark/20 px-4 py-6 text-center">
              <p className="font-cormorant italic text-[13px] text-gz-ink-light">
                {isToday
                  ? "Aún sin actividad registrada hoy"
                  : "Sin actividad registrada este día"}
              </p>
            </div>
          ) : (
            <>
              {/* Por materia */}
              {Object.keys(porMateria).length > 0 && (
                <div className="mb-4">
                  <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1.5">
                    Por materia
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(porMateria)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([materia, xp]) => {
                        const pct = Math.round((xp / Math.max(1, totalXp)) * 100);
                        return (
                          <div key={materia}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-archivo text-[11px] text-gz-ink-mid truncate">
                                {materia}
                              </span>
                              <span className="font-ibm-mono text-[10px] text-gz-gold shrink-0 ml-2">
                                +{xp}
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-gz-cream-dark overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-gz-gold/50 to-gz-gold transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Log cronológico */}
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1.5">
                Cronología
              </p>
              <div className="max-h-[260px] overflow-y-auto pr-1 -mr-1 space-y-1">
                {logs.slice(0, 30).map((log) => {
                  const t = new Date(log.createdAt);
                  const hh = String(t.getHours()).padStart(2, "0");
                  const mm = String(t.getMinutes()).padStart(2, "0");
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-2 py-1 border-b border-gz-cream-dark/40 last:border-b-0"
                    >
                      <span className="font-ibm-mono text-[9px] text-gz-ink-light w-9 shrink-0">
                        {hh}:{mm}
                      </span>
                      <span className="font-cormorant text-[14px] leading-none -mt-0.5 shrink-0 w-4 text-center">
                        {DETALLE_ICONS[log.detalle ?? ""] ?? "•"}
                      </span>
                      <span className="flex-1 font-archivo text-[11px] text-gz-ink-mid truncate">
                        {log.detalle ?? CATEGORY_LABELS[log.category] ?? log.category}
                        {log.materia && (
                          <span className="text-gz-ink-light"> · {log.materia}</span>
                        )}
                      </span>
                      <span
                        className={`font-ibm-mono text-[10px] font-semibold shrink-0 ${
                          log.amount >= 0 ? "text-gz-gold" : "text-gz-burgundy"
                        }`}
                      >
                        {log.amount >= 0 ? "+" : ""}{log.amount}
                      </span>
                    </div>
                  );
                })}
                {logs.length > 30 && (
                  <p className="font-ibm-mono text-[9px] text-gz-ink-light italic pt-1">
                    +{logs.length - 30} entradas más…
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DAY VIEW
// ═══════════════════════════════════════════════════════════

function DayView({
  events, actividadDia, onEditEvent, onCreateEvent,
  quickInput, quickLoading, onQuickInputChange, onQuickAdd, onBackToMonth,
}: {
  events: CalendarEvent[];
  actividadDia: ActividadDia | null;
  onEditEvent: (e: CalendarEvent) => void;
  onCreateEvent: () => void;
  quickInput: string; quickLoading: boolean;
  onQuickInputChange: (v: string) => void;
  onQuickAdd: (e: React.FormEvent) => void;
  onBackToMonth: () => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i); // 00:00 to 23:00

  // All-day events
  const allDayEvents = events.filter((e) => e.allDay);
  // Timed events
  const timedEvents = events.filter((e) => !e.allDay);

  function getEventHour(e: CalendarEvent) {
    return new Date(e.startDate).getHours();
  }

  function getEventEndHour(e: CalendarEvent) {
    if (e.endDate) return new Date(e.endDate).getHours();
    return getEventHour(e) + 1;
  }

  return (
    <div className="space-y-4">
      {/* ─── Bitácora de actividad ─── */}
      {actividadDia && actividadDia.totalXp > 0 && (
        <div className="rounded-[4px] border border-gz-rule bg-white overflow-hidden">
          <div className="border-b border-gz-rule px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">Bitácora de actividad</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-cormorant text-[20px] font-bold text-gz-gold">+{actividadDia.totalXp} XP</span>
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">{actividadDia.totalActividades} actividades</span>
            </div>
          </div>

          {/* Desglose por materia */}
          {Object.keys(actividadDia.porMateria).length > 0 && (
            <div className="border-b border-gz-cream-dark px-4 py-3">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-2">Por materia</p>
              <div className="space-y-1.5">
                {Object.entries(actividadDia.porMateria)
                  .sort(([, a], [, b]) => b - a)
                  .map(([materia, xp]) => {
                    const pct = Math.round((xp / Math.max(1, actividadDia.totalXp)) * 100);
                    return (
                      <div key={materia}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-archivo text-[11px] text-gz-ink-mid truncate">{materia}</span>
                          <span className="font-ibm-mono text-[10px] text-gz-gold shrink-0 ml-2">+{xp} XP</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gz-cream-dark overflow-hidden">
                          <div className="h-full rounded-full bg-gz-gold/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Log por hora (solo horas con actividad) */}
          <div className="divide-y divide-gz-cream-dark max-h-[300px] overflow-y-auto">
            {Object.entries(actividadDia.porHora)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([hora, data]) => (
                <div key={hora} className="flex items-start px-4 py-2">
                  <div className="w-12 shrink-0 font-ibm-mono text-[10px] text-gz-ink-light pt-0.5">
                    {String(hora).padStart(2, "0")}:00
                  </div>
                  <div className="flex-1 space-y-0.5">
                    {data.logs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between">
                        <span className="font-archivo text-[11px] text-gz-ink-mid">
                          {DETALLE_ICONS[log.detalle ?? ""] ?? CATEGORY_LABELS[log.category] ?? "📊"}{" "}
                          {log.detalle ?? CATEGORY_LABELS[log.category] ?? log.category}
                          {log.materia && <span className="text-gz-ink-light"> · {log.materia}</span>}
                        </span>
                        <span className={`font-ibm-mono text-[10px] shrink-0 ml-2 ${log.amount >= 0 ? "text-gz-gold" : "text-gz-burgundy"}`}>
                          {log.amount >= 0 ? "+" : ""}{log.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="w-12 shrink-0 text-right font-ibm-mono text-[10px] text-gz-ink-light pt-0.5">
                    {data.totalXp > 0 ? `+${data.totalXp}` : data.totalXp}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── Calendar timeline ─── */}
      <div className="rounded-[4px] border border-gz-rule bg-white overflow-hidden">
        {/* Back to month */}
        <div className="flex items-center justify-between border-b border-gz-rule px-4 py-2">
          <button onClick={onBackToMonth} className="font-archivo text-[12px] text-gz-ink-mid hover:text-gz-gold transition-colors">
            ← Volver al mes
          </button>
          <button onClick={onCreateEvent} className="font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors">
            + Evento
          </button>
        </div>

        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="border-b border-gz-rule px-4 py-2 bg-gz-cream-dark/20">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Todo el día</p>
            <div className="space-y-1">
              {allDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onEditEvent(ev)}
                  className="flex items-center gap-2 rounded-[3px] px-2 py-1 cursor-pointer hover:bg-white transition-colors"
                  style={{ backgroundColor: `${EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal}15` }}
                >
                  <span className="text-[10px]">{EVENT_ICONS[ev.eventType] ?? "📌"}</span>
                  <span className="font-archivo text-[12px] font-medium text-gz-ink truncate">{ev.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hour timeline */}
        <div className="divide-y divide-gz-cream-dark">
          {hours.map((hour) => {
            const hourEvents = timedEvents.filter((e) => {
              const start = getEventHour(e);
              const end = getEventEndHour(e);
              return hour >= start && hour < end;
            });
            const hourAct = actividadDia?.porHora?.[hour];

            return (
              <div key={hour} className="flex items-start">
                <div className="w-14 shrink-0 py-2 pr-2 text-right font-ibm-mono text-[10px] text-gz-ink-light">
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className={`flex-1 min-h-[40px] border-l border-gz-cream-dark py-1 px-2 ${hourAct ? "bg-gz-gold/[0.04]" : ""}`}>
                  {hourEvents
                    .filter((e) => getEventHour(e) === hour)
                    .map((ev) => {
                      const span = getEventEndHour(ev) - getEventHour(ev);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => onEditEvent(ev)}
                          className="rounded-[3px] border-l-2 px-3 py-1.5 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            borderLeftColor: EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal,
                            backgroundColor: `${EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal}10`,
                            minHeight: span > 1 ? `${span * 40 - 8}px` : undefined,
                          }}
                        >
                          <span className="font-archivo text-[12px] font-medium text-gz-ink">{EVENT_ICONS[ev.eventType] ?? "📌"} {ev.title}</span>
                          <span className="block font-ibm-mono text-[10px] text-gz-ink-light">
                            {formatTime(ev.startDate)}{ev.endDate ? ` – ${formatTime(ev.endDate)}` : ""}
                          </span>
                        </div>
                      );
                    })}
                  {/* Activity indicator in hour slot */}
                  {hourAct && hourEvents.filter((e) => getEventHour(e) === hour).length === 0 && (
                    <div className="font-ibm-mono text-[9px] text-gz-gold/70 py-1">
                      ⚡ {hourAct.totalXp} XP · {hourAct.logs.length} act.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick add */}
        <div className="border-t border-gz-rule px-4 py-3">
          <form onSubmit={onQuickAdd} className="flex gap-2">
            <input type="text" value={quickInput} onChange={(e) => onQuickInputChange(e.target.value)} placeholder="＋ Agregar evento rápido..." className="flex-1 rounded-[3px] border border-gz-rule bg-white px-3 py-1.5 font-archivo text-[12px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none" disabled={quickLoading} />
            {quickInput.trim() && (
              <button type="submit" disabled={quickLoading} className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50 transition-colors">
                {quickLoading ? "..." : "Agregar"}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EVENT MODAL (extracted)
// ═══════════════════════════════════════════════════════════

function EventModal({
  editing,
  formTitle, setFormTitle, formType, setFormType,
  formStartDate, setFormStartDate, formStartTime, setFormStartTime,
  formEndDate, setFormEndDate, formEndTime, setFormEndTime,
  formAllDay, setFormAllDay, formDescription, setFormDescription,
  formLocation, setFormLocation, formUrl, setFormUrl,
  formRecurrence, setFormRecurrence, formReminder, setFormReminder,
  formMateria, setFormMateria, formAttendees, setFormAttendees,
  saving, deleting, onSave, onDelete, onClose,
}: {
  editing: CalendarEvent | null;
  formTitle: string; setFormTitle: (v: string) => void;
  formType: string; setFormType: (v: string) => void;
  formStartDate: string; setFormStartDate: (v: string) => void;
  formStartTime: string; setFormStartTime: (v: string) => void;
  formEndDate: string; setFormEndDate: (v: string) => void;
  formEndTime: string; setFormEndTime: (v: string) => void;
  formAllDay: boolean; setFormAllDay: (v: boolean) => void;
  formDescription: string; setFormDescription: (v: string) => void;
  formLocation: string; setFormLocation: (v: string) => void;
  formUrl: string; setFormUrl: (v: string) => void;
  formRecurrence: string; setFormRecurrence: (v: string) => void;
  formReminder: number | null; setFormReminder: (v: number | null) => void;
  formMateria: string; setFormMateria: (v: string) => void;
  formAttendees: string; setFormAttendees: (v: string) => void;
  saving: boolean; deleting: boolean;
  onSave: () => void; onDelete: () => void; onClose: () => void;
}) {
  const tipoColor = EVENT_COLORS[formType] ?? EVENT_COLORS.personal;

  // Pequeño helper estilístico para input bases
  const inputCls =
    "w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30 transition-colors";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-[6px] border border-gz-rule shadow-[0_8px_32px_-8px_rgba(15,15,15,0.25)] overflow-hidden my-8"
        style={{ backgroundColor: "var(--gz-cream)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rail superior con color del tipo */}
        <div className="h-[4px] w-full" style={{ backgroundColor: tipoColor }} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-6 py-4 bg-white">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full font-cormorant text-[20px] leading-none"
              style={{ backgroundColor: `${tipoColor}18`, color: tipoColor }}
            >
              {EVENT_ICONS[formType] ?? "•"}
            </span>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                {editing ? "Editando" : "Nuevo registro"}
              </p>
              <h3 className="font-cormorant text-[22px] font-bold text-gz-ink leading-none">
                {editing ? "Editar evento" : "Crear evento"}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — secciones */}
        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* ─── Sección: Título + Tipo ─── */}
          <div>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full border-0 border-b border-gz-rule bg-transparent pb-2 font-cormorant text-[24px] font-bold text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-0 transition-colors"
              placeholder="Título del evento"
              autoFocus
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mr-1">
                Tipo
              </span>
              {EVENT_TYPE_OPTIONS.map((opt) => {
                const isActive = formType === opt.value;
                const c = EVENT_COLORS[opt.value] ?? EVENT_COLORS.personal;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormType(opt.value)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-ibm-mono text-[10px] uppercase tracking-[1px] transition-all cursor-pointer ${
                      isActive
                        ? "border-transparent text-white shadow-sm"
                        : "border-gz-rule text-gz-ink-mid bg-white hover:border-gz-gold/60"
                    }`}
                    style={isActive ? { backgroundColor: c } : undefined}
                  >
                    <span
                      className="font-cormorant text-[12px] leading-none"
                      style={{ color: isActive ? "#fff" : c }}
                    >
                      {opt.glyph}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Sección: Cuándo ─── */}
          <SectionBlock title="Cuándo" tipoColor={tipoColor}>
            <div className="rounded-[4px] border border-gz-rule bg-white px-4 py-3 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-archivo text-[13px] text-gz-ink">Todo el día</span>
                <span
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    formAllDay ? "bg-gz-gold" : "bg-gz-rule"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formAllDay}
                    onChange={(e) => setFormAllDay(e.target.checked)}
                    className="sr-only"
                  />
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      formAllDay ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
                <div>
                  <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                    Comienza
                  </label>
                  <div className={`grid ${formAllDay ? "grid-cols-1" : "grid-cols-[1fr_auto]"} gap-2`}>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className={inputCls}
                      style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                    {!formAllDay && (
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className={`${inputCls} w-[105px]`}
                        style={{ backgroundColor: "var(--gz-cream)" }}
                      />
                    )}
                  </div>
                </div>

                <span className="hidden sm:flex pb-2 font-cormorant text-[18px] text-gz-ink-light leading-none">
                  →
                </span>

                <div>
                  <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                    Termina
                  </label>
                  <div className={`grid ${formAllDay ? "grid-cols-1" : "grid-cols-[1fr_auto]"} gap-2`}>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className={inputCls}
                      style={{ backgroundColor: "var(--gz-cream)" }}
                      placeholder="—"
                    />
                    {!formAllDay && (
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className={`${inputCls} w-[105px]`}
                        style={{ backgroundColor: "var(--gz-cream)" }}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                    Repetir
                  </label>
                  <select
                    value={formRecurrence}
                    onChange={(e) => setFormRecurrence(e.target.value)}
                    className={inputCls}
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                    Aviso
                  </label>
                  <select
                    value={formReminder ?? ""}
                    onChange={(e) =>
                      setFormReminder(e.target.value === "" ? null : parseInt(e.target.value))
                    }
                    className={inputCls}
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={String(opt.value)} value={opt.value ?? ""}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </SectionBlock>

          {/* ─── Sección: Dónde ─── */}
          <SectionBlock title="Dónde" tipoColor={tipoColor}>
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gz-ink-light">📍</span>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className={`${inputCls} pl-9`}
                  style={{ backgroundColor: "var(--gz-cream)" }}
                  placeholder="Agregar ubicación, sala o llamada de video"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gz-ink-light">🔗</span>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className={`${inputCls} pl-9`}
                  style={{ backgroundColor: "var(--gz-cream)" }}
                  placeholder="URL relacionada (lectura, expediente, sentencia…)"
                />
              </div>
            </div>
          </SectionBlock>

          {/* ─── Sección: Quién / Materia ─── */}
          <SectionBlock title="Quién" tipoColor={tipoColor}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                  Materia jurídica
                </label>
                <input
                  type="text"
                  value={formMateria}
                  onChange={(e) => setFormMateria(e.target.value)}
                  className={inputCls}
                  style={{ backgroundColor: "var(--gz-cream)" }}
                  placeholder="Ej: Civil, Penal, Constitucional…"
                />
              </div>
              <div>
                <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                  Invitados
                </label>
                <input
                  type="text"
                  value={formAttendees}
                  onChange={(e) => setFormAttendees(e.target.value)}
                  className={inputCls}
                  style={{ backgroundColor: "var(--gz-cream)" }}
                  placeholder="Nombres o emails separados por coma"
                />
              </div>
            </div>
          </SectionBlock>

          {/* ─── Sección: Notas ─── */}
          <SectionBlock title="Notas" tipoColor={tipoColor}>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
              className={`${inputCls} resize-none`}
              style={{ backgroundColor: "var(--gz-cream)" }}
              placeholder="Detalles, observaciones, agenda interna…"
            />
          </SectionBlock>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gz-rule px-6 py-3 bg-white">
          <div>
            {editing && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="rounded-[3px] border border-gz-burgundy/30 px-4 py-1.5 font-archivo text-[12px] font-medium text-gz-burgundy hover:bg-gz-burgundy/[0.06] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-[3px] border border-gz-rule px-4 py-1.5 font-archivo text-[12px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving || !formTitle.trim() || !formStartDate}
              className="rounded-[3px] bg-gz-navy px-5 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear evento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section helper ────────────────────────────────────────

function SectionBlock({
  title,
  tipoColor,
  children,
}: {
  title: string;
  tipoColor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tipoColor }} />
        <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-mid">
          {title}
        </p>
        <span className="flex-1 h-px bg-gz-rule/60" />
      </div>
      {children}
    </div>
  );
}
