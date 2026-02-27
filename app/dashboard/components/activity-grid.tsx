"use client";

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

interface ActivityGridProps {
  days: Array<{ date: string; count: number }>;
}

export function ActivityGrid({ days }: ActivityGridProps) {
  const totalActivity = days.reduce((sum, d) => sum + d.count, 0);

  // Organizar en semanas (columnas) para grilla estilo GitHub
  // Primera columna puede ser parcial si el día 0 no es lunes
  const weeks: Array<Array<{ date: string; count: number } | null>> = [];
  let currentWeek: Array<{ date: string; count: number } | null> = [];

  // Llenar días vacíos al inicio de la primera semana
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

  // Llenar días vacíos al final de la última semana
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">
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
                <div
                  key={di}
                  title={
                    day
                      ? `${day.count} actividad${day.count !== 1 ? "es" : ""} · ${formatDate(day.date)}`
                      : undefined
                  }
                  className={`h-[14px] w-[14px] rounded-sm ${
                    day ? getIntensityClass(day.count) : "bg-transparent"
                  }`}
                />
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
    </div>
  );
}
