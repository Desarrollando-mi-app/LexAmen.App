import Link from "next/link";

/**
 * Empty state editorial estandarizado para Academia. Cormorant italic
 * grande + copy descriptivo en Archivo + glifo dorado opcional + CTA
 * en chip IBM Mono. Reemplaza los empty states sueltos que cada sección
 * de Academia tenía con copy genérico.
 */
export function EmptyStateAcademia({
  glyph = "§",
  titulo,
  descripcion,
  ctaLabel,
  ctaHref,
  ctaOnClick,
}: {
  /** Glifo decorativo Cormorant en gold sobre el título. */
  glyph?: string;
  /** Frase italic Cormorant — la "tagline" del empty state. */
  titulo: string;
  /** Copy descriptivo Archivo bajo el título. */
  descripcion?: string;
  /** Texto del CTA opcional. */
  ctaLabel?: string;
  /** Si se pasa href se renderiza como Link; si se pasa onClick como button. */
  ctaHref?: string;
  ctaOnClick?: () => void;
}) {
  const cta = ctaLabel ? (
    ctaHref ? (
      <Link
        href={ctaHref}
        className="mt-6 inline-block px-4 py-2 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase border border-gz-ink text-gz-ink rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
      >
        {ctaLabel} →
      </Link>
    ) : (
      <button
        type="button"
        onClick={ctaOnClick}
        className="mt-6 inline-block px-4 py-2 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase border border-gz-ink text-gz-ink rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
      >
        {ctaLabel} →
      </button>
    )
  ) : null;

  return (
    <div className="py-24 text-center border border-gz-rule bg-white">
      <p className="font-cormorant text-[36px] italic text-gz-gold leading-none mb-3 select-none">
        {glyph}
      </p>
      <p className="font-cormorant italic text-[22px] text-gz-ink-mid m-0">
        {titulo}
      </p>
      {descripcion && (
        <p className="mt-2 font-archivo text-[13px] text-gz-ink-light max-w-[560px] mx-auto leading-[1.55]">
          {descripcion}
        </p>
      )}
      {cta}
    </div>
  );
}
