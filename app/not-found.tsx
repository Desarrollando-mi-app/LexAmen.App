import Link from "next/link";
/* eslint-disable @next/next/no-img-element */

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="text-center max-w-md">
        <img
          src="/brand/logo-horizontal.svg"
          alt="Studio Iuris"
          width={200}
          height={44}
          className="h-[40px] w-auto mx-auto mb-4"
        />

        <div className="mt-8">
          <p className="font-cormorant text-[72px] !font-bold text-gz-ink leading-none">404</p>
          <h2 className="font-cormorant text-[22px] text-gz-ink-mid mt-2">
            Pagina no encontrada
          </h2>
          <p className="mt-2 font-archivo text-[14px] text-gz-ink-light">
            La pagina que buscas no existe o fue movida.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 font-ibm-mono text-[10px] text-gz-ink-light/50">
        Studio <span className="text-gz-red">Iuris</span> — Derecho Civil &amp; Procesal Civil
      </footer>
    </main>
  );
}
