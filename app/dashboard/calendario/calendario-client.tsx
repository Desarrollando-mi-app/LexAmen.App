"use client";

import { useState, useCallback, useEffect, useRef } from "react";

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
  createdAt: string;
  updatedAt: string;
}

interface CalendarioClientProps {
  initialEvents: CalendarEvent[];
  initialMonth: number;
  initialYear: number;
}

// ─── Constants ─────────────────────────────────────────────

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
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

// ─── Helpers ───────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** 0=Mon ... 6=Sun (ISO week) */
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function isToday(year: number, month: number, day: number) {
  const now = new Date();
  return (
    now.getFullYear() === year &&
    now.getMonth() + 1 === month &&
    now.getDate() === day
  );
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ─────────────────────────────────────────────

export function CalendarioClient({
  initialEvents,
  initialMonth,
  initialYear,
}: CalendarioClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

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

  // ─── Fetch events for month ──────────────────────────────

  const fetchEvents = useCallback(async (m: number, y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${m}&year=${y}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Navigate months
  function prevMonth() {
    setSelectedDay(null);
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
      fetchEvents(12, year - 1);
    } else {
      setMonth(month - 1);
      fetchEvents(month - 1, year);
    }
  }

  function nextMonth() {
    setSelectedDay(null);
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
      fetchEvents(1, year + 1);
    } else {
      setMonth(month + 1);
      fetchEvents(month + 1, year);
    }
  }

  // ─── Events for a day ────────────────────────────────────

  function getEventsForDay(day: number) {
    return events.filter((e) => {
      const d = new Date(e.startDate);
      return d.getDate() === day && d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  }

  // ─── Quick add ───────────────────────────────────────────

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickInput.trim() || !selectedDay) return;

    setQuickLoading(true);
    try {
      const startDate = new Date(year, month - 1, selectedDay);
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickInput.trim(),
          eventType: "personal",
          startDate: startDate.toISOString(),
          allDay: true,
        }),
      });

      if (res.ok) {
        const newEvent = await res.json();
        setEvents((prev) => [...prev, newEvent]);
        setQuickInput("");
      }
    } catch {
      // silently fail
    } finally {
      setQuickLoading(false);
    }
  }

  // ─── Modal helpers ───────────────────────────────────────

  function openCreateModal(day?: number) {
    setEditingEvent(null);
    setFormTitle("");
    setFormType("personal");
    const d = day ?? selectedDay ?? new Date().getDate();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
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
    setFormStartDate(
      `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, "0")}-${String(sd.getDate()).padStart(2, "0")}`
    );
    setFormStartTime(
      `${String(sd.getHours()).padStart(2, "0")}:${String(sd.getMinutes()).padStart(2, "0")}`
    );
    setFormAllDay(event.allDay);

    if (event.endDate) {
      const ed = new Date(event.endDate);
      setFormEndDate(
        `${ed.getFullYear()}-${String(ed.getMonth() + 1).padStart(2, "0")}-${String(ed.getDate()).padStart(2, "0")}`
      );
      setFormEndTime(
        `${String(ed.getHours()).padStart(2, "0")}:${String(ed.getMinutes()).padStart(2, "0")}`
      );
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
        endDate = formEndDate
          ? new Date(`${formEndDate}T23:59:59`).toISOString()
          : undefined;
      } else {
        startDate = new Date(`${formStartDate}T${formStartTime}:00`).toISOString();
        endDate =
          formEndDate && formEndTime
            ? new Date(`${formEndDate}T${formEndTime}:00`).toISOString()
            : undefined;
      }

      const payload = {
        title: formTitle.trim(),
        eventType: formType,
        startDate,
        endDate,
        allDay: formAllDay,
        description: formDescription.trim() || undefined,
      };

      if (editingEvent) {
        // PATCH
        const res = await fetch(`/api/calendar/${editingEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setEvents((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e))
          );
        }
      } else {
        // POST
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setEvents((prev) => [...prev, created]);
        }
      }

      setModalOpen(false);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingEvent) return;
    if (!confirm("¿Eliminar este evento?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/calendar/${editingEvent.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== editingEvent.id));
        setModalOpen(false);
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  }

  // ─── Close expanded day on outside click ─────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setSelectedDay(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ─── Build calendar grid ─────────────────────────────────

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1);

  const cells: {
    day: number;
    currentMonth: boolean;
  }[] = [];

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, currentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true });
  }

  // Next month padding
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, currentMonth: false });
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* ─── Header ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-navy/60 hover:bg-navy/5 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h2 className="text-xl font-bold text-navy font-display min-w-[180px] text-center">
              {MONTHS_ES[month - 1]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-navy/60 hover:bg-navy/5 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 transition-colors"
          >
            <span>+</span> Nuevo evento
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          </div>
        )}

        {/* ─── Calendar Grid ───────────────────────────── */}
        <div
          ref={gridRef}
          className="rounded-xl border border-border bg-white overflow-hidden"
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_ES.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-xs font-semibold text-navy/50 uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const dayEvents = cell.currentMonth
                ? getEventsForDay(cell.day)
                : [];
              const isSelected =
                cell.currentMonth && selectedDay === cell.day;
              const isTodayCell =
                cell.currentMonth && isToday(year, month, cell.day);
              const maxVisible = isSelected ? 999 : 3;
              const hiddenCount = Math.max(
                0,
                dayEvents.length - maxVisible
              );

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.currentMonth) {
                      setSelectedDay(
                        selectedDay === cell.day ? null : cell.day
                      );
                      setQuickInput("");
                    }
                  }}
                  className={`
                    relative border-b border-r border-border cursor-pointer
                    transition-all duration-300 ease-in-out
                    ${cell.currentMonth ? "hover:bg-navy/[0.02]" : "opacity-40"}
                    ${isSelected ? "min-h-[180px] bg-navy/[0.02] z-10" : "min-h-[90px]"}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between p-1.5">
                    <span
                      className={`
                        inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium
                        ${isTodayCell ? "bg-gold text-white font-bold" : "text-navy/70"}
                        ${!cell.currentMonth ? "text-navy/30" : ""}
                      `}
                    >
                      {cell.day}
                    </span>
                  </div>

                  {/* Event pills */}
                  {cell.currentMonth && (
                    <div className="px-1.5 pb-1 space-y-0.5">
                      {dayEvents.slice(0, maxVisible).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium truncate"
                          style={{
                            backgroundColor: `${EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal}20`,
                            color: EVENT_COLORS[ev.eventType] ?? EVENT_COLORS.personal,
                          }}
                          onClick={(e) => {
                            if (isSelected) {
                              e.stopPropagation();
                              openEditModal(ev);
                            }
                          }}
                          title={ev.title}
                        >
                          <span className="shrink-0">
                            {EVENT_ICONS[ev.eventType] ?? "📌"}
                          </span>
                          <span className="truncate">{ev.title}</span>
                          {!ev.allDay && (
                            <span className="shrink-0 opacity-60 ml-auto">
                              {formatTime(ev.startDate)}
                            </span>
                          )}
                        </div>
                      ))}
                      {!isSelected && hiddenCount > 0 && (
                        <div className="text-[10px] text-navy/40 pl-1.5">
                          +{hiddenCount} más
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded day: quick input */}
                  {isSelected && cell.currentMonth && (
                    <div className="px-1.5 pb-2 mt-1">
                      <form onSubmit={handleQuickAdd} className="flex gap-1">
                        <input
                          type="text"
                          value={quickInput}
                          onChange={(e) => setQuickInput(e.target.value)}
                          placeholder="＋ Agregar evento..."
                          className="flex-1 rounded border border-border bg-white px-2 py-1 text-[11px] text-navy placeholder:text-navy/30 focus:border-gold focus:outline-none"
                          disabled={quickLoading}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        {quickInput.trim() && (
                          <button
                            type="submit"
                            disabled={quickLoading}
                            className="rounded bg-gold px-2 py-1 text-[10px] font-semibold text-white hover:bg-gold/90 disabled:opacity-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {quickLoading ? "..." : "↵"}
                          </button>
                        )}
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Legend ───────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-navy/50">
          {EVENT_TYPE_OPTIONS.map((t) => (
            <div key={t.value} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: EVENT_COLORS[t.value] ?? EVENT_COLORS.personal,
                }}
              />
              <span>
                {t.icon} {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Modal ─────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-navy font-display mb-4">
              {editingEvent ? "Editar evento" : "Nuevo evento"}
            </h3>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                  placeholder="Ej: Estudiar obligaciones"
                />
              </div>

              {/* Event type */}
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">
                  Tipo de evento
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                >
                  {EVENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* All day checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAllDay}
                  onChange={(e) => setFormAllDay(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
                />
                <span className="text-sm text-navy">Todo el día</span>
              </label>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy/60 mb-1">
                    Fecha inicio *
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                  />
                </div>
                {!formAllDay && (
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1">
                      Hora inicio
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-navy/60 mb-1">
                    Fecha fin (opcional)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                  />
                </div>
                {!formAllDay && (
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1">
                      Hora fin
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none resize-none"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex items-center justify-between">
              <div>
                {editingEvent && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-navy/60 hover:bg-navy/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formTitle.trim() || !formStartDate}
                  className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
