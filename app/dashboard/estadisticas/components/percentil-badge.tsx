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

  return (
    <div className="bg-white border border-gz-rule rounded-[4px] p-5">
      <div className="flex items-center gap-4">
        {/* Circle */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${
            isTop
              ? "bg-gz-gold/15 border-2 border-gz-gold"
              : isGood
              ? "bg-gz-navy/10 border-2 border-gz-navy"
              : "bg-gz-cream-dark border-2 border-gz-rule"
          }`}
        >
          <span
            className={`font-cormorant text-[24px] !font-bold ${
              isTop
                ? "text-gz-gold"
                : isGood
                ? "text-gz-navy"
                : "text-gz-ink-mid"
            }`}
          >
            {percentil.global}
          </span>
        </div>

        {/* Text */}
        <div>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-0.5">
            Percentil comparativo
          </p>
          <p className="font-cormorant text-[18px] !font-bold text-gz-ink leading-tight">
            {isTop
              ? "Estás en el top 25%"
              : isGood
              ? "Por encima del promedio"
              : "Hay espacio para mejorar"}
          </p>
          <p className="font-archivo text-[11px] text-gz-ink-mid mt-0.5">
            Entre {percentil.totalUsuarios} estudiantes de{" "}
            {percentil.universidad}
          </p>
        </div>
      </div>
    </div>
  );
}
