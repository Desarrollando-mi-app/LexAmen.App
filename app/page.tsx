import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "./dashboard/components/theme-toggle";
import { GRADOS, NIVELES } from "@/lib/league";
import { INTERROGADORES } from "@/lib/interrogadores";
import { ScrollReveal, CountUp } from "./landing-animations";
import type { Metadata } from "next";

// ─── SEO ──────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Studio Iuris · La comunidad jurídica donde estudias, compites, publicas y creces",
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

// ─── Data ─────────────────────────────────────────────────

const PILARES = [
  {
    icon: "📚",
    title: "Aprender",
    items: [
      "Flashcards con repetición espaciada",
      "Simulacro oral con 5 interrogadores IA",
      "Plan de estudios personalizado",
    ],
    available: true,
  },
  {
    icon: "⚔️",
    title: "Competir",
    items: [
      "La Vida del Derecho: 33 grados",
      "Liga semanal con ascensos y descensos",
      "Causas 1v1 y grupales",
      "90 insignias desbloqueables",
    ],
    available: true,
  },
  {
    icon: "📰",
    title: "Publicar",
    items: [
      "Obiter Dictum (opiniones)",
      "Análisis de sentencias",
      "Ensayos académicos",
    ],
    available: true,
  },
  {
    icon: "🤝",
    title: "Conectar",
    items: [
      "Red de colegas",
      "La Sala (ayudantías y eventos)",
      "Chat entre estudiantes",
    ],
    available: false,
  },
  {
    icon: "📈",
    title: "Crecer",
    items: [
      "Perfil profesional verificable",
      "Mentoría entre pares",
      "Reputación basada en actividad",
    ],
    available: false,
  },
  {
    icon: "💼",
    title: "Ejercer",
    items: [
      "Directorio de abogados",
      "Bolsa de trabajo jurídico",
      "Prácticas profesionales",
    ],
    available: false,
  },
];

const COMPARACION = [
  { feature: "Repetición espaciada", otros: false, si: true },
  { feature: "Simulacro oral con IA", otros: false, si: true },
  { feature: "La Vida del Derecho (33 grados)", otros: false, si: true },
  { feature: "Causas 1v1 y grupales", otros: false, si: true },
  { feature: "Publicación académica", otros: false, si: true },
  { feature: "Comunidad integrada", otros: false, si: true },
  { feature: "Perfil profesional", otros: false, si: true },
  { feature: "Acompañamiento post-grado", otros: false, si: true },
  { feature: "Precio", otros: "$30-70K/mes", si: "Desde gratis" },
];

const PARA_QUIEN = [
  {
    emoji: "📖",
    title: "Estudiante",
    description:
      "Empieza a construir tu perfil profesional desde el primer día. Flashcards, causas y tu primera publicación.",
    cta: "Soy estudiante",
    href: "/register",
  },
  {
    emoji: "🎓",
    title: "Egresado",
    description:
      "Simulacro oral con IA, plan de estudios personalizado y una comunidad que te acompaña al grado.",
    cta: "Preparo mi grado",
    href: "/register",
  },
  {
    emoji: "⚖️",
    title: "Abogado",
    description:
      "Publica, mentora, conecta. Tu reputación profesional verificable en un solo lugar.",
    cta: "Soy abogado",
    href: "/register",
  },
];

// ─── Nivel helpers ────────────────────────────────────────

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

  // Live stats
  const [totalUsuarios, totalPublicaciones, usuariosActivosHoy] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.obiterDictum.count().then((o) =>
        prisma.analisisSentencia
          .count({ where: { isActive: true } })
          .then((a) =>
            prisma.ensayo
              .count({ where: { isActive: true } })
              .then((e) => o + a + e)
          )
      ),
      prisma.xpLog
        .groupBy({
          by: ["userId"],
          where: {
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            amount: { gt: 0 },
          },
        })
        .then((r) => r.length),
    ]);

  // Interrogadores for section 5
  const interrogadores = Object.values(INTERROGADORES).map((i) => ({
    nombre: i.nombre,
    avatar: i.imagenUrl,
  }));

  return (
    <main className="gz-page min-h-screen">
      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-gz-navy/95 backdrop-blur-md">
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
              className="rounded-[3px] px-4 py-2 font-archivo text-[13px] font-medium text-white/80 transition-colors hover:text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-[3px] bg-gz-gold px-5 py-2 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-gz-navy"
            >
              Comenzar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── S1: Hero ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gz-navy px-6 py-24 text-center lg:py-32">
        <div className="relative mx-auto max-w-3xl">
          <Image
            src="/brand/logo-isotipo.svg"
            alt="Studio Iuris isotipo"
            width={100}
            height={100}
            className="mx-auto mb-8 h-[100px] w-auto"
            priority
          />
          <h1 className="font-cormorant text-[48px] !font-bold leading-tight text-white lg:text-[64px]">
            Studio <span className="text-gz-red">IURIS</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-cormorant text-[20px] italic text-white/70">
            La comunidad jurídica donde estudias, compites, publicas y creces.
          </p>
          <p className="mt-3 font-archivo text-[16px] text-white/50">
            Desde el primer día de carrera hasta la vida profesional.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-[3px] bg-gz-gold px-8 py-3.5 font-archivo text-[15px] font-semibold text-white shadow-sm shadow-gz-gold/25 transition-all hover:bg-white hover:text-gz-navy"
            >
              Crear cuenta gratis
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-[3px] border-2 border-white/20 px-8 py-3.5 font-archivo text-[15px] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
            >
              Iniciar sesión
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 font-ibm-mono text-[12px] text-white/40">
            <CountUp end={totalUsuarios} className="font-ibm-mono" />
            <span>estudiantes</span>
            <span>&middot;</span>
            <CountUp end={totalPublicaciones} className="font-ibm-mono" />
            <span>publicaciones</span>
            <span>&middot;</span>
            <CountUp end={usuariosActivosHoy} className="font-ibm-mono" />
            <span>activos hoy</span>
          </div>
        </div>
      </section>

      {/* ─── S2: El Problema ───────────────────────────────── */}
      <ScrollReveal>
        <section className="border-t border-white/10 bg-gz-navy px-6 py-20 text-white">
          <div className="mx-auto max-w-3xl">
            <p className="font-cormorant text-[28px] italic text-white lg:text-[36px]">
              &ldquo;En Chile, estudiar Derecho es un camino largo y
              solitario.&rdquo;
            </p>
            <div className="mt-8 space-y-3 font-archivo text-[16px] text-white/60">
              <p>Pasas cinco años memorizando códigos.</p>
              <p>Preparas el grado solo.</p>
              <p>Y si apruebas, el mundo jurídico te recibe con un silencio.</p>
            </div>
            <p className="mt-6 font-archivo text-[16px] font-semibold text-gz-gold-bright">
              Eso es lo que cambia Studio Iuris.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── S3: Los 6 Pilares ─────────────────────────────── */}
      <ScrollReveal>
        <section
          className="px-6 py-20"
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="font-cormorant text-[32px] !font-bold text-gz-ink lg:text-[40px]">
                Seis pilares. Una plataforma.
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PILARES.map((p) => (
                <div
                  key={p.title}
                  className={`relative rounded-[4px] bg-white p-6 transition-all ${
                    p.available
                      ? "border-2 border-gz-gold hover:shadow-md"
                      : "border border-gz-rule opacity-70"
                  }`}
                >
                  <span
                    className={`absolute right-4 top-4 rounded-sm px-2 py-0.5 font-ibm-mono text-[9px] uppercase tracking-[1px] font-semibold text-white ${
                      p.available ? "bg-gz-sage" : "bg-gz-ink-light"
                    }`}
                  >
                    {p.available ? "Disponible" : "Próximamente"}
                  </span>
                  <span className="text-4xl">{p.icon}</span>
                  <h3 className="mt-3 font-cormorant text-[20px] !font-bold text-gz-ink">
                    {p.title}
                  </h3>
                  <ul className="mt-3 space-y-1.5">
                    {p.items.map((item) => (
                      <li
                        key={item}
                        className="font-archivo text-[14px] text-gz-ink-mid"
                      >
                        &bull; {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── S4: Tu Recorrido ──────────────────────────────── */}
      <ScrollReveal>
        <section
          className="px-6 py-20"
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <h2 className="font-cormorant text-[32px] !font-bold text-gz-ink lg:text-[40px]">
                Tu recorrido
              </h2>
              <p className="mt-2 font-cormorant text-[18px] italic text-gz-ink-mid">
                Studio Iuris te acompaña en cada etapa.
              </p>
            </div>

            <div className="relative ml-4 mt-12 border-l-2 border-gz-gold pl-8">
              {/* Estudiante */}
              <div className="relative mb-10">
                <div className="absolute -left-[calc(2rem+9px)] top-1 h-4 w-4 rounded-full border-2 border-gz-gold bg-white" />
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
                  Estudiante
                </p>
                <p className="mt-1 font-cormorant text-[18px] !font-bold text-gz-ink">
                  Años 1-4
                </p>
                <p className="mt-1 font-archivo text-[14px] text-gz-ink-mid">
                  Flashcards para tus ramos. Causas con compañeros. Tus primeras
                  publicaciones. Liga por facultad.
                </p>
              </div>

              {/* Egresado */}
              <div className="relative mb-10">
                <div className="absolute -left-[calc(2rem+9px)] top-1 h-4 w-4 rounded-full border-2 border-gz-gold bg-white" />
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
                  Egresado
                </p>
                <p className="mt-1 font-cormorant text-[18px] !font-bold text-gz-ink">
                  Preparando grado
                </p>
                <p className="mt-1 font-archivo text-[14px] text-gz-ink-mid">
                  Plan de estudios con IA. Simulacro oral con 5 interrogadores.
                  Countdown a tu examen.
                </p>
              </div>

              {/* Abogado */}
              <div className="relative mb-10">
                <div className="absolute -left-[calc(2rem+9px)] top-1 h-4 w-4 rounded-full border-2 border-gz-gold bg-white" />
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
                  Abogado
                </p>
                <p className="mt-1 font-cormorant text-[18px] !font-bold text-gz-ink">
                  Post-grado
                </p>
                <p className="mt-1 font-archivo text-[14px] text-gz-ink-mid">
                  Publica análisis. Mentora estudiantes. Perfil profesional
                  verificable.
                </p>
              </div>

              {/* Tu Carrera Entera */}
              <div className="relative">
                <div className="absolute -left-[calc(2rem+9px)] top-1 h-4 w-4 rounded-full bg-gz-gold" />
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
                  Tu carrera entera
                </p>
                <p className="mt-1 font-cormorant text-[18px] italic text-gz-ink">
                  Studio Iuris te acompaña.
                </p>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── S5: Simulacro Oral ────────────────────────────── */}
      <ScrollReveal>
        <section
          className="px-6 py-20"
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="font-cormorant text-[32px] !font-bold text-gz-ink lg:text-[40px]">
                Simulacro de interrogación oral
              </h2>
              <p className="mt-2 font-cormorant text-[18px] italic text-gz-ink-mid">
                Cinco interrogadores virtuales con personalidades distintas y
                dificultad adaptativa.
              </p>
            </div>

            <div className="mt-10">
              <Image
                src="/interrogadores/equipo-interrogadores.png"
                alt="Equipo de interrogadores de Studio Iuris"
                width={960}
                height={540}
                className="mx-auto max-w-3xl rounded-lg shadow-lg"
                style={{ width: "100%", height: "auto" }}
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
              {interrogadores.map((i) => (
                <div key={i.nombre} className="flex flex-col items-center gap-2">
                  {i.avatar && (
                    <Image
                      src={i.avatar}
                      alt={i.nombre}
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full border-2 border-gz-rule object-cover"
                    />
                  )}
                  <span className="font-archivo text-[12px] text-gz-ink-mid">
                    {i.nombre}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center font-cormorant text-[16px] italic text-gz-ink-mid">
              Prepárate como si estuvieras frente a la comisión.
            </p>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── S6: La Vida del Derecho ──────────────────────────── */}
      <ScrollReveal>
        <section
          className="px-6 py-20"
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="font-cormorant text-[32px] !font-bold text-gz-ink lg:text-[40px]">
                Treinta y tres grados. Cinco niveles.
              </h2>
              <p className="mt-2 font-cormorant text-[18px] italic text-gz-ink-mid">
                De Oyente a Jurisconsulto de la República.
              </p>
            </div>

            {/* Bar of 33 segments */}
            <div className="mx-auto mt-10 flex max-w-4xl overflow-hidden rounded-[3px]">
              {GRADOS.map((g) => (
                <div
                  key={g.grado}
                  className="h-10 flex-1 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: g.color }}
                  title={`Grado ${g.grado}: ${g.nombre}`}
                />
              ))}
            </div>

            {/* Level labels */}
            <div className="mx-auto mt-4 flex max-w-4xl">
              {NIVEL_ORDER.map((key) => {
                const nivel = NIVELES[key];
                const count = NIVEL_GRADO_COUNTS[key];
                return (
                  <div
                    key={key}
                    className="text-center"
                    style={{ flex: count }}
                  >
                    <p
                      className="font-ibm-mono text-[9px] uppercase tracking-[1px] sm:text-[10px]"
                      style={{ color: nivel.color }}
                    >
                      {nivel.label}
                    </p>
                    <p className="font-archivo text-[10px] text-gz-ink-light">
                      {count} grados
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── S7: Comparación ───────────────────────────────── */}
      <ScrollReveal>
        <section className="border-y border-gz-rule bg-white px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-cormorant text-[32px] !font-bold text-gz-ink lg:text-[40px]">
                ¿Por qué Studio Iuris?
              </h2>
            </div>

            {/* Desktop table */}
            <div className="mt-10 hidden overflow-hidden rounded-[4px] border border-gz-rule sm:block">
              <table className="w-full font-archivo text-[14px]">
                <thead>
                  <tr className="border-b border-gz-rule bg-gz-navy/5">
                    <th className="px-6 py-3 text-left font-semibold text-gz-ink">
                      Feature
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-gz-ink-mid">
                      Otros
                    </th>
                    <th className="px-6 py-3 text-center font-semibold text-gz-ink">
                      Studio Iuris
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARACION.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-white" : "bg-gz-navy/[0.02]"}
                    >
                      <td className="px-6 py-3 text-gz-ink">{row.feature}</td>
                      <td className="px-6 py-3 text-center text-gz-ink-light">
                        {typeof row.otros === "boolean" ? (
                          <span className="text-gz-burgundy">✗</span>
                        ) : (
                          row.otros
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {typeof row.si === "boolean" ? (
                          <span className="text-gz-sage font-semibold">✓</span>
                        ) : (
                          <span className="font-semibold text-gz-sage">
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
            <div className="mt-10 space-y-3 sm:hidden">
              {COMPARACION.map((row) => (
                <div
                  key={row.feature}
                  className="rounded-[4px] border border-gz-rule bg-white p-4"
                >
                  <p className="font-archivo text-[14px] font-semibold text-gz-ink">
                    {row.feature}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-archivo text-[13px] text-gz-ink-light">
                      <span className="text-gz-burgundy">✗</span> Otros:{" "}
                      {typeof row.otros === "boolean" ? "No" : row.otros}
                    </span>
                    <span className="font-archivo text-[13px] font-semibold text-gz-sage">
                      <span>✓</span> SI:{" "}
                      {typeof row.si === "boolean" ? "Sí" : row.si}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── S8: Para Quién ────────────────────────────────── */}
      <ScrollReveal>
        <section
          className="px-6 py-20"
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="font-cormorant text-[32px] !font-bold text-gz-ink lg:text-[40px]">
                ¿Quién eres tú?
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {PARA_QUIEN.map((p) => (
                <div
                  key={p.title}
                  className="rounded-[4px] border border-gz-rule bg-white p-8 transition-all hover:border-gz-gold"
                >
                  <span className="text-4xl">{p.emoji}</span>
                  <h3 className="mt-4 font-cormorant text-[22px] !font-bold text-gz-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2 font-archivo text-[14px] leading-relaxed text-gz-ink-mid">
                    {p.description}
                  </p>
                  <Link
                    href={p.href}
                    className="mt-6 inline-block rounded-[3px] bg-gz-gold px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-gz-navy hover:ring-1 hover:ring-gz-gold"
                  >
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── S9: CTA Final ─────────────────────────────────── */}
      <ScrollReveal>
        <section className="bg-gz-navy px-6 py-20 text-center text-white lg:py-28">
          <div className="mx-auto max-w-2xl">
            <p className="font-cormorant text-[28px] !font-bold lg:text-[36px]">
              No somos una app de estudio.
            </p>
            <p className="mt-2 font-cormorant text-[28px] !font-bold lg:text-[36px]">
              Somos tu comunidad jurídica.
            </p>
            <Link
              href="/register"
              className="mt-10 inline-flex items-center gap-2 rounded-[3px] bg-gz-gold px-8 py-3.5 font-archivo text-[15px] font-semibold text-white shadow-sm shadow-gz-gold/25 transition-all hover:bg-white hover:text-gz-navy"
            >
              Crear cuenta gratis
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* ─── Footer ────────────────────────────────────────── */}
      <footer
        className="border-t border-gz-rule px-6 py-8"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={28}
              height={28}
              className="h-[28px] w-[28px] opacity-60"
            />
            <span className="font-cormorant text-[18px] !font-bold text-gz-ink">
              Studio <span className="text-gz-red">Iuris</span>
            </span>
          </div>
          <p className="font-archivo text-[12px] text-gz-ink-light">
            Plataforma de aprendizaje jurídico &middot; Santiago, Chile &middot;
            2026
          </p>
          <div className="flex items-center gap-4 font-archivo text-[12px] text-gz-ink-light">
            <Link href="#" className="hover:text-gz-ink transition-colors">
              Términos
            </Link>
            <span className="text-gz-rule">|</span>
            <Link href="#" className="hover:text-gz-ink transition-colors">
              Privacidad
            </Link>
            <span className="text-gz-rule">|</span>
            <Link href="#" className="hover:text-gz-ink transition-colors">
              Contacto
            </Link>
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
