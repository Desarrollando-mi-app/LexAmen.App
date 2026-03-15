"use client";

import { useState, useMemo } from "react";

// ─── Types ──────────────────────────────────────────────────

interface MiniCalendarProps {
  activityDays: Array<{ date: string; count: number }>;
  examDate: string | null;
}

// ─── Helpers ────────────────────────────────────────────────

const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Lun=0 ... Dom=6
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────

export function MiniCalendar({ activityDays, examDate }: MiniCalendarProps) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [tooltip, setTooltip] = useState<{ day: number; count: number } | null>(null);

  const activityMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of activityDays) m.set(d.date, d.count);
    return m;
  }, [activityDays]);

  const examKey = useMemo(() => {
    if (!examDate) return null;
    return examDate.slice(0, 10);
  }, [examDate]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  // Build calendar grid cells
  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, key: toKey(viewYear, viewMonth, d) });
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="rounded p-1 text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <p className="text-xs font-semibold text-navy">
          {MESES[viewMonth]} {viewYear}
        </p>
        <button onClick={nextMonth} className="rounded p-1 text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DIAS.map((d) => (
          <div key={d} className="text-center text-[9px] font-medium text-navy/30">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 relative">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="h-7" />;
          }

          const count = activityMap.get(cell.key) ?? 0;
          const isToday = cell.key === todayKey;
          const isExam = cell.key === examKey;

          return (
            <div
              key={cell.key}
              className={`relative flex flex-col items-center justify-center h-7 rounded-md text-[10px] cursor-pointer transition-colors
                ${isToday ? "bg-navy/10 font-bold text-navy" : "text-navy/60 hover:bg-navy/5"}
                ${isExam ? "ring-1 ring-gold bg-gold/10 font-bold text-gold" : ""}
              `}
              onClick={() => setTooltip(tooltip?.day === cell.day ? null : { day: cell.day, count })}
            >
              {cell.day}
              {count > 0 && (
                <div className="absolute bottom-0.5 h-1 w-1 rounded-full bg-gold" />
              )}
              {isExam && (
                <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-gold" />
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="mt-2 rounded-[4px] border border-gz-rule bg-white px-3 py-2 text-xs">
          <p className="font-semibold text-navy">
            {tooltip.day} de {MESES[viewMonth]}
          </p>
          {tooltip.count > 0 ? (
            <p className="text-navy/60">{tooltip.count} actividad{tooltip.count !== 1 ? "es" : ""}</p>
          ) : (
            <p className="text-navy/40">Sin actividad</p>
          )}
          {toKey(viewYear, viewMonth, tooltip.day) === examKey && (
            <p className="mt-0.5 text-gold font-semibold">🎓 Examen de grado</p>
          )}
        </div>
      )}
    </div>
  );
}
