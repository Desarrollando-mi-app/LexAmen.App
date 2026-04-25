/** Masthead editorial para Networking V4. Server-safe. */
export function MastheadNetworking({
  resultCount,
}: {
  resultCount?: number;
}) {
  return (
    <header className="max-w-[1400px] mx-auto mt-[14px] px-7 pb-[22px] border-b-2 border-gz-ink">
      <div className="pb-[10px] border-b border-gz-rule font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · La Sala</span>
      </div>
      <div className="pt-[14px] flex justify-between items-end gap-6 flex-wrap">
        <div>
          <h1 className="font-cormorant font-semibold text-[56px] leading-[0.95] tracking-[-1px] text-gz-ink m-0">
            <em className="font-medium">¶</em> Networking
          </h1>
          <p className="mt-1.5 font-cormorant italic text-[17px] text-gz-ink-mid">
            Directorio de colegas, egresados y abogados de la comunidad
          </p>
        </div>
        {typeof resultCount === "number" && (
          <span className="font-ibm-mono text-[11px] tracking-[1.5px] uppercase text-gz-ink-mid self-end pb-1">
            {resultCount} colegas
          </span>
        )}
      </div>
    </header>
  );
}
