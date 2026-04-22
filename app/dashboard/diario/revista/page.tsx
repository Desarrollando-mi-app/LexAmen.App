import Link from "next/link";

export const metadata = {
  title: "Revista · Studio Iuris",
  description:
    "Edición mensual con los mejores ensayos y análisis del claustro",
};

export default function RevistaPage() {
  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center">
          <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
            — Publicaciones · Sección IV —
          </div>

          <h1 className="font-cormorant text-[40px] sm:text-[56px] !font-semibold leading-[1.02] text-gz-ink tracking-[-0.01em]">
            Revista <span className="italic font-normal text-gz-red">IURIS</span>
          </h1>

          <p className="font-cormorant italic text-[20px] sm:text-[24px] text-gz-ink-mid mt-3 leading-snug max-w-xl mx-auto">
            Edición mensual con los mejores ensayos y análisis del claustro.
          </p>
        </div>

        <div className="my-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-gz-rule" />
          <span className="font-cormorant italic text-3xl text-gz-gold opacity-60">
            §
          </span>
          <div className="h-px flex-1 bg-gz-rule" />
        </div>

        <article className="mx-auto max-w-[600px] border border-gz-ink bg-white p-8 sm:p-12 text-center">
          <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-light mb-4">
            — En imprenta —
          </div>
          <p className="font-cormorant text-[22px] sm:text-[26px] leading-snug text-gz-ink">
            Una vez al mes, lo mejor escrito por la comunidad se imprime junto
            en un <span className="italic">ejemplar curado</span>.
          </p>
          <p className="font-archivo text-[13px] leading-relaxed text-gz-ink-mid mt-4">
            La revista reúne ensayos, análisis de sentencia y columnas
            destacadas por el peer review. Editada bajo estándares académicos y
            abierta a toda la comunidad.
          </p>

          <Link
            href="/dashboard/diario"
            className="mt-8 inline-flex items-center gap-2 font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-ink text-gz-ink px-5 py-2.5 hover:bg-gz-ink hover:text-gz-cream transition-colors cursor-pointer"
          >
            Leer publicaciones recientes
          </Link>
        </article>

        <p className="mt-10 text-center font-cormorant italic text-[15px] text-gz-ink-light">
          — Próximamente —
        </p>
      </div>
    </main>
  );
}
