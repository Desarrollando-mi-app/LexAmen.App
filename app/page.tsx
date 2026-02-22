import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-navy">
          LéxAmen
        </h1>
        <p className="mt-4 text-lg text-navy/70">
          Aprende Derecho Civil y Procesal Civil de forma inteligente
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/register">
            <Button variant="primary">Comenzar gratis</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Iniciar sesión</Button>
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 text-sm text-navy/40">
        LéxAmen &copy; {new Date().getFullYear()} — Chile
      </footer>
    </main>
  );
}
