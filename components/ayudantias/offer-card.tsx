import { formatLabel, priceLabel, formatRelative } from "@/lib/ayudantias-v4-helpers";

export interface OfferCardProps {
  materia: string;
  titulo: string | null;
  description: string;
  format: string;
  priceType: string;
  priceAmount: number | null;
  disponibilidad: string | null;
  cupo?: string | null;
  createdAt: string;
  temario?: string | null;
}

export function OfferCard(props: OfferCardProps) {
  return (
    <div className="border border-gz-rule bg-white p-7">
      <div className="flex justify-between items-baseline gap-3 pb-2 border-b border-gz-rule/60 mb-4 font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase">
        <span className="text-gz-ink-mid">{props.materia}</span>
        <span className="text-gz-ink-light">{formatRelative(props.createdAt)}</span>
      </div>
      <h3 className="font-cormorant font-semibold text-[32px] leading-[1.08] tracking-[-0.5px] text-gz-ink m-0">
        {props.titulo || props.materia}
      </h3>
      <div className="mt-3 w-12 h-px bg-gz-gold" />
      <p className="mt-4 text-[14px] leading-[1.65] text-gz-ink-mid [&::first-line]:font-medium [&::first-line]:text-gz-ink">
        {props.description}
      </p>

      {/* Cells grid */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-0 border border-gz-rule">
        <Cell label="Formato" value={formatLabel(props.format)} />
        <Cell label="Horario" value={props.disponibilidad || "A convenir"} />
        <Cell label="Cupo" value={props.cupo || "1-3 personas"} />
        <Cell
          label="Precio"
          value={priceLabel(props.priceType, props.priceAmount)}
          accent={props.priceType === "GRATUITO" ? "free" : "paid"}
        />
      </div>

      {props.temario && (
        <div className="mt-5 border-l-[3px] border-gz-gold pl-4 py-3 bg-gz-cream/40 font-cormorant italic text-[14px] text-gz-ink-mid leading-[1.55]">
          <strong className="not-italic font-semibold text-gz-ink">Temario:</strong> {props.temario}
        </div>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "free" | "paid";
}) {
  return (
    <div className="p-3.5 border-r last:border-r-0 border-gz-rule">
      <div className="font-ibm-mono text-[9px] tracking-[1.4px] uppercase text-gz-ink-light">
        {label}
      </div>
      <div
        className={`mt-1 text-[13.5px]
          ${accent === "free" ? "text-gz-sage italic font-semibold" : ""}
          ${accent === "paid" ? "text-gz-gold font-semibold" : ""}
          ${!accent ? "text-gz-ink" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
