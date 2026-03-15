import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "./dashboard/components/theme-toggle";
import { PlanInstitucionalCard } from "./plan-institucional-card";

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
      "Selecciona rama, libro, título y dificultad. Los filtros se guardan automáticamente.",
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
    <main className="gz-page min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-gz-navy/10 bg-gz-navy/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={32}
              height={32}
              className="h-[32px] w-[32px]"
            />
            <span className="font-cormorant text-[22px] !font-bold text-white">
              Studio <span className="text-gz-red">Iuris</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-[3px] px-4 py-2 font-archivo text-[13px] font-medium text-white/80 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-[3px] bg-gz-gold px-5 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-white hover:text-gz-navy transition-colors"
            >
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gz-navy px-6 py-24 text-center lg:py-32">
        {/* Decorative bg circles */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gz-gold/5" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[300px] w-[300px] rounded-full bg-gz-gold/5" />

        <div className="relative mx-auto max-w-3xl">
          <Image
            src="/brand/logo-horizontal.svg"
            alt="Studio Iuris"
            width={360}
            height={78}
            className="mx-auto h-[56px] w-auto mb-6"
            priority
          />
          <span className="inline-block rounded-sm bg-gz-gold/15 px-4 py-1.5 font-ibm-mono text-[10px] uppercase tracking-[1px] font-semibold text-gz-gold-bright">
            Preparación de examen de grado
          </span>
          <h1 className="mt-6 font-cormorant text-[40px] sm:text-[48px] lg:text-[56px] !font-bold leading-tight text-white">
            Domina el <em>Derecho</em> Civil y Procesal Civil
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-cormorant text-[18px] lg:text-[20px] text-white/70 italic">
            La plataforma de estudio diseñada por y para estudiantes de Derecho
            en Chile. Flashcards, preguntas, duelos y más.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-[3px] bg-gz-gold px-8 py-3.5 font-archivo text-[15px] font-semibold text-white shadow-sm shadow-gz-gold/25 transition-all hover:bg-white hover:text-gz-navy"
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
              className="inline-flex items-center rounded-[3px] border-2 border-white/20 px-8 py-3.5 font-archivo text-[15px] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        {/* Mockup cards */}
        <div className="relative mx-auto mt-16 flex max-w-2xl justify-center gap-4">
          <div className="w-48 rotate-[-6deg] rounded-[4px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:w-56">
            <p className="font-ibm-mono text-[10px] uppercase tracking-[0.5px] font-semibold text-gz-gold-bright">Flashcard</p>
            <p className="mt-2 font-cormorant text-[14px] text-white/80">
              ¿Cuál es el plazo de prescripción de la acción ejecutiva?
            </p>
            <div className="mt-3 h-px bg-white/10" />
            <p className="mt-2 font-ibm-mono text-[10px] text-white/50">Nivel: Básico</p>
          </div>
          <div className="w-48 rotate-[3deg] rounded-[4px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:w-56">
            <p className="font-ibm-mono text-[10px] uppercase tracking-[0.5px] font-semibold text-gz-gold-bright">Sel. Múltiple</p>
            <p className="mt-2 font-cormorant text-[14px] text-white/80">
              La competencia absoluta se determina por...
            </p>
            <div className="mt-3 space-y-1.5">
              <div className="rounded bg-white/10 px-2 py-1 font-archivo text-[11px] text-white/60">
                A) Cuantía, materia y fuero
              </div>
              <div className="rounded bg-gz-sage/20 px-2 py-1 text-xs text-gz-sage">
                B) Cuantía, materia y fuero ✓
              </div>
            </div>
          </div>
          <div className="hidden w-48 rotate-[8deg] rounded-[4px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:block sm:w-56">
            <p className="font-ibm-mono text-[10px] uppercase tracking-[0.5px] font-semibold text-gz-gold-bright">Causa ⚔️</p>
            <p className="mt-2 font-cormorant text-[14px] text-white/80">vs María González</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gz-sage">7 pts</span>
              <span className="text-white/30">—</span>
              <span className="text-xs text-gz-burgundy">4 pts</span>
            </div>
            <p className="mt-2 text-xs text-gz-gold-bright">Victoria 🏆</p>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ──────────────────────────────────── */}
      <section className="px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-cormorant text-[28px] sm:text-[36px] !font-bold text-gz-ink">
              Todo lo que necesitas para preparar tu examen
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-archivo text-[15px] text-gz-ink-mid leading-relaxed">
              Herramientas diseñadas específicamente para el estudio del Derecho
              Civil y Procesal Civil chileno.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-[4px] border border-gz-rule bg-white p-6 transition-all hover:border-gz-gold hover:shadow-sm"
              >
                <span className="text-3xl">{f.emoji}</span>
                <h3 className="mt-4 font-cormorant text-[18px] !font-bold text-gz-ink">
                  {f.title}
                </h3>
                <p className="mt-2 font-archivo text-[14px] leading-relaxed text-gz-ink-mid">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it Works ───────────────────────────────────── */}
      <section className="border-y border-gz-rule bg-white px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-cormorant text-[28px] sm:text-[36px] !font-bold text-gz-ink">
              Comienza en 3 simples pasos
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gz-navy font-ibm-mono text-[16px] font-bold text-white">
                  {s.num}
                </div>
                <h3 className="mt-4 font-cormorant text-[18px] !font-bold text-gz-ink">
                  {s.title}
                </h3>
                <p className="mt-2 font-archivo text-[14px] text-gz-ink-mid">{s.description}</p>
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
                <p className="font-cormorant text-[32px] sm:text-[40px] !font-bold text-gz-ink">
                  {s.value}
                </p>
                <p className="mt-1 font-ibm-mono text-[11px] uppercase tracking-[1px] text-gz-ink-light">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────── */}
      <section className="border-y border-gz-rule bg-white px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-cormorant text-[28px] sm:text-[36px] !font-bold text-gz-ink">
              Simple y accesible
            </h2>
            <p className="mt-4 font-archivo text-[15px] text-gz-ink-mid">
              Comienza gratis. Mejora cuando quieras.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Free */}
            <div className="rounded-[4px] border border-gz-rule p-8">
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">Gratis</h3>
              <p className="mt-1 font-cormorant text-[32px] !font-bold text-gz-ink">
                $0
                <span className="font-archivo text-[14px] font-normal text-gz-ink-light">
                  {" "}
                  / siempre
                </span>
              </p>
              <ul className="mt-6 space-y-3 font-archivo text-[14px] text-gz-ink-mid">
                <li className="flex items-center gap-2">
                  <span className="text-gz-sage">✓</span> 30 flashcards/día
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gz-sage">✓</span> 10 preguntas
                  MCQ/día
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gz-sage">✓</span> 20 preguntas V/F
                  por día
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gz-sage">✓</span> Causas y liga
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gz-sage">✓</span> La Sala
                </li>
              </ul>
              <Link
                href="/register"
                className="mt-8 block rounded-[3px] border-2 border-gz-navy px-6 py-3 text-center font-archivo text-[14px] font-semibold text-gz-navy transition-colors hover:bg-gz-navy hover:text-white"
              >
                Comenzar gratis
              </Link>
            </div>

            {/* Premium */}
            <div className="relative rounded-[4px] border-2 border-gz-gold bg-gz-gold/[0.06] p-8">
              <span className="absolute -top-3 left-6 rounded-sm bg-gz-gold px-3 py-1 font-ibm-mono text-[10px] uppercase tracking-[0.5px] font-bold text-white">
                Recomendado
              </span>
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">Premium</h3>
              <p className="mt-1 font-cormorant text-[32px] !font-bold text-gz-ink">
                Próximamente
              </p>
              <ul className="mt-6 space-y-3 font-archivo text-[14px] text-gz-ink-mid">
                <li className="flex items-center gap-2">
                  <span className="text-gz-gold">★</span> Flashcards ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gz-gold">★</span> Preguntas ilimitadas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gz-gold">★</span> Estadísticas avanzadas
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gz-gold">★</span> Contenido exclusivo
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gz-gold">★</span> Sin publicidad
                </li>
              </ul>
              <div className="mt-8 rounded-[3px] bg-gz-gold/20 px-6 py-3 text-center font-archivo text-[14px] font-semibold text-gz-gold">
                Disponible pronto
              </div>
            </div>

            {/* Plan Institucional */}
            <PlanInstitucionalCard />
          </div>
        </div>
      </section>

      {/* ─── CTA Final ──────────────────────────────────────── */}
      <section className="bg-gz-navy px-6 py-20 text-center lg:py-28">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-cormorant text-[28px] sm:text-[36px] !font-bold text-white">
            Empieza a preparar tu <em>examen</em> hoy
          </h2>
          <p className="mt-4 font-archivo text-[15px] text-white/60">
            Únete a otros estudiantes de Derecho que ya están usando Studio <span className="text-gz-red">Iuris</span> para
            dominar la materia.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-[3px] bg-gz-gold px-8 py-3.5 font-archivo text-[15px] font-semibold text-white shadow-sm shadow-gz-gold/25 transition-all hover:bg-white hover:text-gz-navy"
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
      <footer className="border-t border-gz-rule px-6 py-8" style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={36}
              height={36}
              className="h-[28px] w-[28px] opacity-60"
            />
            <span className="font-cormorant text-[18px] !font-bold text-gz-ink">
              Studio <span className="text-gz-red">Iuris</span>
            </span>
          </div>
          <p className="font-ibm-mono text-[10px] text-gz-ink-light/50">
            &copy; {new Date().getFullYear()} Studio Iuris — Chile. Todos los
            derechos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
