"use client";

import { useState, useRef, useEffect } from "react";

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function getIntensityClass(count: number): string {
  if (count === 0) return "bg-border";
  if (count <= 5) return "bg-gold/30";
  if (count <= 15) return "bg-gold/60";
  return "bg-gold";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0=Dom
  return day === 0 ? 6 : day - 1; // 0=Lun, 6=Dom
}

// ─── Popover cell ─────────────────────────────────────────

interface DayData {
  flashcards: number;
  mcq: number;
  truefalse: number;
  total: number;
}

function DayCell({ day }: { day: { date: string; count: number } | null }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleClick() {
    if (!day || day.count === 0) return;
    setOpen((prev) => !prev);
    if (!data) {
      setLoading(true);
      try {
        const res = await fetch(`/api/activity/day?date=${day.date}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
  }

  if (!day) {
    return <div className="h-[14px] w-[14px] rounded-sm bg-transparent" />;
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={handleClick}
        className={`h-[14px] w-[14px] rounded-sm ${
          day.count > 0 ? "cursor-pointer" : ""
        } ${getIntensityClass(day.count)}`}
        title={
          day.count === 0
            ? `Sin actividad · ${formatDate(day.date)}`
            : undefined
        }
      />
      {open && (
        <div className="absolute bottom-full left-1/2 z-40 mb-2 w-44 -translate-x-1/2 rounded-[4px] border border-gz-rule bg-white p-3 text-xs shadow-sm">
          <p className="font-semibold text-navy">{formatDate(day.date)}</p>
          {loading ? (
            <p className="mt-1.5 text-navy/50">Cargando...</p>
          ) : data ? (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-navy/60">Flashcards</span>
                <span className="font-medium text-navy">{data.flashcards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy/60">Sel. Múltiple</span>
                <span className="font-medium text-navy">{data.mcq}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy/60">V / F</span>
                <span className="font-medium text-navy">{data.truefalse}</span>
              </div>
              <div className="flex justify-between border-t border-gz-rule pt-1">
                <span className="font-medium text-navy/60">Total</span>
                <span className="font-bold text-navy">{data.total}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Grid principal ───────────────────────────────────────

interface ActivityGridProps {
  days: Array<{ date: string; count: number }>;
  inline?: boolean;
}

export function ActivityGrid({ days, inline }: ActivityGridProps) {
  const totalActivity = days.reduce((sum, d) => sum + d.count, 0);

  // Organizar en semanas (columnas) para grilla estilo GitHub
  const weeks: Array<Array<{ date: string; count: number } | null>> = [];
  let currentWeek: Array<{ date: string; count: number } | null> = [];

  if (days.length > 0) {
    const firstDayOfWeek = getDayOfWeek(days[0].date);
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
  }

  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy font-cormorant">
          Actividad reciente
        </h3>
        <span className="text-xs text-navy/50">
          {totalActivity} actividad{totalActivity !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Grid */}
      <div className="mt-4 flex gap-3">
        {/* Etiquetas de días */}
        <div className="flex flex-col gap-[3px] pt-0">
          {DAY_LABELS.map((label, i) => (
            <span
              key={i}
              className="flex h-[14px] items-center text-[9px] leading-none text-navy/40"
            >
              {i % 2 === 0 ? label : ""}
            </span>
          ))}
        </div>

        {/* Semanas */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <DayCell key={di} day={day} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[9px] text-navy/40">
        <span>Menos</span>
        <div className="h-[10px] w-[10px] rounded-sm bg-border" />
        <div className="h-[10px] w-[10px] rounded-sm bg-gold/30" />
        <div className="h-[10px] w-[10px] rounded-sm bg-gold/60" />
        <div className="h-[10px] w-[10px] rounded-sm bg-gold" />
        <span>Más</span>
      </div>
    </>
  );

  if (inline) return <div>{content}</div>;

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5">
      {content}
    </div>
  );
}
