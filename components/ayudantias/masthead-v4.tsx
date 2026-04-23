/** Masthead editorial para Ayudantías V4. Server-safe. */
export function MastheadV4({
  volume,
  issue,
  dateLabel,
  resultCount,
}: {
  volume?: string;
  issue?: string;
  dateLabel?: string;
  resultCount?: number;
}) {
  const now = new Date();
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const autoDate =
    dateLabel ||
    `${months[now.getMonth()].charAt(0).toUpperCase()}${months[now.getMonth()].slice(1)} ${now.getFullYear()}`;
  const year2digits = String(now.getFullYear()).slice(-2);
  return (
    <header className="max-w-[1400px] mx-auto mt-[14px] px-7 pb-[22px] border-b-2 border-gz-ink">
      <div className="flex justify-between items-baseline pb-[10px] border-b border-gz-rule font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · La Sala</span>
        <span>{`Vol. ${volume ?? "II"} · Nº ${issue ?? year2digits} · ${autoDate}`}</span>
      </div>
      <div className="pt-[14px] flex justify-between items-end gap-6 flex-wrap">
        <div>
          <h1 className="font-cormorant font-semibold text-[56px] leading-[0.95] tracking-[-1px] text-gz-ink m-0">
            <em className="font-medium">§</em> Ayudantías
          </h1>
          <p className="mt-1.5 font-cormorant italic text-[17px] text-gz-ink-mid">
            Publicaciones activas entre estudiantes y tutores de la comunidad
          </p>
        </div>
        {typeof resultCount === "number" && (
          <span className="font-ibm-mono text-[11px] tracking-[1.5px] uppercase text-gz-ink-mid self-end pb-1">
            {resultCount} publicaciones
          </span>
        )}
      </div>
    </header>
  );
}
