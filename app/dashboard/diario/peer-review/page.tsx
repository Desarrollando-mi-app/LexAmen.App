import Link from "next/link";

export const metadata = {
  title: "Peer Review · Studio Iuris",
  description: "Revisión entre pares de publicaciones académicas",
};

export default function PeerReviewPage() {
  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center">
          <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
            — Academia · Sección III —
          </div>

          <h1 className="font-cormorant text-[40px] sm:text-[56px] !font-semibold leading-[1.02] text-gz-ink tracking-[-0.01em]">
            Peer Review
          </h1>

          <p className="font-cormorant italic text-[20px] sm:text-[24px] text-gz-ink-mid mt-3 leading-snug max-w-xl mx-auto">
            Revisión entre pares de publicaciones académicas.
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
            Antes de imprimirse, cada ensayo pasa por la mirada de tres{" "}
            <span className="italic">colegas de la misma rama</span>.
          </p>
          <p className="font-archivo text-[13px] leading-relaxed text-gz-ink-mid mt-4">
            Pronto podrás revisar, comentar y recomendar mejoras sobre
            publicaciones en curso. El mejor borrador es el que ha sido leído
            por pares exigentes.
          </p>

          <Link
            href="/dashboard/diario"
            className="mt-8 inline-flex items-center gap-2 font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-ink text-gz-ink px-5 py-2.5 hover:bg-gz-ink hover:text-gz-cream transition-colors cursor-pointer"
          >
            Ir a publicaciones
          </Link>
        </article>

        <p className="mt-10 text-center font-cormorant italic text-[15px] text-gz-ink-light">
          — Próximamente —
        </p>
      </div>
    </main>
  );
}
