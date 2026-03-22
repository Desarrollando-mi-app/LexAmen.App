import Link from "next/link";
import Image from "next/image";
import { INTERROGADORES } from "@/lib/interrogadores";

interface ProgressItem {
  label: string;
  percent: number;
}

interface GzStudyColumnsProps {
  ramaProgressItems: ProgressItem[];
  flashcardsDominated: number;
  flashcardsTotal: number;
  mcqCorrect: number;
  mcqTotal: number;
  mcqPercent: number;
}

const INTERROGADOR_PILLS = Object.values(INTERROGADORES).map((i) => ({
  id: i.id,
  nombre: i.nombre,
  iniciales: i.iniciales,
  color: i.color,
  imagenUrl: i.imagenUrl,
}));

export function GzStudyColumns({
  ramaProgressItems,
  flashcardsTotal,
  mcqCorrect,
  mcqTotal,
  mcqPercent,
}: GzStudyColumnsProps) {
  const unidadesActivas = ramaProgressItems.filter((r) => r.percent > 0).length || ramaProgressItems.length;

  return (
    <div
      className="mb-8 animate-gz-slide-up"
      style={{ animationDelay: "0.3s" }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink whitespace-nowrap">
          M&oacute;dulos de Estudio
        </h2>
        <div className="flex-1 h-px bg-gz-rule" />
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold whitespace-nowrap">
          {unidadesActivas} unidades activas
        </span>
      </div>

      {/* Vertical stack */}
      <div className="flex flex-col">
        {/* Row 1: Flashcards */}
        <div className="border-b border-gz-rule pb-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
                Repetici&oacute;n espaciada &middot; SM-2
              </p>
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-1">
                Flashcards
              </h3>
              <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid mb-3">
                {new Intl.NumberFormat("es-CL").format(flashcardsTotal)} tarjetas
                distribuidas en {ramaProgressItems.length} unidades de contenido. El
                algoritmo SM-2 calcula tu pr&oacute;xima revisi&oacute;n seg&uacute;n qu&eacute; tan bien
                recuerdas cada concepto.
              </p>
              <Link
                href="/dashboard/flashcards"
                className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block"
              >
                Estudiar ahora →
              </Link>
            </div>
            <div>
              <div className="space-y-2.5">
                {ramaProgressItems.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-semibold text-gz-ink">
                        {item.label}
                      </span>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                        {item.percent}%
                      </span>
                    </div>
                    <div className="h-1 bg-gz-cream-dark rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-gz-gold rounded-sm transition-all duration-500"
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: MCQ */}
        <div className="border-b border-gz-rule pb-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
                Selecci&oacute;n m&uacute;ltiple &middot; XP
              </p>
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-1">
                Preguntas MCQ
              </h3>
              <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid mb-3">
                {mcqTotal > 0
                  ? `${new Intl.NumberFormat("es-CL").format(mcqTotal)} preguntas respondidas con explicación doctrinal post-respuesta. Cada acierto suma XP.`
                  : "Preguntas con explicación doctrinal post-respuesta. Cada acierto suma XP. Cada error refuerza el aprendizaje."}
              </p>
              <Link
                href="/dashboard/mcq"
                className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block"
              >
                Responder preguntas →
              </Link>
            </div>
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-cormorant text-[36px] !font-bold text-gz-ink">
                  {mcqPercent}%
                </span>
                <span className="text-[12px] text-gz-ink-light">
                  tasa de acierto global
                </span>
              </div>

              {mcqTotal > 0 && (
                <>
                  <div className="flex gap-1 mb-1">
                    <div
                      className="h-6 bg-gz-gold rounded-l-sm"
                      style={{ flex: mcqCorrect || 1 }}
                    />
                    <div
                      className="h-6 bg-gz-cream-dark rounded-r-sm"
                      style={{ flex: mcqTotal - mcqCorrect || 1 }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gz-ink-light">
                    <span>{mcqCorrect} correctas</span>
                    <span>{mcqTotal - mcqCorrect} incorrectas</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Simulacro */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
                IA &middot; 5 interrogadores &middot; TTS
              </p>
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-1">
                Simulacro Oral
              </h3>
              <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid mb-3">
                Cinco examinadores virtuales con personalidades distintas y
                dificultad adaptativa. Audio TTS para una experiencia inmersiva.
                Retroalimentaci&oacute;n inmediata.
              </p>
              <Link
                href="/dashboard/simulacro"
                className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block"
              >
                Iniciar simulacro →
              </Link>
            </div>
            <div>
              <div className="flex flex-wrap gap-1.5">
                {INTERROGADOR_PILLS.map((int) => (
                  <div
                    key={int.id}
                    className="px-3 py-1.5 border border-gz-rule rounded-full text-[11px] text-gz-ink-mid flex items-center gap-1.5"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    <span
                      className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: int.color }}
                    >
                      {int.imagenUrl ? (
                        <Image src={int.imagenUrl} alt={int.nombre} width={20} height={20} className="w-full h-full object-cover" />
                      ) : (
                        int.iniciales
                      )}
                    </span>
                    {int.nombre}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
