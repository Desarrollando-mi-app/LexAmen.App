import Link from "next/link";

interface ModulosGridProps {
  flashcardsDominated: number;
  flashcardsTotal: number;
  mcqCorrect: number;
  mcqTotal: number;
  mcqPercent: number;
}

interface ModuloCard {
  href: string;
  glyph: string;
  label: string;
  kicker: string;
  description: string;
  accent: string;
  stat?: string | null;
}

export function GzModulosGrid({
  flashcardsDominated,
  flashcardsTotal,
  mcqCorrect,
  mcqTotal,
  mcqPercent,
}: ModulosGridProps) {
  const modulos: ModuloCard[] = [
    {
      href: "/dashboard/flashcards",
      glyph: "❡",
      label: "Flashcards",
      kicker: "SM-2 · Repetición espaciada",
      description: `${flashcardsDominated.toLocaleString("es-CL")} dominadas de ${flashcardsTotal.toLocaleString("es-CL")}`,
      accent: "var(--gz-gold)",
      stat: flashcardsTotal > 0
        ? `${Math.round((flashcardsDominated / flashcardsTotal) * 100)}%`
        : null,
    },
    {
      href: "/dashboard/mcq",
      glyph: "◉",
      label: "MCQ",
      kicker: "Selección múltiple",
      description: mcqTotal > 0
        ? `${mcqCorrect.toLocaleString("es-CL")} aciertos de ${mcqTotal.toLocaleString("es-CL")}`
        : "Preguntas con explicación doctrinal",
      accent: "var(--gz-navy)",
      stat: mcqTotal > 0 ? `${mcqPercent}%` : null,
    },
    {
      href: "/dashboard/truefalse",
      glyph: "✓✗",
      label: "Verdadero / Falso",
      kicker: "Decisión binaria",
      description: "Afirmaciones jurídicas para validar o desmentir.",
      accent: "var(--gz-sage)",
    },
    {
      href: "/dashboard/definiciones",
      glyph: "§",
      label: "Definiciones",
      kicker: "Conceptos clave",
      description: "Memoriza definiciones precisas del Código.",
      accent: "var(--gz-burgundy)",
    },
    {
      href: "/dashboard/completar-espacios",
      glyph: "▭",
      label: "Completar Espacios",
      kicker: "Cloze · Memoria activa",
      description: "Rellena los blancos de artículos del Código.",
      accent: "#1e4080",
    },
    {
      href: "/dashboard/identificar-errores",
      glyph: "✗",
      label: "Identificar Errores",
      kicker: "Análisis crítico",
      description: "Encuentra el yerro doctrinal en cada texto.",
      accent: "#7a4a2a",
    },
    {
      href: "/dashboard/ordenar-secuencias",
      glyph: "❇",
      label: "Ordenar Secuencias",
      kicker: "Procedimiento · Orden",
      description: "Reconstruye el orden correcto de un proceso.",
      accent: "#5a7a55",
    },
    {
      href: "/dashboard/relacionar-columnas",
      glyph: "⇄",
      label: "Relacionar Columnas",
      kicker: "Asociación",
      description: "Conecta conceptos con sus definiciones.",
      accent: "#3a4a72",
    },
    {
      href: "/dashboard/casos-practicos",
      glyph: "⚖",
      label: "Casos Prácticos",
      kicker: "Aplicación real",
      description: "Razonamiento jurídico sobre situaciones concretas.",
      accent: "#9a3030",
    },
    {
      href: "/dashboard/dictado-juridico",
      glyph: "🎙",
      label: "Dictado Jurídico",
      kicker: "Audio · Comprensión",
      description: "Escucha y transcribe artículos del Código.",
      accent: "#5a4a8a",
    },
    {
      href: "/dashboard/linea-de-tiempo",
      glyph: "⏳",
      label: "Línea de Tiempo",
      kicker: "Eventos cronológicos",
      description: "Ubica hitos jurídicos en el orden correcto.",
      accent: "#4a7a8a",
    },
    {
      href: "/dashboard/simulacro",
      glyph: "✠",
      label: "Simulacro Oral",
      kicker: "IA · 5 examinadores",
      description: "Examen en voz alta con dificultad adaptativa.",
      accent: "var(--gz-ink)",
    },
  ];

  return (
    <section
      className="mb-7 animate-gz-slide-up"
      style={{ animationDelay: "0.3s" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <h2 className="font-cormorant text-[22px] font-bold text-gz-ink whitespace-nowrap leading-none">
            Módulos de Estudio
          </h2>
        </div>
        <div className="flex-1 h-px bg-gz-rule" />
        <Link
          href="/dashboard/progreso"
          className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold hover:text-gz-burgundy transition-colors whitespace-nowrap"
        >
          Ver progreso →
        </Link>
      </div>

      {/* Grid — 2 col mobile, 3 col tablet, 4 col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {modulos.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group relative bg-white border border-gz-ink/15 rounded-[5px] p-4 overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_4px_18px_-12px_rgba(15,15,15,0.18)] hover:shadow-[0_1px_0_rgba(15,15,15,0.04),0_10px_30px_-14px_rgba(15,15,15,0.30)] hover:-translate-y-0.5 hover:border-transparent transition-all duration-200"
          >
            {/* Top rail accent */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px] transition-all duration-200 group-hover:h-[4px]"
              style={{ backgroundColor: m.accent }}
            />
            {/* Decorative big glyph in background */}
            <div
              className="absolute -bottom-4 -right-2 font-cormorant text-[80px] leading-none opacity-[0.04] select-none pointer-events-none transition-opacity group-hover:opacity-[0.08]"
              style={{ color: m.accent }}
            >
              {m.glyph}
            </div>

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className="font-cormorant text-[28px] leading-none"
                  style={{ color: m.accent }}
                >
                  {m.glyph}
                </span>
                {m.stat && (
                  <span
                    className="font-ibm-mono text-[11px] font-bold tabular-nums"
                    style={{ color: m.accent }}
                  >
                    {m.stat}
                  </span>
                )}
              </div>
              <p className="font-ibm-mono text-[8px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                {m.kicker}
              </p>
              <h3 className="font-cormorant text-[18px] font-bold text-gz-ink leading-tight mb-1.5 group-hover:text-gz-burgundy transition-colors">
                {m.label}
              </h3>
              <p className="font-archivo text-[11px] text-gz-ink-mid leading-snug line-clamp-2">
                {m.description}
              </p>
              <p
                className="mt-2 font-archivo text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: m.accent }}
              >
                Practicar →
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
