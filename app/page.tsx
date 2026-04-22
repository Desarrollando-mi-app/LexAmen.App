import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GRADOS, NIVELES } from "@/lib/league";
import { ScrollReveal } from "./landing-animations";
import type { Metadata } from "next";

// ─── SEO ──────────────────────────────────────────────────

export const metadata: Metadata = {
  title:
    "Studio Iuris · La comunidad jurídica donde estudias, compites, publicas y creces",
  description:
    "Plataforma de aprendizaje jurídico gamificada para estudiantes de derecho, egresados y abogados en Chile. Flashcards, simulacro oral con IA, La Vida del Derecho, publicaciones académicas y comunidad profesional.",
  keywords: [
    "derecho chile",
    "examen de grado",
    "flashcards derecho",
    "simulacro oral",
    "estudiantes derecho",
    "comunidad jurídica",
    "studio iuris",
  ],
  openGraph: {
    title: "Studio Iuris · Tu comunidad jurídica",
    description: "Desde el primer día de carrera hasta la vida profesional.",
    url: "https://studioiuris.cl",
    type: "website",
  },
};

// ─── Helpers (romanos) ────────────────────────────────────

function toRoman(num: number): string {
  const map: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let r = "", n = Math.max(0, Math.floor(num));
  for (const [v, s] of map) {
    while (n >= v) {
      r += s;
      n -= v;
    }
  }
  return r || "I";
}

function mastheadDate() {
  const now = new Date();
  return {
    yearArabic: now.getFullYear(),
  };
}

// ─── Icons (Heroicons/Lucide-flavored, outline 1.5) ───────

const Icon = {
  BookOpen: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  Scale: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
    </svg>
  ),
  Newspaper: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
    </svg>
  ),
  Users: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  TrendingUp: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  ),
  Briefcase: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  ),
  AcademicCap: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  ),
  Check: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
  X: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  ArrowRight: (p: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={p.className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  ),
};

// ─── Data ─────────────────────────────────────────────────

type PilarKey = "estudio" | "diario" | "comunidad" | "actualidad" | "liga" | "carrera";

const PILARES: Array<{
  key: PilarKey;
  icon: (p: { className?: string }) => JSX.Element;
  roman: string;
  eyebrow: string;
  title: string;
  items: string[];
  available: boolean;
}> = [
  {
    key: "estudio",
    icon: Icon.BookOpen,
    roman: "I",
    eyebrow: "Aula",
    title: "Estudio activo",
    items: [
      "Flashcards con repetición espaciada",
      "Simulacro oral con 5 interrogadores IA",
      "Plan de estudios personalizado",
    ],
    available: true,
  },
  {
    key: "liga",
    icon: Icon.Scale,
    roman: "II",
    eyebrow: "Palestra",
    title: "Liga y causas",
    items: [
      "La Vida del Derecho: 33 grados",
      "Liga semanal con ascensos y descensos",
      "Causas 1v1 y grupales",
      "Noventa insignias desbloqueables",
    ],
    available: true,
  },
  {
    key: "diario",
    icon: Icon.Newspaper,
    roman: "III",
    eyebrow: "Imprenta",
    title: "El Diario",
    items: [
      "Obiter Dictum · opinión breve",
      "Análisis de sentencia",
      "Ensayos y columnas académicas",
    ],
    available: true,
  },
  {
    key: "comunidad",
    icon: Icon.Users,
    roman: "IV",
    eyebrow: "Claustro",
    title: "Comunidad",
    items: [
      "Red de colegas",
      "La Sala · ayudantías y eventos",
      "Conversación entre pares",
    ],
    available: false,
  },
  {
    key: "carrera",
    icon: Icon.TrendingUp,
    roman: "V",
    eyebrow: "Reputación",
    title: "Perfil profesional",
    items: [
      "Perfil verificable",
      "Mentoría entre pares",
      "Historial público de actividad",
    ],
    available: false,
  },
  {
    key: "actualidad",
    icon: Icon.Briefcase,
    roman: "VI",
    eyebrow: "Foro",
    title: "Vida profesional",
    items: [
      "Directorio de abogados",
      "Bolsa de trabajo jurídico",
      "Prácticas profesionales",
    ],
    available: false,
  },
];

const COMPARACION: Array<{ feature: string; otros: boolean | string; si: boolean | string }> = [
  { feature: "Repetición espaciada", otros: false, si: true },
  { feature: "Simulacro oral con IA", otros: false, si: true },
  { feature: "La Vida del Derecho (33 grados)", otros: false, si: true },
  { feature: "Causas 1v1 y grupales", otros: false, si: true },
  { feature: "Publicación académica", otros: false, si: true },
  { feature: "Comunidad integrada", otros: false, si: true },
  { feature: "Perfil profesional", otros: false, si: true },
  { feature: "Acompañamiento post-grado", otros: false, si: true },
  { feature: "Suscripción mensual", otros: "$30–70 mil", si: "Desde gratis" },
];

const FORMATOS: Array<{
  roman: string;
  grupo: string;
  nombre: string;
  desc: string;
}> = [
  { roman: "I", grupo: "Recordación", nombre: "Flashcards", desc: "Repetición espaciada con algoritmo de Ebbinghaus." },
  { roman: "II", grupo: "Recordación", nombre: "Definiciones", desc: "Términos y conceptos jurídicos esenciales." },
  { roman: "III", grupo: "Recordación", nombre: "Dictado jurídico", desc: "Transcripción de artículos de memoria." },
  { roman: "IV", grupo: "Discriminación", nombre: "Opción múltiple", desc: "Preguntas con distractores y explicación." },
  { roman: "V", grupo: "Discriminación", nombre: "Verdadero o falso", desc: "Afirmaciones que exigen fundamentación." },
  { roman: "VI", grupo: "Composición", nombre: "Completar espacios", desc: "Cloze sobre artículos y normas." },
  { roman: "VII", grupo: "Composición", nombre: "Identificar errores", desc: "Detectar incorrecciones en textos legales." },
  { roman: "VIII", grupo: "Composición", nombre: "Relacionar columnas", desc: "Emparejar conceptos, normas y supuestos." },
  { roman: "IX", grupo: "Composición", nombre: "Ordenar secuencias", desc: "Procedimientos paso a paso." },
  { roman: "X", grupo: "Composición", nombre: "Línea de tiempo", desc: "Cronologías históricas y procesales." },
  { roman: "XI", grupo: "Aplicación", nombre: "Casos prácticos", desc: "Aplicación de normas a hechos concretos." },
  { roman: "XII", grupo: "Aplicación", nombre: "Integradores", desc: "Ejercicios mixtos entre ramas del derecho." },
  { roman: "XIII", grupo: "Oral", nombre: "Simulacro oral", desc: "Cinco interrogadores IA con dificultad adaptativa." },
  { roman: "XIV", grupo: "Competitiva", nombre: "Causas", desc: "Duelos 1v1 y multijugador entre usuarios." },
];

const PARA_QUIEN: Array<{
  eyebrow: string;
  roman: string;
  icon: (p: { className?: string }) => JSX.Element;
  title: string;
  description: string;
  cta: string;
  href: string;
}> = [
  {
    eyebrow: "Estado primero",
    roman: "I",
    icon: Icon.BookOpen,
    title: "Estudiante",
    description:
      "Construye tu perfil profesional desde el primer día. Flashcards, causas entre pares y tu primera publicación.",
    cta: "Soy estudiante",
    href: "/register",
  },
  {
    eyebrow: "Estado segundo",
    roman: "II",
    icon: Icon.AcademicCap,
    title: "Egresado",
    description:
      "Simulacro oral con cinco interrogadores IA, plan de estudios personalizado y una comunidad que te acompaña al grado.",
    cta: "Preparo el grado",
    href: "/register",
  },
  {
    eyebrow: "Estado tercero",
    roman: "III",
    icon: Icon.Scale,
    title: "Abogado",
    description:
      "Publica, mentora, conecta. Tu reputación profesional verificable en un solo lugar.",
    cta: "Ejerzo el derecho",
    href: "/register",
  },
];

const NIVEL_ORDER: Array<keyof typeof NIVELES> = [
  "ESCUELA",
  "PRACTICA",
  "ESTRADO",
  "MAGISTRATURA",
  "CONSEJO",
];

const NIVEL_GRADO_COUNTS: Record<string, number> = {
  ESCUELA: 3,
  PRACTICA: 11,
  ESTRADO: 4,
  MAGISTRATURA: 12,
  CONSEJO: 3,
};

// ─── Page ─────────────────────────────────────────────────

export default async function HomePage() {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/portada");

  const md = mastheadDate();

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      {/* ═══ MASTHEAD (sticky) ════════════════════════════════ */}
      <header
        className="sticky top-0 z-50 border-t-[3px] border-b border-gz-ink"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
          {/* Top row: nameplate (centered) */}
          <div className="flex items-center justify-center pt-2">
            <Link
              href="/"
              className="font-cormorant text-[20px] sm:text-[22px] !font-bold text-gz-ink leading-none flex items-center gap-2"
            >
              <Image
                src="/brand/logo-sello.svg"
                alt=""
                width={22}
                height={22}
                className="h-[22px] w-[22px]"
              />
              <span>
                Studio <span className="italic font-normal text-gz-red">IURIS</span>
              </span>
            </Link>
          </div>
          {/* Bottom row: nav / CTAs */}
          <div className="flex items-center justify-between pt-2 pb-2 border-t border-gz-rule mt-2">
            <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink-mid hidden md:block">
              La comunidad jurídica
            </div>
            <div className="flex items-center gap-2 sm:gap-3 ml-auto">
              <Link
                href="/login"
                className="font-ibm-mono text-[10px] uppercase tracking-[2px] px-3 py-2 text-gz-ink-mid hover:text-gz-ink transition-colors cursor-pointer"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="font-ibm-mono text-[10px] uppercase tracking-[2px] bg-gz-ink text-gz-cream px-4 py-2 hover:bg-gz-burgundy transition-colors cursor-pointer"
              >
                Suscribirse ·
                <span className="text-gz-gold ml-1">gratis</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ S1 · PORTADA ═════════════════════════════════════ */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-10 sm:pt-14 pb-10 border-b-[3px] border-gz-ink relative">
        {/* corner ornaments */}
        <div className="absolute top-6 left-6 font-cormorant italic text-3xl text-gz-gold opacity-60">§</div>
        <div className="absolute top-6 right-6 font-cormorant italic text-3xl text-gz-gold opacity-60">§</div>

        <div className="text-center">
          <div className="font-ibm-mono text-[10px] uppercase tracking-[4px] text-gz-gold mb-4">
            — Edición de ingreso · {md.yearArabic} —
          </div>
          <h1 className="font-cormorant text-[52px] sm:text-[84px] lg:text-[112px] font-semibold leading-[0.9] text-gz-ink tracking-[-0.015em]">
            Studio <span className="italic font-normal text-gz-red">IURIS</span>
          </h1>
          <p className="font-cormorant italic text-[22px] sm:text-[28px] text-gz-ink-mid leading-snug mt-6 max-w-2xl mx-auto">
            La comunidad jurídica donde se <span className="text-gz-ink">estudia</span>,
            se <span className="text-gz-ink">compite</span>, se{" "}
            <span className="text-gz-ink">publica</span> y se{" "}
            <span className="text-gz-ink">crece</span>.
          </p>
          <p className="font-archivo text-[14px] text-gz-ink-light mt-4">
            Desde el primer día de carrera hasta la vida profesional.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 font-ibm-mono text-[11px] uppercase tracking-[3px] bg-gz-ink text-gz-cream px-7 py-3.5 hover:bg-gz-burgundy transition-colors cursor-pointer"
            >
              Suscribirse al ejemplar
              <Icon.ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center font-ibm-mono text-[11px] uppercase tracking-[3px] border border-gz-ink text-gz-ink px-7 py-3.5 hover:bg-gz-ink hover:text-gz-cream transition-colors cursor-pointer"
            >
              Ingresar al claustro
            </Link>
          </div>
        </div>

      </section>

      {/* ═══ S2 · EL PROBLEMA (editorial) ═════════════════════ */}
      <ScrollReveal>
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 sm:py-20 border-b border-gz-ink">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            <div className="lg:col-span-4">
              <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
                — Editorial —
              </div>
              <h2 className="font-cormorant text-[30px] sm:text-[40px] font-semibold leading-[1.05] text-gz-ink">
                El camino largo y solitario.
              </h2>
            </div>
            <div className="lg:col-span-8 lg:border-l lg:border-gz-rule lg:pl-8">
              <blockquote className="font-cormorant italic text-[28px] sm:text-[34px] leading-[1.15] text-gz-ink border-l-[3px] border-gz-gold pl-5 mb-6">
                «En Chile, estudiar Derecho es un camino largo y solitario.»
              </blockquote>
              <div className="space-y-3 font-archivo text-[15px] leading-relaxed text-gz-ink-mid max-w-2xl">
                <p>Se pasan cinco años memorizando códigos.</p>
                <p>Se prepara el grado a solas.</p>
                <p>Y si se aprueba, el mundo jurídico te recibe con un silencio.</p>
              </div>
              <p className="mt-6 font-ibm-mono text-[11px] uppercase tracking-[3px] text-gz-burgundy">
                — Eso es lo que cambia Studio Iuris.
              </p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ S3 · LOS PILARES (ledger 2×3) ════════════════════ */}
      <ScrollReveal>
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 sm:py-20 border-b border-gz-ink">
          <div className="text-center mb-10">
            <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
              — Secciones del ejemplar —
            </div>
            <h2 className="font-cormorant text-[32px] sm:text-[44px] font-semibold leading-[1.05] text-gz-ink">
              Seis pilares. Una plataforma.
            </h2>
            <p className="font-cormorant italic text-[18px] text-gz-ink-mid mt-2">
              Cuatro ya impresos, dos en imprenta.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-gz-rule">
            {PILARES.map((p) => {
              const IconComp = p.icon;
              return (
                <article
                  key={p.key}
                  className="border-r border-b border-gz-rule p-6 relative bg-transparent"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-gz-ink flex items-center justify-center text-gz-ink shrink-0">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                          {p.roman} · {p.eyebrow}
                        </div>
                        <h3 className="font-cormorant text-[22px] !font-semibold leading-tight text-gz-ink">
                          {p.title}
                        </h3>
                      </div>
                    </div>
                    <span
                      className={`font-ibm-mono text-[8px] uppercase tracking-[2px] px-1.5 py-0.5 border ${
                        p.available
                          ? "border-gz-sage text-gz-sage"
                          : "border-gz-rule-dark text-gz-ink-light"
                      }`}
                    >
                      {p.available ? "impreso" : "imprenta"}
                    </span>
                  </div>
                  <ul className="space-y-1.5 mt-3">
                    {p.items.map((item) => (
                      <li
                        key={item}
                        className="font-archivo text-[13px] text-gz-ink-mid leading-snug flex gap-2"
                      >
                        <span className="text-gz-gold select-none">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ S4 · TU RECORRIDO (3 columnas newspaper) ═════════ */}
      <ScrollReveal>
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 sm:py-20 border-b border-gz-ink">
          <div className="text-center mb-10">
            <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
              — Los tres estados del jurista —
            </div>
            <h2 className="font-cormorant text-[32px] sm:text-[44px] font-semibold leading-[1.05] text-gz-ink">
              Tu recorrido
            </h2>
            <p className="font-cormorant italic text-[18px] text-gz-ink-mid mt-2">
              Studio IURIS te acompaña en cada etapa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-gz-ink">
            <TrayectoriaCol
              roman="I"
              eyebrow="Estudiante"
              range="Años I–IV"
              body="Flashcards para tus ramos. Causas con compañeros. Tus primeras publicaciones. Liga por facultad."
            />
            <TrayectoriaCol
              roman="II"
              eyebrow="Egresado"
              range="Preparando grado"
              body="Plan de estudios con IA. Simulacro oral con cinco interrogadores. Cuenta regresiva al examen."
              bordered
            />
            <TrayectoriaCol
              roman="III"
              eyebrow="Abogado"
              range="Post-grado"
              body="Publica análisis. Mentora estudiantes. Perfil profesional verificable."
            />
          </div>

          <div className="mt-8 text-center">
            <p className="font-cormorant italic text-[22px] text-gz-ink-mid">
              — Una plataforma, la carrera entera. —
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ S5 · TALLER DE ESTUDIO ═══════════════════════════ */}
      <ScrollReveal>
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 sm:py-20 border-b border-gz-ink">
          <div className="text-center mb-10">
            <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
              — Taller de estudio —
            </div>
            <h2 className="font-cormorant text-[32px] sm:text-[44px] font-semibold leading-[1.05] text-gz-ink">
              Catorce formatos. Una sola biblioteca.
            </h2>
            <p className="font-cormorant italic text-[18px] text-gz-ink-mid mt-2 max-w-2xl mx-auto">
              Cada materia aprovecha el formato que mejor la enseña.
              De la tarjeta de repetición espaciada a la interrogación oral.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-gz-rule">
            {FORMATOS.map((f) => (
              <article
                key={f.roman}
                className="border-r border-b border-gz-rule p-5 flex flex-col"
              >
                <div className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-2">
                  {f.roman} · {f.grupo}
                </div>
                <h3 className="font-cormorant text-[22px] !font-semibold text-gz-ink leading-tight">
                  {f.nombre}
                </h3>
                <p className="font-archivo text-[13px] text-gz-ink-mid mt-1.5 leading-snug">
                  {f.desc}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-10 text-center font-cormorant italic text-[20px] text-gz-ink-mid">
            «Prepárate como si estuvieras frente a la comisión.»
          </p>
        </section>
      </ScrollReveal>

      {/* ═══ S6 · LA VIDA DEL DERECHO ═════════════════════════ */}
      <ScrollReveal>
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 sm:py-20 border-b border-gz-ink">
          <div className="text-center mb-10">
            <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
              — La Vida del Derecho —
            </div>
            <h2 className="font-cormorant text-[32px] sm:text-[44px] font-semibold leading-[1.05] text-gz-ink">
              Treinta y tres grados. Cinco niveles.
            </h2>
            <p className="font-cormorant italic text-[18px] text-gz-ink-mid mt-2">
              De Oyente a Jurisconsulto de la República.
            </p>
          </div>

          {/* Bar of 33 segments, framed */}
          <div className="mx-auto max-w-4xl border border-gz-ink p-1">
            <div className="flex overflow-hidden">
              {GRADOS.map((g) => (
                <div
                  key={g.grado}
                  className="h-10 flex-1 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: g.color }}
                  title={`Grado ${g.grado}: ${g.nombre}`}
                />
              ))}
            </div>
          </div>

          {/* Level labels */}
          <div className="mx-auto mt-3 flex max-w-4xl">
            {NIVEL_ORDER.map((key, i) => {
              const nivel = NIVELES[key];
              const count = NIVEL_GRADO_COUNTS[key];
              return (
                <div
                  key={key}
                  className="text-center"
                  style={{ flex: count }}
                >
                  <p
                    className="font-ibm-mono text-[9px] uppercase tracking-[2px] sm:text-[10px]"
                    style={{ color: nivel.color }}
                  >
                    {toRoman(i + 1)} · {nivel.label}
                  </p>
                  <p className="font-archivo text-[10px] text-gz-ink-light">
                    {count} grados
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ S7 · CUADRO COMPARATIVO ══════════════════════════ */}
      <ScrollReveal>
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 sm:py-20 border-b border-gz-ink">
          <div className="text-center mb-10">
            <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
              — Cuadro comparativo —
            </div>
            <h2 className="font-cormorant text-[32px] sm:text-[44px] font-semibold leading-[1.05] text-gz-ink">
              ¿Por qué Studio IURIS?
            </h2>
          </div>

          {/* Desktop table */}
          <div className="mt-6 hidden sm:block border border-gz-ink">
            <table className="w-full font-archivo text-[14px]">
              <thead>
                <tr className="border-b border-gz-ink">
                  <th className="px-5 py-3 text-left font-ibm-mono text-[10px] uppercase tracking-[2px] font-medium text-gz-ink-mid">
                    Concepto
                  </th>
                  <th className="px-5 py-3 text-center font-ibm-mono text-[10px] uppercase tracking-[2px] font-medium text-gz-ink-light w-[25%]">
                    Otros
                  </th>
                  <th className="px-5 py-3 text-center font-ibm-mono text-[10px] uppercase tracking-[2px] font-medium text-gz-ink w-[25%]">
                    Studio IURIS
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARACION.map((row) => (
                  <tr key={row.feature} className="border-b border-gz-rule last:border-0">
                    <td className="px-5 py-3 font-cormorant text-[17px] text-gz-ink">
                      {row.feature}
                    </td>
                    <td className="px-5 py-3 text-center text-gz-ink-light">
                      {typeof row.otros === "boolean" ? (
                        <Icon.X className="h-4 w-4 text-gz-burgundy mx-auto" />
                      ) : (
                        <span className="font-archivo text-[13px]">{row.otros}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {typeof row.si === "boolean" ? (
                        <Icon.Check className="h-4 w-4 text-gz-sage mx-auto" />
                      ) : (
                        <span className="font-archivo text-[13px] font-semibold text-gz-sage">
                          {row.si}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-6 space-y-0 border-t border-l border-gz-rule sm:hidden">
            {COMPARACION.map((row) => (
              <div
                key={row.feature}
                className="border-r border-b border-gz-rule p-4"
              >
                <p className="font-cormorant text-[17px] text-gz-ink leading-tight">
                  {row.feature}
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="font-archivo text-[12px] text-gz-ink-light flex items-center gap-1">
                    <Icon.X className="h-3.5 w-3.5 text-gz-burgundy" />{" "}
                    Otros: {typeof row.otros === "boolean" ? "No" : row.otros}
                  </span>
                  <span className="font-archivo text-[12px] font-semibold text-gz-sage flex items-center gap-1">
                    <Icon.Check className="h-3.5 w-3.5" />{" "}
                    IURIS: {typeof row.si === "boolean" ? "Sí" : row.si}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ S8 · PARA QUIÉN (3 columnas) ═════════════════════ */}
      <ScrollReveal>
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-16 sm:py-20 border-b border-gz-ink">
          <div className="text-center mb-10">
            <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
              — Para quién —
            </div>
            <h2 className="font-cormorant text-[32px] sm:text-[44px] font-semibold leading-[1.05] text-gz-ink">
              ¿Quién eres tú?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-gz-rule">
            {PARA_QUIEN.map((p) => {
              const IconComp = p.icon;
              return (
                <article
                  key={p.title}
                  className="border-r border-b border-gz-rule p-6 sm:p-8 flex flex-col"
                >
                  <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-gold mb-3">
                    — {p.eyebrow} · {p.roman} —
                  </div>
                  <div className="w-12 h-12 border border-gz-ink flex items-center justify-center text-gz-ink mb-4">
                    <IconComp className="h-6 w-6" />
                  </div>
                  <h3 className="font-cormorant text-[30px] !font-semibold leading-[1.05] text-gz-ink">
                    {p.title}
                  </h3>
                  <p className="font-archivo text-[14px] leading-relaxed text-gz-ink-mid mt-3 flex-1">
                    {p.description}
                  </p>
                  <Link
                    href={p.href}
                    className="mt-6 inline-flex items-center gap-2 font-ibm-mono text-[10px] uppercase tracking-[2px] border border-gz-ink text-gz-ink px-4 py-2.5 hover:bg-gz-ink hover:text-gz-cream transition-colors cursor-pointer self-start"
                  >
                    {p.cta}
                    <Icon.ArrowRight className="h-3 w-3" />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ S9 · CTA FINAL (contraportada) ═══════════════════ */}
      <ScrollReveal>
        <section className="mx-auto max-w-[1200px] px-4 sm:px-6 py-20 sm:py-28 text-center border-b-[3px] border-gz-ink relative">
          <div className="absolute top-6 left-6 font-cormorant italic text-3xl text-gz-gold opacity-60">§</div>
          <div className="absolute top-6 right-6 font-cormorant italic text-3xl text-gz-gold opacity-60">§</div>

          <div className="font-ibm-mono text-[10px] uppercase tracking-[4px] text-gz-gold mb-4">
            — Contraportada —
          </div>
          <p className="font-cormorant text-[34px] sm:text-[48px] lg:text-[56px] !font-semibold leading-[1.02] text-gz-ink max-w-3xl mx-auto">
            No somos una app de estudio.
          </p>
          <p className="font-cormorant italic text-[30px] sm:text-[44px] lg:text-[52px] leading-[1.05] text-gz-burgundy max-w-3xl mx-auto mt-2">
            Somos tu comunidad jurídica.
          </p>

          <Link
            href="/register"
            className="mt-10 inline-flex items-center gap-2 font-ibm-mono text-[11px] uppercase tracking-[3px] bg-gz-ink text-gz-cream px-8 py-4 hover:bg-gz-burgundy transition-colors cursor-pointer"
          >
            Suscribirse al ejemplar
            <Icon.ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <p className="mt-10 font-cormorant italic text-[18px] text-gz-ink-light">
            — Fiat iustitia —
          </p>
        </section>
      </ScrollReveal>

      {/* ═══ FOOTER (colophon editorial) ══════════════════════ */}
      <footer className="mx-auto max-w-[1200px] px-4 sm:px-6 py-10">
        <div className="border-t border-gz-ink pt-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo-sello.svg"
              alt=""
              width={24}
              height={24}
              className="h-[24px] w-[24px] opacity-70"
            />
            <span className="font-cormorant text-[18px] !font-bold text-gz-ink">
              Studio <span className="italic font-normal text-gz-red">IURIS</span>
            </span>
          </div>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-light text-center">
            Plataforma de aprendizaje jurídico · Santiago de Chile · MMXXVI
          </p>
          <div className="flex items-center gap-3 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-mid">
            <Link href="/terms" className="hover:text-gz-ink transition-colors">
              Términos
            </Link>
            <span className="text-gz-rule">·</span>
            <Link href="/privacy" className="hover:text-gz-ink transition-colors">
              Privacidad
            </Link>
            <span className="text-gz-rule">·</span>
            <Link href="#" className="hover:text-gz-ink transition-colors">
              Contacto
            </Link>
          </div>
          <p className="font-cormorant italic text-[14px] text-gz-ink-mid">
            — Fiat iustitia, ruat caelum —
          </p>
          <p className="font-ibm-mono text-[9px] text-gz-ink-light/60 tracking-[2px]">
            © {new Date().getFullYear()} Studio IURIS · Chile
          </p>
        </div>
      </footer>

    </main>
  );
}

// ─── Subcomponents ────────────────────────────────────────

function TrayectoriaCol({
  roman,
  eyebrow,
  range,
  body,
  bordered,
}: {
  roman: string;
  eyebrow: string;
  range: string;
  body: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`p-6 sm:p-8 ${
        bordered
          ? "md:border-l md:border-r md:border-gz-rule"
          : ""
      }`}
    >
      <div className="font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-gold mb-2">
        Estado {roman} · {eyebrow}
      </div>
      <div className="font-cormorant italic text-[24px] sm:text-[28px] text-gz-ink leading-tight">
        {range}
      </div>
      <div className="h-px bg-gz-rule my-4" />
      <p className="font-archivo text-[14px] leading-relaxed text-gz-ink-mid">
        {body}
      </p>
    </div>
  );
}
