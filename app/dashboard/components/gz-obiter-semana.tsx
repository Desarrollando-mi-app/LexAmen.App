import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────

interface GzObiterSemanaProps {
  obiter: {
    id: string;
    content: string;
    apoyosCount: number;
    citasCount: number;
    userName: string;
  } | null;
}

// ─── Component ──────────────────────────────────────────────

export function GzObiterSemana({ obiter }: GzObiterSemanaProps) {
  if (!obiter) return null;

  const preview =
    obiter.content.length > 200
      ? obiter.content.slice(0, 200) + "…"
      : obiter.content;

  return (
    <div
      className="mt-6 animate-gz-slide-up rounded-[4px] border border-gz-rule bg-white p-5"
      style={{ animationDelay: "0.35s" }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <span className="whitespace-nowrap font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
          📜 Obiter de la Semana
        </span>
        <div className="h-px flex-1 bg-gz-rule" />
      </div>

      {/* Cited content */}
      <blockquote className="mb-3 border-l-[3px] border-gz-gold pl-4 font-cormorant text-[17px] italic leading-[1.7] text-gz-ink lg:text-[18px]">
        &ldquo;{preview}&rdquo;
      </blockquote>

      {/* Author + stats */}
      <p className="mb-3 font-archivo text-[12px] text-gz-ink-mid">
        — {obiter.userName} · {obiter.apoyosCount}{" "}
        {obiter.apoyosCount === 1 ? "apoyo" : "apoyos"} · {obiter.citasCount}{" "}
        {obiter.citasCount === 1 ? "cita" : "citas"}
      </p>

      {/* CTA */}
      <Link
        href={`/dashboard/diario/obiter/${obiter.id}`}
        className="mt-3 inline-block border-b border-gz-gold pb-0.5 font-archivo text-[12px] font-semibold text-gz-gold transition-colors hover:border-gz-ink hover:text-gz-ink"
      >
        Leer debate completo →
      </Link>
    </div>
  );
}
