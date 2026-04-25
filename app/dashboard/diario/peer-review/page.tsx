import Link from "next/link";
import { MastheadAcademia } from "@/components/academia/masthead-academia";

export const metadata = {
  title: "Peer Review — Studio Iuris",
  description:
    "Revisión entre pares de publicaciones académicas en el Diario de Studio Iuris.",
};

/**
 * Peer Review aún está en imprenta — la sección comparte el masthead V4
 * de Academia para mantener la coherencia visual con Debates, Expediente,
 * Ranking y Eventos, pero el cuerpo describe el módulo en preparación.
 */
export default function PeerReviewPage() {
  return (
    <main
      className="min-h-screen pb-24"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <MastheadAcademia
        seccion="Peer Review"
        glyph="✠"
        subtitulo="Revisión entre pares de publicaciones académicas — antes de imprenta."
        eyebrowExtra="En preparación"
      />

      <section className="max-w-[1400px] mx-auto px-7 mt-12">
        <div className="mx-auto max-w-[640px]">
          <article className="border border-gz-ink bg-white p-8 sm:p-12 text-center">
            <div className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-ink-light mb-4">
              — En imprenta —
            </div>
            <p className="font-cormorant text-[22px] sm:text-[26px] leading-[1.3] text-gz-ink">
              Antes de imprimirse, cada ensayo pasa por la mirada de tres{" "}
              <span className="italic">colegas de la misma rama</span>.
            </p>
            <p className="font-archivo text-[13px] leading-[1.65] text-gz-ink-mid mt-4">
              Pronto podrás revisar, comentar y recomendar mejoras sobre
              publicaciones en curso. El mejor borrador es el que ha sido leído
              por pares exigentes.
            </p>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-gz-rule" />
              <span className="font-cormorant italic text-2xl text-gz-gold opacity-60">
                §
              </span>
              <div className="h-px flex-1 bg-gz-rule" />
            </div>

            <p className="font-cormorant italic text-[16px] text-gz-ink-mid">
              Mientras tanto, sigue leyendo y publicando en el Diario.
            </p>

            <Link
              href="/dashboard/diario"
              className="mt-6 inline-flex items-center gap-2 font-ibm-mono text-[10.5px] uppercase tracking-[1.5px] border border-gz-ink text-gz-ink px-5 py-2.5 rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
            >
              Ir a publicaciones →
            </Link>
          </article>

          <p className="mt-8 text-center font-cormorant italic text-[15px] text-gz-ink-light">
            — Próximamente —
          </p>
        </div>
      </section>
    </main>
  );
}
