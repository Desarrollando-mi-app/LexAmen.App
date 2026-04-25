/**
 * Masthead editorial unificado para el tab Academia (Debates, Expediente,
 * Peer Review, Ranking, Eventos, Hub). Server-safe.
 *
 * Mismo lenguaje que los mastheads de La Sala, sin la línea Vol/Nº — el
 * eyebrow superior contextualiza la sección y el subtítulo italic le da
 * el tono editorial.
 */
export function MastheadAcademia({
  seccion,
  glyph = "§",
  subtitulo,
  resultCount,
  resultLabel = "publicaciones",
  eyebrowExtra,
}: {
  /** Nombre de la sección — aparece como h1 grande Cormorant. */
  seccion: string;
  /** Glifo decorativo en italic Cormorant antes del título (default: §). */
  glyph?: string;
  /** Subtítulo italic Cormorant debajo del título. Opcional. */
  subtitulo?: string;
  /** Conteo opcional al lado derecho ("12 debates", "8 eventos"). */
  resultCount?: number;
  /** Etiqueta para el conteo. Default: "publicaciones". */
  resultLabel?: string;
  /** Texto extra después del eyebrow base. Ej: "· Vol. activo". */
  eyebrowExtra?: string;
}) {
  return (
    <header className="max-w-[1400px] mx-auto mt-[14px] px-7 pb-[22px] border-b-2 border-gz-ink">
      <div className="pb-[10px] border-b border-gz-rule font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>
          Studio Iuris · Academia · {seccion}
          {eyebrowExtra ? ` · ${eyebrowExtra}` : ""}
        </span>
      </div>
      <div className="pt-[14px] flex justify-between items-end gap-6 flex-wrap">
        <div>
          <h1 className="font-cormorant font-semibold text-[56px] leading-[0.95] tracking-[-1px] text-gz-ink m-0">
            <em className="font-medium">{glyph}</em> {seccion}
          </h1>
          {subtitulo && (
            <p className="mt-1.5 font-cormorant italic text-[17px] text-gz-ink-mid">
              {subtitulo}
            </p>
          )}
        </div>
        {typeof resultCount === "number" && (
          <span className="font-ibm-mono text-[11px] tracking-[1.5px] uppercase text-gz-ink-mid self-end pb-1">
            {resultCount} {resultLabel}
          </span>
        )}
      </div>
    </header>
  );
}
