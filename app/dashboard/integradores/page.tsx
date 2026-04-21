import Link from "next/link";
import Image from "next/image";
import { InfoTooltip } from "@/app/components/info-tooltip";
import { FEATURE_INFO } from "@/lib/feature-info";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Ejercicios Integradores — Studio Iuris",
};

type InfoKey = keyof typeof FEATURE_INFO;

interface ModuloSpec {
  href: string;
  kicker: string;
  title: string;
  description: string;
  color: string;
  infoKey: InfoKey;
  /** Nombre del campo count que corresponde en la consulta paralela. */
  countKey: keyof Counts;
}

interface Counts {
  flashcards: number;
  mcq: number;
  truefalse: number;
  definiciones: number;
  fillBlank: number;
  errorId: number;
  orderSeq: number;
  matchCol: number;
  casos: number;
  dictado: number;
  timeline: number;
}

const MODULOS: ModuloSpec[] = [
  { href: "/dashboard/flashcards",         kicker: "SM-2",     title: "Flashcards",            description: "Repaso activo con repetición espaciada sobre ejercicios integradores.", color: "var(--gz-navy)",     infoKey: "flashcards",          countKey: "flashcards" },
  { href: "/dashboard/mcq",                kicker: "MCQ",      title: "Preguntas MCQ",         description: "Alternativas múltiples con retroalimentación inmediata.",                color: "var(--gz-burgundy)", infoKey: "mcq",                  countKey: "mcq" },
  { href: "/dashboard/truefalse",          kicker: "V/F",      title: "Verdadero / Falso",     description: "Evalúa afirmaciones jurídicas integradoras.",                             color: "var(--gz-sage)",     infoKey: "vf",                   countKey: "truefalse" },
  { href: "/dashboard/definiciones",       kicker: "Concepto", title: "Definiciones",          description: "Identifica el concepto correcto a partir de su definición.",             color: "var(--gz-navy)",     infoKey: "definiciones",         countKey: "definiciones" },
  { href: "/dashboard/completar-espacios", kicker: "Blancos",  title: "Completar Espacios",    description: "Completa artículos y normas con las palabras faltantes.",                color: "var(--gz-burgundy)", infoKey: "completarEspacios",    countKey: "fillBlank" },
  { href: "/dashboard/identificar-errores",kicker: "Errores",  title: "Identificar Errores",   description: "Encuentra errores deliberados en textos legales.",                       color: "var(--gz-sage)",     infoKey: "identificarErrores",   countKey: "errorId" },
  { href: "/dashboard/ordenar-secuencias", kicker: "Orden",    title: "Ordenar Secuencias",    description: "Ordena etapas de procedimientos jurídicos.",                             color: "var(--gz-gold)",     infoKey: "ordenarSecuencias",    countKey: "orderSeq" },
  { href: "/dashboard/relacionar-columnas",kicker: "Match",    title: "Relacionar Columnas",   description: "Conecta cada concepto con su definición.",                               color: "var(--gz-navy)",     infoKey: "relacionarColumnas",   countKey: "matchCol" },
  { href: "/dashboard/casos-practicos",    kicker: "Caso",     title: "Casos Prácticos",       description: "Resuelve mini-casos con 3 preguntas progresivas.",                        color: "var(--gz-burgundy)", infoKey: "casosPracticos",       countKey: "casos" },
  { href: "/dashboard/dictado-juridico",   kicker: "Audio",    title: "Dictado Jurídico",      description: "Escucha artículos del Código y escríbelos.",                              color: "var(--gz-sage)",     infoKey: "dictado",              countKey: "dictado" },
  { href: "/dashboard/linea-de-tiempo",    kicker: "Timeline", title: "Líneas de Tiempo",      description: "Coloca eventos y plazos procesales en orden temporal.",                   color: "var(--gz-gold)",     infoKey: "lineaTiempo",          countKey: "timeline" },
];

export default async function IntegradoresPage() {
  // Conteo por módulo — todos con esIntegrador=true (+ activo cuando aplique).
  // Paralelo para un solo round-trip.
  const [
    flashcards, mcq, truefalse, definiciones, fillBlank, errorId,
    orderSeq, matchCol, casos, dictado, timeline,
  ] = await Promise.all([
    prisma.flashcard.count({ where: { esIntegrador: true } }),
    prisma.mCQ.count({ where: { esIntegrador: true } }),
    prisma.trueFalse.count({ where: { esIntegrador: true } }),
    prisma.definicion.count({ where: { isActive: true, esIntegrador: true } }),
    prisma.fillBlank.count({ where: { activo: true, esIntegrador: true } }),
    prisma.errorIdentification.count({ where: { activo: true, esIntegrador: true } }),
    prisma.orderSequence.count({ where: { activo: true, esIntegrador: true } }),
    prisma.matchColumns.count({ where: { activo: true, esIntegrador: true } }),
    prisma.casoPractico.count({ where: { activo: true, esIntegrador: true } }),
    prisma.dictadoJuridico.count({ where: { activo: true, esIntegrador: true } }),
    prisma.timeline.count({ where: { activo: true, esIntegrador: true } }),
  ]);

  const counts: Counts = {
    flashcards, mcq, truefalse, definiciones, fillBlank, errorId,
    orderSeq, matchCol, casos, dictado, timeline,
  };

  const total =
    flashcards + mcq + truefalse + definiciones + fillBlank + errorId +
    orderSeq + matchCol + casos + dictado + timeline;

  return (
    <div className="gz-page min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="px-4 lg:px-0 py-8 sm:py-12">
        {/* Header editorial */}
        <div className="gz-section-header mb-8">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
            Módulos · Integradores
          </p>
          <div className="flex items-center gap-3 mt-1">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={80} height={80}
              className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
            />
            <h1 className="font-cormorant text-[28px] sm:text-[36px] !font-bold text-gz-ink leading-tight">
              Ejercicios Integradores
            </h1>
          </div>
          <div className="border-b-2 border-gz-rule-dark mt-3" />
          <p className="mt-4 font-cormorant italic text-[15px] text-gz-ink-mid max-w-[56ch]">
            Ejercicios de síntesis que cruzan múltiples títulos o ramas del derecho.
            Cada módulo accede únicamente al pool integrador — sin mezclar con los ejercicios por título.
          </p>
          <p className="mt-2 font-ibm-mono text-[11px] uppercase tracking-[2px] text-gz-ink-light">
            {total.toLocaleString("es-CL")} ejercicios integradores en total
          </p>
        </div>

        {/* Grid de módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {MODULOS.map((mod) => {
            const info = FEATURE_INFO[mod.infoKey];
            const count = counts[mod.countKey];
            const disabled = count === 0;
            return (
              <div
                key={mod.href}
                className={`group relative border rounded-sm p-6 transition-all ${
                  disabled
                    ? "border-gz-rule/40 opacity-50"
                    : "border-gz-rule hover:border-gz-gold hover:shadow-sm"
                }`}
                style={{ backgroundColor: "var(--gz-cream)" }}
              >
                <div className="absolute top-4 right-4">
                  <InfoTooltip title={info.title} description={info.description} />
                </div>
                <Link
                  href={disabled ? "#" : `${mod.href}?pool=integradores`}
                  className={`block ${disabled ? "pointer-events-none" : ""}`}
                  aria-disabled={disabled}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="font-ibm-mono text-[10px] uppercase tracking-[2px] font-medium"
                      style={{ color: mod.color }}
                    >
                      {mod.kicker}
                    </span>
                    <span
                      className={`font-ibm-mono text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        disabled
                          ? "border-gz-rule/40 text-gz-ink-light"
                          : "border-gz-gold/60 bg-gz-gold/[0.08] text-gz-ink"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                  <h2 className={`font-cormorant text-[22px] !font-bold mt-1 transition-colors ${
                    disabled ? "text-gz-ink-mid" : "text-gz-ink group-hover:text-gz-gold"
                  }`}>
                    {mod.title}
                  </h2>
                  <p className="font-archivo text-[13px] text-gz-ink-mid leading-relaxed mt-2">
                    {mod.description}
                  </p>
                  <span className={`inline-block mt-4 font-ibm-mono text-[10px] uppercase tracking-[2px] ${
                    disabled ? "text-gz-ink-light" : "text-gz-gold"
                  }`}>
                    {disabled ? "Sin ejercicios aún" : "Estudiar integradores →"}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Footer link: volver a estudio por título */}
        <div className="mt-10 pt-6 border-t border-gz-rule text-center">
          <Link
            href="/dashboard/indice-maestro"
            className="font-ibm-mono text-[11px] uppercase tracking-[2px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            ← Estudiar por título (Índice Maestro)
          </Link>
        </div>
      </div>
    </div>
  );
}
