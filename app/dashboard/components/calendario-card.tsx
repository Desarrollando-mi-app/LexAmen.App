"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────

interface CalEvento {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  allDay: boolean;
  color: string | null;
}

const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DIAS = ["Lu","Ma","Mi","Ju","Vi","Sá","Do"];
const LS_FECHA = "iuris_fecha_examen";

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDow(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }
function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────

interface CalendarioCardProps {
  activityDays: Array<{ date: string; count: number }>;
  examDate: string | null;
  inline?: boolean;
}

export function CalendarioCard({ activityDays, examDate, inline }: CalendarioCardProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [eventos, setEventos] = useState<CalEvento[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formType, setFormType] = useState("personal");
  const [formDate, setFormDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activityMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of activityDays) m.set(d.date, d.count);
    return m;
  }, [activityDays]);

  const examKey = useMemo(() => examDate?.slice(0, 10) ?? null, [examDate]);

  // ─── Fetch events for current month ───────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${viewMonth + 1}&year=${viewYear}`);
      if (res.ok) {
        const data = await res.json();
        setEventos(data);
        // Auto-detect exam date
        const examEvent = data.find((e: CalEvento) =>
          e.eventType === "examen" ||
          e.title.toLowerCase().includes("grado") ||
          e.title.toLowerCase().includes("examen")
        );
        if (examEvent) {
          try { localStorage.setItem(LS_FECHA, examEvent.startDate.slice(0, 10)); } catch { /* */ }
        }
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, [viewMonth, viewYear]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ─── Calendar grid ────────────────────────────────────────
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDow(viewYear, viewMonth);
  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, key: toKey(viewYear, viewMonth, d) });

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalEvento[]>();
    for (const e of eventos) {
      const k = e.startDate.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return m;
  }, [eventos]);

  // ─── Nav ──────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  }

  // ─── CRUD ─────────────────────────────────────────────────
  function openNewEvent(day: number) {
    setEditingId(null);
    setFormTitle("");
    setFormDesc("");
    setFormType("personal");
    setFormDate(toKey(viewYear, viewMonth, day));
    setModalOpen(true);
  }

  function openEditEvent(ev: CalEvento) {
    setEditingId(ev.id);
    setFormTitle(ev.title);
    setFormDesc(ev.description ?? "");
    setFormType(ev.eventType);
    setFormDate(ev.startDate.slice(0, 10));
    setModalOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formDate) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/calendar/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle, description: formDesc || null, eventType: formType, startDate: new Date(formDate).toISOString() }),
        });
      } else {
        await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle, description: formDesc || null, eventType: formType, startDate: new Date(formDate).toISOString(), allDay: true }),
        });
      }
      setModalOpen(false);
      fetchEvents();
    } catch { /* */ }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    fetchEvents();
  }

  // ─── Selected day events ──────────────────────────────────
  const selectedKey = selectedDay ? toKey(viewYear, viewMonth, selectedDay) : null;
  const selectedEvents = selectedKey ? (eventsByDay.get(selectedKey) ?? []) : [];

  const Wrapper = inline ? "div" : CardWrapper;

  return (
    <Wrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-navy font-cormorant flex items-center gap-1.5">
          <span>📅</span> Calendario
        </h3>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="rounded p-1 text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <p className="text-xs font-semibold text-navy">{MESES[viewMonth]} {viewYear}</p>
        <button onClick={nextMonth} className="rounded p-1 text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DIAS.map((d) => (
          <div key={d} className="text-center text-[9px] font-medium text-navy/30">{d}</div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="h-[180px] flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} className="h-7" />;
            const hasActivity = (activityMap.get(cell.key) ?? 0) > 0;
            const hasEvents = eventsByDay.has(cell.key);
            const isToday = cell.key === todayKey;
            const isExam = cell.key === examKey;
            const isSelected = cell.day === selectedDay;

            return (
              <button key={cell.key} onClick={() => setSelectedDay(isSelected ? null : cell.day)}
                className={`relative flex flex-col items-center justify-center h-7 rounded-md text-[10px] transition-colors
                  ${isToday ? "bg-navy/10 font-bold text-navy" : "text-navy/60 hover:bg-navy/5"}
                  ${isExam ? "ring-1 ring-gold bg-gold/10 font-bold text-gold" : ""}
                  ${isSelected ? "ring-2 ring-navy/40" : ""}
                `}>
                {cell.day}
                {(hasActivity || hasEvents) && (
                  <div className={`absolute bottom-0.5 h-1 w-1 rounded-full ${hasEvents ? "bg-gold" : "bg-navy/20"}`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected day panel */}
      {selectedDay && (
        <div className="mt-3 border-t border-gz-rule pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-navy">
              {selectedDay} de {MESES[viewMonth]}
            </p>
            <button onClick={() => openNewEvent(selectedDay)}
              className="rounded bg-gold px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-gold/90 transition-colors">
              + Evento
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-[10px] text-navy/40">Sin eventos</p>
          ) : (
            <div className="space-y-1">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 rounded-[4px] bg-navy/5 px-2.5 py-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ev.color ?? "var(--accent)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-navy truncate">{ev.title}</p>
                    <p className="text-[9px] text-navy/40">{ev.eventType}</p>
                  </div>
                  <button onClick={() => openEditEvent(ev)}
                    className="text-[10px] text-navy/30 hover:text-navy transition-colors">✏️</button>
                  <button onClick={() => handleDelete(ev.id)}
                    className="text-[10px] text-navy/30 hover:text-gz-burgundy transition-colors">🗑️</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="mx-4 w-full max-w-sm rounded-[4px] bg-white p-6 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-navy">
              {editingId ? "Editar evento" : "Nuevo evento"}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">Título</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ej: Examen de grado"
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">Fecha</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">Tipo</label>
                <select value={formType} onChange={(e) => setFormType(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none">
                  <option value="personal">Personal</option>
                  <option value="examen">Examen</option>
                  <option value="estudio">Estudio</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">Descripción (opcional)</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} placeholder="Notas..."
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none resize-none" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)}
                className="rounded-[3px] px-4 py-2 text-sm font-medium text-navy/70 hover:bg-navy/5 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={!formTitle.trim() || saving}
                className="rounded-[3px] bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 transition-colors">
                {saving ? "..." : editingId ? "Guardar" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

function CardWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5">
      {children}
    </div>
  );
}
