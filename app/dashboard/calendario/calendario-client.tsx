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
  { value: "estudio", label: "Sesión de estudio", icon: "📚" },
  { value: "causa", label: "Causa programada", icon: "⚔️" },
  { value: "ayudantia", label: "Ayudantía", icon: "🏛️" },
  { value: "seminario", label: "Seminario / Conferencia", icon: "🎓" },
  { value: "personal", label: "Personal", icon: "📌" },
];

const EVENT_COLORS: Record<string, string> = {
  estudio: "var(--accent)",
  causa: "#C0392B",
  ayudantia: "#1A5C3A",
  seminario: "#1e4080",
  personal: "var(--text-muted)",
};

const EVENT_ICONS: Record<string, string> = {
  estudio: "📚",
  causa: "⚔️",
  ayudantia: "🏛️",
  seminario: "🎓",
  personal: "📌",
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
      const payload = { title: formTitle.trim(), eventType: formType, startDate, endDate, allDay: formAllDay, description: formDescription.trim() || undefined };

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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex gap-6">
        {/* ─── Calendar content ──────────────────────── */}
        <div className="min-w-0 flex-1">

        {/* ─── Header ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={handlePrev} className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink min-w-[180px] text-center">
              {getHeaderLabel()}
            </h2>
            <button onClick={handleNext} className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* View tabs */}
            <div className="flex gap-1">
              {VIEW_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => switchToView(t.key)}
                  className={`font-ibm-mono text-[11px] uppercase tracking-[1px] px-3 py-1.5 rounded-[3px] border transition-colors ${
                    view === t.key
                      ? "bg-gz-navy text-white border-gz-navy"
                      : "text-gz-ink-mid border-gz-rule hover:border-gz-gold"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => openCreateModal()}
              className="flex items-center gap-2 rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
            >
              <span>+</span> Nuevo evento
            </button>
          </div>
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
            <div ref={gridRef} className="rounded-[4px] border border-gz-rule bg-white overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gz-rule">
                {DAYS_ES.map((d) => (
                  <div key={d} className="py-2 text-center font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">{d}</div>
                ))}
              </div>
              <MonthGrid
                year={year}
                month={month}
                selectedDay={selectedDay}
                events={events}
                actividadMes={actividadMes}
                onDayClick={(day) => { setSelectedDay(selectedDay === day ? null : day); setQuickInput(""); }}
                onDayDoubleClick={(day) => goToDay(year, month, day)}
                onEditEvent={openEditModal}
                quickInput={quickInput}
                quickLoading={quickLoading}
                onQuickInputChange={setQuickInput}
                onQuickAdd={handleQuickAdd}
                onCloseDetail={() => setSelectedDay(null)}
              />
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 font-ibm-mono text-[10px] text-gz-ink-light">
              {EVENT_TYPE_OPTIONS.map((t) => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[t.value] ?? EVENT_COLORS.personal }} />
                  <span>{t.icon} {t.label}</span>
                </div>
              ))}
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

                return (
                  <div
                    key={colIdx}
                    onClick={() => { if (cell.currentMonth) onDayClick(cell.day); }}
                    onDoubleClick={() => { if (cell.currentMonth) onDayDoubleClick(cell.day); }}
                    className={`relative min-h-[90px] border-b border-r border-gz-cream-dark cursor-pointer transition-colors duration-200 ${cell.currentMonth ? "hover:bg-gz-cream-dark/30" : "opacity-40"} ${isSelected ? "bg-gz-gold/[0.06] ring-1 ring-inset ring-gz-gold/30" : ""} ${cell.currentMonth && streakDays.has(cell.day) ? "bg-gz-gold/[0.04] border-l-2 !border-l-gz-gold" : ""}`}
                  >
                    <div className="flex items-start justify-between p-1.5">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isTodayCell ? "bg-gz-gold text-white font-bold" : "text-gz-ink-mid"} ${!cell.currentMonth ? "text-gz-ink-light/50" : ""}`}>
                        {cell.day}
                      </span>
                      {cell.currentMonth && (() => {
                        const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                        const dayAct = actividadMes?.porDia?.[dayKey];
                        if (!dayAct) return null;
                        return (
                          <span
                            className="inline-flex items-center gap-0.5 font-ibm-mono text-[8px] text-gz-gold"
                            title={`${dayAct.totalXp} XP · ${dayAct.actividades} actividades`}
                          >
                            ⚡{dayAct.totalXp}
                          </span>
                        );
                      })()}
                    </div>
                    {cell.currentMonth && (
                      <div className="px-1.5 pb-1 space-y-0.5">
                        {dayEvents.slice(0, maxVisible).map((ev) => (
                          <div key={ev.id} className="flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-ibm-mono text-[9px] font-medium truncate" style={{ backgroundColor: `${EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal}20`, color: EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal }} title={ev.title}>
                            <span className="shrink-0">{EVENT_ICONS[ev.eventType] ?? "📌"}</span>
                            <span className="truncate">{ev.title}</span>
                          </div>
                        ))}
                        {hiddenCount > 0 && <div className="text-[10px] text-gz-ink-light pl-1.5">+{hiddenCount} más</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detail panel */}
            {selectedInRow && selectedDay && (
              <div className="border-b border-gz-rule bg-gz-cream-dark/30 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-cormorant text-[16px] !font-bold text-gz-ink">
                    {selectedDay} de {MONTHS_ES[month - 1]}
                  </h4>
                  <button onClick={onCloseDetail} className="text-gz-ink-light hover:text-gz-ink-mid transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {selectedDayEvents.length > 0 ? (
                  <div className="space-y-1.5 mb-3">
                    {selectedDayEvents.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-2 rounded-[3px] bg-white px-3 py-2 border border-gz-rule cursor-pointer hover:border-gz-gold/30 transition-colors" onClick={() => onEditEvent(ev)}>
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal }} />
                        <span className="text-xs font-medium text-gz-ink flex-1 truncate">{EVENT_ICONS[ev.eventType] ?? "📌"} {ev.title}</span>
                        {!ev.allDay && <span className="text-[10px] text-gz-ink-light shrink-0">{formatTime(ev.startDate)}</span>}
                        <svg className="h-3 w-3 text-gz-ink-light/50 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-cormorant italic text-[13px] text-gz-ink-light mb-3">Sin eventos este día</p>
                )}
                <form onSubmit={onQuickAdd} className="flex gap-2">
                  <input type="text" value={quickInput} onChange={(e) => onQuickInputChange(e.target.value)} placeholder="＋ Agregar evento rápido..." className="flex-1 rounded-[3px] border border-gz-rule bg-white px-3 py-1.5 font-archivo text-[12px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none" disabled={quickLoading} autoFocus />
                  {quickInput.trim() && (
                    <button type="submit" disabled={quickLoading} className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50 transition-colors">
                      {quickLoading ? "..." : "Agregar"}
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        );
      })}
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
  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 to 23:00

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
  saving: boolean; deleting: boolean;
  onSave: () => void; onDelete: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-[4px] border border-gz-rule p-6 shadow-sm" style={{ backgroundColor: "var(--gz-cream)" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-4">
          {editing ? "Editar evento" : "Nuevo evento"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Título *</label>
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }} placeholder="Ej: Estudiar obligaciones" />
          </div>
          <div>
            <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Tipo de evento</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)} className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}>
              {EVENT_TYPE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formAllDay} onChange={(e) => setFormAllDay(e.target.checked)} className="h-4 w-4 rounded border-gz-rule text-gz-gold focus:ring-gz-gold" />
            <span className="font-archivo text-[13px] text-gz-ink">Todo el día</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Fecha inicio *</label>
              <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }} />
            </div>
            {!formAllDay && (
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Hora inicio</label>
                <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Fecha fin (opcional)</label>
              <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }} />
            </div>
            {!formAllDay && (
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Hora fin</label>
                <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }} />
              </div>
            )}
          </div>
          <div>
            <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Descripción (opcional)</label>
            <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={3} className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none resize-none" style={{ backgroundColor: "var(--gz-cream)" }} placeholder="Notas adicionales..." />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div>
            {editing && (
              <button onClick={onDelete} disabled={deleting} className="rounded-[3px] border border-gz-burgundy/30 px-4 py-2 font-archivo text-[13px] font-medium text-gz-burgundy hover:bg-gz-burgundy/[0.06] disabled:opacity-50 transition-colors">
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="rounded-[3px] border border-gz-rule px-4 py-2 font-archivo text-[13px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors">Cancelar</button>
            <button onClick={onSave} disabled={saving || !formTitle.trim() || !formStartDate} className="rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50 transition-colors">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
