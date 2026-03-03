import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./dashboard/components/theme-toggle";

// ─── Data ────────────────────────────────────────────────

const FEATURES = [
  {
    emoji: "📇",
    title: "Flashcards inteligentes",
    description:
      "Repasa conceptos clave con tarjetas que se adaptan a tu ritmo de aprendizaje mediante repetición espaciada.",
  },
  {
    emoji: "✅",
    title: "Selección Múltiple",
    description:
      "Pon a prueba tu conocimiento con preguntas de opción múltiple filtradas por materia y dificultad.",
  },
  {
    emoji: "⚖️",
    title: "Verdadero / Falso",
    description:
      "Evalúa tu comprensión de la norma con afirmaciones jurídicas que debes calificar como verdaderas o falsas.",
  },
  {
    emoji: "⚔️",
    title: "Causas (Duelos)",
    description:
      "Desafía a tus compañeros en competencias 1v1 o grupales. Gana XP y sube en la liga.",
  },
  {
    emoji: "🏆",
    title: "Liga semanal",
    description:
      "Compite cada semana contra otros estudiantes. Asciende de tier desde Cartón hasta Jurisconsulto.",
  },
  {
    emoji: "🏛️",
    title: "La Sala",
    description:
      "Conecta con tutores y estudiantes. Ofrece o busca ayudantías de Derecho Civil y Procesal.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Crea tu cuenta gratis",
    description: "Regístrate en segundos con tu email o cuenta de Google.",
  },
  {
    num: "02",
    title: "Elige qué estudiar",
    description:
      "Selecciona materia, submateria y nivel de dificultad. Los filtros se guardan automáticamente.",
  },
  {
    num: "03",
    title: "Aprende y compite",
    description:
      "Domina las flashcards, resuelve preguntas, desafía a tus compañeros y sube en la liga.",
  },
];

// ─── Page ────────────────────────────────────────────────

export default async function HomePage() {
  // Redirect logged-in users to dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-paper">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-navy/10 bg-navy/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <span className="font-serif text-xl font-bold text-paper">
              LéxAmen
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-paper/80 transition-colors hover:text-paper"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold/90"
            >
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy px-6 py-24 text-center lg:py-32">
        {/* Decorative bg circles */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gold/5" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[300px] w-[300px] rounded-full bg-gold/5" />

        <div className="relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-gold/15 px-4 py-1.5 text-xs font-semibold text-gold">
            Preparación de examen de grado
          </span>
          <h1 className="mt-6 font-serif text-4xl font-bold leading-tight text-paper sm:text-5xl lg:text-6xl">
            Domina el Derecho Civil y Procesal Civil
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-paper/70">
            La plataforma de estudio diseñada por y para estudiantes de Derecho
            en Chile. Flashcards, preguntas, duelos y más.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-gold/25 transition-all hover:bg-gold/90 hover:shadow-xl hover:shadow-gold/30"
            >
              Comenzar gratis
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl border-2 border-paper/20 px-8 py-3.5 text-base font-semibold text-paper transition-colors hover:border-paper/40 hover:bg-paper/5"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        {/* Mockup cards */}
        <div className="relative mx-auto mt-16 flex max-w-2xl justify-center gap-4">
          <div className="w-48 rotate-[-6deg] rounded-xl border border-paper/10 bg-paper/5 p-4 backdrop-blur-sm sm:w-56">
            <p className="text-xs font-semibold text-gold">Flashcard</p>
            <p className="mt-2 text-sm text-paper/80">
              ¿Cuál es el plazo de prescripción de la acción ejecutiva?
            </p>
            <div className="mt-3 h-px bg-paper/10" />
            <p className="mt-2 text-xs text-paper/50">Nivel: Básico</p>
          </div>
          <div className="w-48 rotate-[3deg] rounded-xl border border-paper/10 bg-paper/5 p-4 backdrop-blur-sm sm:w-56">
            <p className="text-xs font-semibold text-gold">Sel. Múltiple</p>
            <p className="mt-2 text-sm text-paper/80">
              La competencia absoluta se determina por...
            </p>
            <div className="mt-3 space-y-1.5">
              <div className="rounded bg-paper/10 px-2 py-1 text-xs text-paper/60">
                A) Cuantía, materia y fuero
              </div>
              <div className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-300">
                B) Cuantía, materia y fuero ✓
              </div>
            </div>
          </div>
          <div className="hidden w-48 rotate-[8deg] rounded-xl border border-paper/10 bg-paper/5 p-4 backdrop-blur-sm sm:block sm:w-56">
            <p className="text-xs font-semibold text-gold">Causa ⚔️</p>
            <p className="mt-2 text-sm text-paper/80">vs María González</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-green-400">7 pts</span>
              <span className="text-paper/30">—</span>
              <span className="text-xs text-red-400">4 pts</span>
            </div>
            <p className="mt-2 text-xs text-gold">Victoria 🏆</p>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────── */}
      <section className="px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-navy sm:text-4xl">
              Todo lo que necesitas para preparar tu examen
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-navy/60">
              Herramientas diseñadas específicamente para el estudio del Derecho
              Civil y Procesal Civil chileno.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-white p-6 transition-all hover:border-gold/30 hover:shadow-lg"
              >
                <span className="text-3xl">{f.emoji}</span>
                <h3 className="mt-4 text-lg font-semibold text-navy">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy/60">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ───────────────────────────────────── */}
      <section className="border-y border-border bg-white px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-navy sm:text-4xl">
              Comienza en 3 simples pasos
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-paper">
                  {s.num}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-navy">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-navy/60">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────────── */}
      <section className="px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: "1.500+", label: "Flashcards" },
              { value: "500+", label: "Preguntas MCQ" },
              { value: "9", label: "Tiers de liga" },
              { value: "100%", label: "Gratis" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-navy sm:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-navy/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────── */}
      <section className="border-y border-border bg-white px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-navy sm:text-4xl">
              Simple y accesible
            </h2>
            <p className="mt-4 text-navy/60">
              Comienza gratis. Mejora cuando quieras.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-2xl gap-6 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl border border-border p-8">
              <h3 className="text-lg font-bold text-navy">Gratis</h3>
              <p className="mt-1 text-3xl font-bold text-navy">
                $0
                <span className="text-base font-normal text-navy/50">
                  {" "}
                  / siempre
                </span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-navy/70">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> 30 flashcards/día
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> 10 preguntas
                  MCQ/día
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> 20 preguntas V/F
                  por día
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> Causas y liga
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span> La Sala
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-8 block rounded-xl border-2 border-navy px-6 py-3 text-center text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-paper"
              >
                Comenzar gratis
              </Link>
            </div>

            {/* Premium */}
            <div className="relative rounded-2xl border-2 border-gold bg-gold/5 p-8">
              <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 text-xs font-bold text-white">
                Recomendado
              </span>
              <h3 className="text-lg font-bold text-navy">Premium</h3>
              <p className="mt-1 text-3xl font-bold text-navy">
                Próximamente
              </p>
              <ul className="mt-6 space-y-3 text-sm text-navy/70">
                <li className="flex items-center gap-2">
                  <span className="text-gold">★</span> Flashcards ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">★</span> Preguntas ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">★</span> Estadísticas avanzadas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">★</span> Contenido exclusivo
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gold">★</span> Sin publicidad
                </li>
              </ul>
              <div className="mt-8 rounded-xl bg-gold/20 px-6 py-3 text-center text-sm font-semibold text-gold">
                Disponible pronto
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Final ──────────────────────────────────────── */}
      <section className="bg-navy px-6 py-20 text-center lg:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-3xl font-bold text-paper sm:text-4xl">
            Empieza a preparar tu examen hoy
          </h2>
          <p className="mt-4 text-paper/60">
            Únete a otros estudiantes de Derecho que ya están usando LéxAmen para
            dominar la materia.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gold px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-gold/25 transition-all hover:bg-gold/90"
          >
            Crear mi cuenta gratis
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border bg-paper px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            <span className="font-serif font-bold text-navy">LéxAmen</span>
          </div>
          <p className="text-sm text-navy/40">
            &copy; {new Date().getFullYear()} LéxAmen — Chile. Todos los
            derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
