// ─── InvSectionRotulo — encabezado tipo "I  Recientes" ─────
//
// Reutilizable. Numeral romano + título + regla + nota a la derecha.

export function InvSectionRotulo({
  roman,
  titulo,
  nota,
}: {
  roman: string;
  titulo: string;
  nota?: string;
}) {
  return (
    <div className="flex items-baseline gap-3.5 mb-5 pb-3 border-b border-inv-ink">
      <h2 className="font-cormorant text-[24px] sm:text-[30px] font-medium tracking-[-0.5px] whitespace-nowrap text-inv-ink">
        <span className="font-cormorant text-[14px] text-inv-ocre tracking-[3px] mr-1.5 align-baseline">
          {roman}
        </span>
        <em>{titulo}</em>
      </h2>
      <div className="flex-1 h-px bg-inv-rule" />
      {nota && (
        <div className="font-crimson-pro italic text-[13px] text-inv-ink-3 whitespace-nowrap">
          {nota}
        </div>
      )}
    </div>
  );
}
