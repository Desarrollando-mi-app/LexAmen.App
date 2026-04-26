"use client";

interface PercentilBadgeProps {
  percentil: {
    global: number;
    totalUsuarios: number;
    universidad: string;
  };
}

export function PercentilBadge({ percentil }: PercentilBadgeProps) {
  const isTop = percentil.global >= 75;
  const isGood = percentil.global >= 50;

  const accentColor = isTop ? "var(--gz-gold)" : isGood ? "var(--gz-navy)" : "var(--gz-ink-mid)";

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}99)`,
        }}
      />
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Percentil comparativo
          </p>
        </div>
        <span
          className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] px-2 py-0.5 rounded-full"
          style={{
            color: accentColor,
            backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
          }}
        >
          vs {percentil.universidad}
        </span>
      </div>

      <div className="flex items-center gap-5 p-5">
        {/* Circle grande */}
        <div
          className="relative w-24 h-24 rounded-full flex items-center justify-center shrink-0 shadow-[inset_0_0_0_3px_var(--gz-cream-dark)]"
          style={{
            background: `radial-gradient(circle at center, ${accentColor}18 0%, transparent 75%)`,
            border: `2px solid ${accentColor}`,
          }}
        >
          <div className="text-center">
            <p
              className="font-cormorant text-[40px] font-bold leading-none"
              style={{ color: accentColor }}
            >
              {percentil.global}
            </p>
            <p className="font-ibm-mono text-[8px] uppercase tracking-[1.5px] text-gz-ink-light mt-0.5">
              percentil
            </p>
          </div>
        </div>

        {/* Text */}
        <div className="min-w-0">
          <p className="font-cormorant text-[22px] font-bold text-gz-ink leading-tight">
            {isTop
              ? "Estás en el top 25%"
              : isGood
              ? "Por encima del promedio"
              : "Hay espacio para crecer"}
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-mid mt-1">
            Comparado con{" "}
            <span className="font-semibold text-gz-ink">
              {percentil.totalUsuarios.toLocaleString("es-CL")}
            </span>{" "}
            estudiantes de{" "}
            <span className="font-semibold text-gz-ink">
              {percentil.universidad}
            </span>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
