import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4">
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">⚖️</p>
        <h1 className="text-2xl font-bold text-navy">Iuris Studio</h1>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-navy">
            404 — Página no encontrada
          </h2>
          <p className="mt-2 text-sm text-navy/60">
            La página que buscas no existe o fue movida.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-paper hover:bg-navy/90 transition-colors"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 text-xs text-navy/30">
        Iuris Studio — Derecho Civil &amp; Procesal Civil
      </footer>
    </main>
  );
}
