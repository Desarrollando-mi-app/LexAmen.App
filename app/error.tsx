"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="text-center max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-horizontal.svg"
          alt="Studio Iuris"
          width={200}
          height={44}
          className="h-[40px] w-auto mx-auto mb-4"
        />

        <div className="mt-8">
          <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">Algo salio mal</h2>
          <p className="mt-2 font-archivo text-[14px] text-gz-ink-light">
            Ocurrio un error inesperado. Puedes intentar de nuevo o volver al
            inicio.
          </p>
          {error.digest && (
            <p className="mt-2 font-ibm-mono text-[10px] text-gz-ink-light/50">
              Codigo: {error.digest}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-[3px] border-2 border-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-gz-navy hover:bg-gz-navy hover:text-white transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>

      <footer className="absolute bottom-6 font-ibm-mono text-[10px] text-gz-ink-light/50">
        Studio <span className="text-gz-red">Iuris</span> — Si el problema persiste, contacta soporte.
      </footer>
    </main>
  );
}
