"use client";

interface BloqueResumenProps {
  resumen: {
    xp: number;
    racha: number;
    tasaAcierto: number;
    diasActivos: number;
    tendencias: {
      tasaCambio: number;
      intentosCambio: number;
    };
    frase: string;
  };
  periodo: string;
}

function TrendBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isUp = value > 0;
  return (
    <span
      className={`inline-flex items-center font-ibm-mono text-[10px] px-1.5 py-0.5 rounded-[2px] ml-2 ${
        isUp
          ? "bg-gz-sage/10 text-gz-sage"
          : "bg-gz-burgundy/10 text-gz-burgundy"
      }`}
    >
      {isUp ? "↑" : "↓"} {Math.abs(value)}{suffix}
    </span>
  );
}

const PERIODO_LABEL: Record<string, string> = {
  "7d": "últimos 7 días",
  "30d": "últimos 30 días",
  "90d": "últimos 90 días",
  all: "todo el historial",
};

export function BloqueResumen({ resumen, periodo }: BloqueResumenProps) {
  const stats = [
    {
      label: "XP Total",
      value: resumen.xp.toLocaleString("es-CL"),
      sub: "puntos de experiencia",
    },
    {
      label: "Racha",
      value: String(resumen.racha),
      sub: resumen.racha === 1 ? "día consecutivo" : "días consecutivos",
    },
    {
      label: "Tasa de Acierto",
      value: `${resumen.tasaAcierto}%`,
      sub: PERIODO_LABEL[periodo] ?? periodo,
      trend: resumen.tendencias.tasaCambio,
      trendSuffix: "%",
    },
    {
      label: "Días Activos",
      value: String(resumen.diasActivos),
      sub: PERIODO_LABEL[periodo] ?? periodo,
    },
  ];

  return (
    <div className="bg-white border border-gz-rule rounded-[4px] p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light font-medium">
            Resumen ejecutivo
          </h3>
          <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-[2px]">
            Vista general
          </span>
        </div>
        <div className="h-px bg-gz-rule" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
              {s.label}
            </p>
            <p className="font-cormorant text-[36px] leading-none !font-bold text-gz-ink">
              {s.value}
            </p>
            <div className="flex items-center justify-center mt-1">
              <span className="font-archivo text-[11px] text-gz-ink-mid">
                {s.sub}
              </span>
              {s.trend !== undefined && (
                <TrendBadge value={s.trend} suffix={s.trendSuffix} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic phrase */}
      <div className="border-t border-gz-cream-dark pt-3">
        <p className="font-cormorant text-[15px] italic text-gz-ink-mid text-center leading-relaxed">
          &ldquo;{resumen.frase}&rdquo;
        </p>
      </div>
    </div>
  );
}
