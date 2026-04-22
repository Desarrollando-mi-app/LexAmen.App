import Link from "next/link";

export const metadata = {
  title: "Networking · Studio Iuris",
  description: "Directorio de abogados y servicios profesionales",
};

export default function NetworkingPage() {
  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-16 sm:py-24">
        {/* Eyebrow */}
        <div className="text-center">
          <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
            — Profesión · Sección IV —
          </div>

          {/* Title */}
          <h1 className="font-cormorant text-[40px] sm:text-[56px] !font-semibold leading-[1.02] text-gz-ink tracking-[-0.01em]">
            Networking
          </h1>

          <p className="font-cormorant italic text-[20px] sm:text-[24px] text-gz-ink-mid mt-3 leading-snug max-w-xl mx-auto">
            Directorio de abogados y servicios profesionales.
          </p>
        </div>

        {/* Editorial § ornament divider */}
        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-gz-rule" />
          <span className="font-cormorant italic text-3xl text-gz-gold opacity-60">
            §
          </span>
          <div className="h-px flex-1 bg-gz-rule" />
        </div>

        {/* Placeholder card */}
        <article className="mx-auto max-w-[600px] border border-gz-ink bg-white p-8 sm:p-12 text-center">
          <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-light mb-4">
            — En imprenta —
          </div>
          <p className="font-cormorant text-[22px] sm:text-[26px] leading-snug text-gz-ink">
            Un espacio para encontrar y presentar servicios jurídicos —{" "}
            <span className="italic">de colega a colega</span>.
          </p>
          <p className="font-archivo text-[13px] leading-relaxed text-gz-ink-mid mt-4">
            Pronto podrás buscar por área, región o corte; ofrecer tus
            servicios, o compartir tu bufete dentro del claustro.
          </p>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-ink text-gz-ink px-5 py-2.5 hover:bg-gz-ink hover:text-gz-cream transition-colors cursor-pointer"
          >
            Volver al escritorio
          </Link>
        </article>

        <p className="mt-10 text-center font-cormorant italic text-[15px] text-gz-ink-light">
          — Próximamente —
        </p>
      </div>
    </main>
  );
}
