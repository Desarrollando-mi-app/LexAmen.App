"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4">
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">⚖️</p>
        <h1 className="text-2xl font-bold text-navy">Iuris Studio</h1>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-navy">Algo salió mal</h2>
          <p className="mt-2 text-sm text-navy/60">
            Ocurrió un error inesperado. Puedes intentar de nuevo o volver al
            inicio.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-navy/30 font-mono">
              Código: {error.digest}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-paper hover:bg-navy/90 transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border-2 border-navy px-5 py-2.5 text-sm font-semibold text-navy hover:bg-navy hover:text-paper transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>

      <footer className="absolute bottom-6 text-xs text-navy/30">
        Iuris Studio — Si el problema persiste, contacta soporte.
      </footer>
    </main>
  );
}
