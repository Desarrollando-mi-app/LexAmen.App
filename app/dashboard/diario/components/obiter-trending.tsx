"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────

type TrendingHashtag = {
  tag: string;
  uses: number;
  apoyos: number;
  replies: number;
  score: number;
  delta: number; // % growth vs ventana anterior
};

type SpotlightOd = {
  id: string;
  content: string;
  apoyosCount: number;
  citasCount: number;
  replyCount: number;
  hashtags: string[];
  userName: string;
};

type TrendingData = {
  trendingHashtags: TrendingHashtag[];
  spotlight: SpotlightOd | null;
  unansweredQuestion: SpotlightOd | null;
  windowDays: number;
};

// ─── Helpers ────────────────────────────────────────────────

// Tarjeta editorial premium reutilizable — rail superior + dot-kicker +
// sombra paper-stack simulando hojas apiladas.
function EditorialCard({
  railColor,
  kicker,
  kickerColor = "text-gz-gold",
  trailing,
  children,
}: {
  railColor: string;
  kicker: string;
  kickerColor?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[3px] border border-gz-rule/40 bg-white/40" aria-hidden />
      <div className="absolute inset-0 translate-x-[1.5px] translate-y-[1.5px] rounded-[3px] border border-gz-rule/60 bg-white/60" aria-hidden />
      <div className="relative rounded-[3px] border border-gz-rule bg-white overflow-hidden">
        <div className={`h-[3px] ${railColor}`} />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-1.5 w-1.5 rounded-full ${railColor}`} />
            <span className={`font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold ${kickerColor}`}>
              {kicker}
            </span>
            {trailing && <span className="ml-auto">{trailing}</span>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

export function ObiterTrending() {
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await fetch("/api/obiter/trending", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Silent — trending no es crítico
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[3px] border border-gz-rule bg-white p-4"
          >
            <div className="mb-3 h-2.5 w-24 animate-pulse rounded bg-gz-cream-dark" />
            <div className="space-y-2">
              <div className="h-9 animate-pulse rounded bg-gz-cream-dark" />
              <div className="h-9 animate-pulse rounded bg-gz-cream-dark" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const hasTrending = data.trendingHashtags.length > 0;
  const hasSpotlight = !!data.spotlight;
  const hasUnanswered = !!data.unansweredQuestion;

  if (!hasTrending && !hasSpotlight && !hasUnanswered) {
    return (
      <EditorialCard railColor="bg-gz-gold" kicker="Contingencia">
        <p className="font-cormorant text-[14px] italic text-gz-ink-light leading-relaxed">
          Aún no hay suficiente actividad. Publica un Obiter con
          #etiquetas para empezar la conversación.
        </p>
      </EditorialCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Hashtags trending ─── */}
      {hasTrending && (
        <EditorialCard
          railColor="bg-gz-gold"
          kicker="Contingencia · Tendencias"
          trailing={
            <span className="font-ibm-mono text-[9px] tracking-[1px] text-gz-ink-light">
              {data.windowDays}d
            </span>
          }
        >
          <ul className="-mx-1">
            {data.trendingHashtags.map((h, idx) => {
              const max = data.trendingHashtags[0]?.score ?? 1;
              const pct = Math.max(8, Math.round((h.score / max) * 100));
              const isHot = h.delta >= 50;
              return (
                <li key={h.tag}>
                  <Link
                    href={`/dashboard/diario?hashtag=${encodeURIComponent(h.tag)}`}
                    className="group flex items-start gap-2.5 px-1 py-2 transition-colors hover:bg-gz-cream-dark/30 cursor-pointer rounded-[2px]"
                  >
                    {/* Numeral romano editorial — top 3 doradas, resto sutiles */}
                    <span
                      className={`w-5 font-cormorant text-[15px] !font-bold leading-none mt-1 shrink-0 text-right ${
                        idx === 0
                          ? "text-gz-burgundy"
                          : idx === 1
                          ? "text-gz-gold"
                          : idx === 2
                          ? "text-[#b87333]"
                          : "text-gz-ink-light"
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      {/* Hashtag + delta */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-archivo text-[14px] font-bold text-gz-ink leading-tight group-hover:text-gz-burgundy transition-colors break-all">
                          #{h.tag}
                        </span>
                        {isHot && (
                          <span className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-burgundy bg-gz-burgundy/10 px-1.5 py-0.5 rounded-full font-bold leading-none">
                            ▲ {h.delta}%
                          </span>
                        )}
                      </div>

                      {/* Mini-barra de proporción */}
                      <div className="mt-1.5 h-[3px] w-full bg-gz-cream-dark/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gz-gold transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Stats compactas */}
                      <p className="mt-1 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
                        {h.uses} {h.uses === 1 ? "obiter" : "obiters"}
                        {h.replies > 0 && (
                          <>
                            <span className="text-gz-ink-light/40 mx-1">·</span>
                            {h.replies} {h.replies === 1 ? "respuesta" : "respuestas"}
                          </>
                        )}
                        {h.apoyos > 0 && (
                          <>
                            <span className="text-gz-ink-light/40 mx-1">·</span>
                            {h.apoyos} {h.apoyos === 1 ? "apoyo" : "apoyos"}
                          </>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </EditorialCard>
      )}

      {/* ─── Spotlight: OD con más engagement reciente ─── */}
      {hasSpotlight && data.spotlight && (
        <EditorialCard
          railColor="bg-gz-burgundy"
          kicker="En el centro del foro"
          kickerColor="text-gz-burgundy"
        >
          <Link
            href={`/dashboard/diario/obiter/${data.spotlight.id}`}
            className="block group cursor-pointer relative"
          >
            <span
              className="absolute -top-1.5 left-3 font-cormorant text-[44px] !font-bold text-gz-burgundy/15 select-none leading-none pointer-events-none"
              aria-hidden
            >
              &ldquo;
            </span>
            <p className="relative mb-2 line-clamp-3 font-cormorant text-[15px] leading-snug text-gz-ink italic group-hover:text-gz-burgundy transition-colors">
              {data.spotlight.content}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-gz-rule/60 gap-2">
              <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light truncate">
                — {data.spotlight.userName}
              </span>
              <div className="flex items-center gap-2 shrink-0 font-ibm-mono text-[10px]">
                {data.spotlight.replyCount > 0 && (
                  <span className="text-gz-navy font-semibold">
                    ↩ {data.spotlight.replyCount}
                  </span>
                )}
                {data.spotlight.apoyosCount > 0 && (
                  <span className="text-gz-burgundy font-semibold">
                    ♥ {data.spotlight.apoyosCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        </EditorialCard>
      )}

      {/* ─── Pregunta sin respuesta ─── */}
      {hasUnanswered && data.unansweredQuestion && (
        <EditorialCard
          railColor="bg-gz-sage"
          kicker="Pregunta sin respuesta"
          kickerColor="text-gz-sage"
        >
          <Link
            href={`/dashboard/diario/obiter/${data.unansweredQuestion.id}`}
            className="block group cursor-pointer"
          >
            <p className="mb-3 line-clamp-3 font-cormorant text-[15px] leading-snug text-gz-ink group-hover:text-gz-sage transition-colors">
              {data.unansweredQuestion.content}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-gz-rule/60 gap-2">
              <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light truncate">
                — {data.unansweredQuestion.userName}
              </span>
              <span className="font-archivo text-[10px] font-bold uppercase tracking-[1.5px] text-gz-sage hover:text-gz-ink transition-colors shrink-0">
                Responde →
              </span>
            </div>
          </Link>
        </EditorialCard>
      )}
    </div>
  );
}
