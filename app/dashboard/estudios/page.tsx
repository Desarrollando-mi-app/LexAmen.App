import Link from "next/link";

export const metadata = {
  title: "Módulos de Estudio — Studio Iuris",
};

const MODULOS = [
  {
    href: "/dashboard/flashcards",
    kicker: "SM-2",
    title: "Flashcards",
    description:
      "Repaso activo con repetición espaciada. Domina conceptos uno a uno.",
    color: "var(--gz-navy)",
  },
  {
    href: "/dashboard/mcq",
    kicker: "MCQ",
    title: "Preguntas MCQ",
    description:
      "Alternativas múltiples con retroalimentación inmediata y ranking.",
    color: "var(--gz-burgundy)",
  },
  {
    href: "/dashboard/truefalse",
    kicker: "V/F",
    title: "Verdadero / Falso",
    description:
      "Evalúa afirmaciones jurídicas. Velocidad y precisión en cada ronda.",
    color: "var(--gz-sage)",
  },
  {
    href: "/dashboard/definiciones",
    kicker: "Concepto",
    title: "Definiciones",
    description:
      "Identifica el concepto correcto a partir de su definición jurídica.",
    color: "var(--gz-navy)",
  },
  {
    href: "/dashboard/completar-espacios",
    kicker: "Blancos",
    title: "Completar Espacios",
    description:
      "Completa artículos y normas con las palabras faltantes correctas.",
    color: "var(--gz-burgundy)",
  },
  {
    href: "/dashboard/identificar-errores",
    kicker: "Errores",
    title: "Identificar Errores",
    description:
      "Encuentra errores deliberados en textos legales y corrígelos.",
    color: "var(--gz-sage)",
  },
  {
    href: "/dashboard/ordenar-secuencias",
    kicker: "Orden",
    title: "Ordenar Secuencias",
    description:
      "Ordena las etapas de procedimientos jurídicos en el orden correcto.",
    color: "var(--gz-gold)",
  },
  {
    href: "/dashboard/relacionar-columnas",
    kicker: "Match",
    title: "Relacionar Columnas",
    description:
      "Conecta cada concepto con su definición o categoría correspondiente.",
    color: "var(--gz-navy)",
  },
  {
    href: "/dashboard/casos-practicos",
    kicker: "Caso",
    title: "Casos Prácticos",
    description:
      "Resuelve mini-casos con 3 preguntas progresivas: identifica, norma, resuelve.",
    color: "var(--gz-burgundy)",
  },
  {
    href: "/dashboard/dictado-juridico",
    kicker: "Audio",
    title: "Dictado Jurídico",
    description:
      "Escucha artículos del Código y escríbelos. Evalúa tu precisión.",
    color: "var(--gz-sage)",
  },
  {
    href: "/dashboard/linea-de-tiempo",
    kicker: "Timeline",
    title: "Líneas de Tiempo",
    description:
      "Coloca eventos y plazos procesales en su posición temporal correcta.",
    color: "var(--gz-gold)",
  },
  {
    href: "/dashboard/simulacro",
    kicker: "IA",
    title: "Simulacro Oral",
    description:
      "Interrogación oral con IA. Practica frente a 5 perfiles de examinador.",
    color: "var(--gz-gold)",
  },
];

export default function EstudiosPage() {
  return (
    <div
      className="gz-page min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-4xl px-4 lg:px-0 py-8 sm:py-12">
        {/* Header */}
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
          M&oacute;dulos &middot; Estudio
        </p>
        <h1 className="font-cormorant text-[28px] sm:text-[36px] !font-bold text-gz-ink leading-tight mt-1">
          M&oacute;dulos de Estudio
        </h1>
        <div className="border-b-2 border-gz-rule-dark mt-3 mb-8" />

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {MODULOS.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="group block border border-gz-rule rounded-sm p-6 transition-all hover:border-gz-gold hover:shadow-sm"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <span
                className="font-ibm-mono text-[10px] uppercase tracking-[2px] font-medium"
                style={{ color: mod.color }}
              >
                {mod.kicker}
              </span>
              <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink mt-1 group-hover:text-gz-gold transition-colors">
                {mod.title}
              </h2>
              <p className="font-archivo text-[13px] text-gz-ink-mid leading-relaxed mt-2">
                {mod.description}
              </p>
              <span className="inline-block mt-4 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
                Acceder &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
