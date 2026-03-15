interface ProgressItem {
  label: string;
  percent: number;
}

interface ProgressCardProps {
  items: ProgressItem[];
}

export function ProgressCard({ items }: ProgressCardProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[4px] border border-gz-rule bg-white p-5">
        <h3 className="text-sm font-bold text-navy font-cormorant flex items-center gap-1.5 mb-3">
          <span>📊</span> Progresos
        </h3>
        <p className="text-xs text-navy/40 text-center py-4">
          Aún no hay progreso registrado
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5">
      <h3 className="text-sm font-bold text-navy font-cormorant flex items-center gap-1.5 mb-4">
        <span>📊</span> Progresos
      </h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-navy/70 truncate pr-2">
                {item.label}
              </span>
              <span className="text-xs font-semibold text-navy/50 shrink-0">
                {item.percent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border/30">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  item.percent >= 100 ? "bg-gz-sage" : "bg-gold"
                }`}
                style={{ width: `${Math.min(item.percent, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
