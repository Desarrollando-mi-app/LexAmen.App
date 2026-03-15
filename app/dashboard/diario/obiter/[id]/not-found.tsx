import Link from "next/link";

export default function ObiterNotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-md px-4 text-center">
        <p className="mb-4 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
          404 · No encontrado
        </p>
        <h1 className="mb-4 font-cormorant text-[32px] !font-bold text-gz-ink">
          Este Obiter no existe o fue eliminado
        </h1>
        <p className="mb-8 font-archivo text-[14px] text-gz-ink-mid">
          El Obiter que buscas pudo haber sido removido por su autor o no existe
          en nuestros registros.
        </p>
        <Link
          href="/dashboard/diario"
          className="inline-block rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Diario
        </Link>
      </div>
    </div>
  );
}
