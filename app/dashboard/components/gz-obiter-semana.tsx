import Link from "next/link";

interface GzObiterSemanaProps {
  obiter: {
    id: string;
    content: string;
    apoyosCount: number;
    citasCount: number;
    userName: string;
  } | null;
}

export function GzObiterSemana({ obiter }: GzObiterSemanaProps) {
  if (!obiter) return null;

  const preview =
    obiter.content.length > 220
      ? obiter.content.slice(0, 220) + "…"
      : obiter.content;

  return (
    <section
      className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)] animate-gz-slide-up"
      style={{ animationDelay: "0.35s" }}
    >
      {/* Rail superior */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-burgundy via-gz-gold to-gz-navy" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Obiter de la Semana
          </p>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
          📜 más citado
        </span>
      </div>

      <div className="p-5">
        {/* Cita con drop quotes editoriales */}
        <div className="relative pl-6">
          <span className="absolute -top-1 left-0 font-cormorant text-[48px] leading-[0.5] text-gz-gold/40 select-none">
            &ldquo;
          </span>
          <blockquote className="font-cormorant italic text-[17px] leading-[1.65] text-gz-ink lg:text-[18px]">
            {preview}
          </blockquote>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gz-rule/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="font-cormorant text-[14px] italic text-gz-ink-mid">
              — {obiter.userName}
            </p>
            <div className="flex items-center gap-2 font-ibm-mono text-[10px] text-gz-ink-light">
              <span className="inline-flex items-center gap-1">
                <span className="text-gz-burgundy">♥</span>
                {obiter.apoyosCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="text-gz-gold">❡</span>
                {obiter.citasCount}
              </span>
            </div>
          </div>

          <Link
            href={`/dashboard/diario/obiter/${obiter.id}`}
            className="font-archivo text-[11px] font-semibold text-gz-gold hover:text-gz-burgundy hover:translate-x-1 inline-block transition-all"
          >
            Leer debate completo →
          </Link>
        </div>
      </div>
    </section>
  );
}
