"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SlideData {
  id: string;
  titulo: string;
  subtitulo: string | null;
  ctaTexto: string;
  ctaUrl: string;
  ctaExterno: boolean;
  origen: string;
}

interface GzPanelHeroProps {
  userName: string;
  flashcardsDominated: number;
  flashcardsTotal: number;
  streak: number;
  bestStreak?: number;
  xp: number;
  activityDays: { date: string; count: number }[];
  examDays: number | null; // días restantes para examen, null si no configurado
}

const FALLBACK_SLIDE: SlideData = {
  id: "fallback",
  titulo: "Bienvenido a Studio Iuris",
  subtitulo:
    "Prepara tu examen de grado con flashcards, simulacros orales y más. Todo en un solo lugar.",
  ctaTexto: "Comenzar a estudiar",
  ctaUrl: "/dashboard/flashcards",
  ctaExterno: false,
  origen: "editorial",
};

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function formatFechaLarga(d: Date) {
  return d
    .toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function activityHeat(c: number): { bg: string; opacity: number } {
  if (c === 0) return { bg: "rgba(154,114,48,0.06)", opacity: 0.06 };
  if (c <= 3) return { bg: "rgba(154,114,48,0.22)", opacity: 0.22 };
  if (c <= 8) return { bg: "rgba(154,114,48,0.45)", opacity: 0.45 };
  if (c <= 15) return { bg: "rgba(154,114,48,0.7)", opacity: 0.7 };
  return { bg: "rgba(154,114,48,1)", opacity: 1 };
}

export function GzPanelHero({
  userName,
  flashcardsDominated,
  flashcardsTotal,
  streak,
  xp,
  activityDays,
  examDays,
}: GzPanelHeroProps) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const impressionsRef = useRef<Set<string>>(new Set());
  const [now, setNow] = useState<Date>(new Date());

  // Tick reloj cada minuto para que cambie el saludo si pasa la hora.
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    fetch("/api/hero-slides?ubicacion=dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSlides(data);
        }
      })
      .catch(() => {});
  }, []);

  const registrarImpresion = useCallback((slideId: string) => {
    if (impressionsRef.current.has(slideId) || slideId === "fallback") return;
    impressionsRef.current.add(slideId);
    fetch(`/api/hero-slides/${slideId}/evento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "impresion", ubicacion: "dashboard" }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (slides.length > 0 && slides[current]) {
      registrarImpresion(slides[current].id);
    }
  }, [current, slides, registrarImpresion]);

  // Auto-rotate
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [slides.length, paused]);

  const activeSlide = slides.length > 0 ? slides[current] : FALLBACK_SLIDE;
  const last42 = activityDays.slice(-42);

  const handleCtaClick = () => {
    if (activeSlide.id !== "fallback") {
      fetch(`/api/hero-slides/${activeSlide.id}/evento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "clic", ubicacion: "dashboard" }),
        keepalive: true,
      }).catch(() => {});
    }
  };

  const dominioPct = flashcardsTotal > 0
    ? Math.round((flashcardsDominated / flashcardsTotal) * 100)
    : 0;

  return (
    <section className="relative animate-gz-slide-up mb-7" style={{ animationDelay: "0.1s" }}>
      {/* ─── Greeting + fecha ─── */}
      <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light mb-1">
            {formatFechaLarga(now)}
          </p>
          <h1 className="font-cormorant text-[36px] sm:text-[44px] lg:text-[52px] font-bold text-gz-ink leading-[0.95] tracking-tight">
            {greeting(now)},{" "}
            <span className="text-gz-burgundy italic">{userName}</span>
          </h1>
        </div>
        {examDays !== null && examDays >= 0 && (
          <div className="text-right">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
              Examen de grado
            </p>
            <p className="font-cormorant text-[28px] font-bold leading-none">
              <span className="text-gz-burgundy">{examDays}</span>
              <span className="font-archivo text-[12px] font-normal text-gz-ink-light ml-1.5">
                {examDays === 1 ? "día restante" : "días restantes"}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ─── Triple regla ─── */}
      <div className="h-[3px] bg-gz-ink/85 mb-6" />

      {/* ─── Grid: KPIs + slide ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* KPI band — 4 cards editoriales premium */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            kicker="Flashcards"
            value={flashcardsDominated.toLocaleString("es-CL")}
            sub={`/ ${flashcardsTotal.toLocaleString("es-CL")} dominadas`}
            footer={
              <div className="h-1 rounded-full bg-gz-cream-dark mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gz-gold transition-all duration-700"
                  style={{ width: `${dominioPct}%` }}
                />
              </div>
            }
            accent="var(--gz-gold)"
          />
          <KpiCard
            kicker="Racha actual"
            value={String(streak)}
            sub={streak === 1 ? "día consecutivo" : "días consecutivos"}
            badge={streak >= 7 ? "🔥 fuego" : streak >= 3 ? "constancia" : null}
            accent="var(--gz-burgundy)"
          />
          <KpiCard
            kicker="XP acumulada"
            value={xp.toLocaleString("es-CL")}
            sub="puntos de experiencia"
            accent="var(--gz-navy)"
          />
          <KpiCard
            kicker="% Dominio"
            value={`${dominioPct}%`}
            sub="del cedulario base"
            accent="var(--gz-sage)"
          />
        </div>

        {/* Slide editorial */}
        <a
          href={activeSlide.ctaUrl}
          onClick={handleCtaClick}
          target={activeSlide.ctaExterno ? "_blank" : undefined}
          rel={activeSlide.ctaExterno ? "noopener noreferrer" : undefined}
          className="group block relative overflow-hidden rounded-[6px] border border-gz-ink/15 bg-gradient-to-br from-white via-white to-gz-cream-dark/30 p-5 shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)] hover:border-gz-gold/50 hover:shadow-[0_1px_0_rgba(15,15,15,0.04),0_12px_40px_-18px_rgba(154,114,48,0.45)] transition-all duration-300 cursor-pointer"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="absolute top-0 right-0 h-full w-[3px] bg-gradient-to-b from-gz-burgundy via-gz-gold to-gz-navy" />
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-gold mb-2 flex items-center gap-1.5">
            <span className="h-1 w-3 rounded-full bg-gz-gold" />
            {activeSlide.origen === "publicitario" ? "Patrocinado" : "Destacado"}
          </p>
          <h2 className="font-cormorant text-[22px] sm:text-[24px] font-bold text-gz-ink leading-tight mb-2 group-hover:text-gz-burgundy transition-colors">
            {activeSlide.titulo}
          </h2>
          {activeSlide.subtitulo && (
            <p className="font-cormorant italic text-[14px] leading-snug text-gz-ink-mid line-clamp-3 mb-3">
              {activeSlide.subtitulo}
            </p>
          )}
          <span className="inline-block font-archivo text-[12px] font-semibold text-gz-gold group-hover:text-gz-burgundy transition-colors">
            {activeSlide.ctaTexto} →
          </span>
          {/* Dots */}
          {slides.length > 1 && (
            <div className="absolute bottom-3 right-5 flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrent(i);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? "bg-gz-gold w-5" : "bg-gz-rule w-1.5"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </a>
      </div>

      {/* ─── Activity strip premium (42 días) ─── */}
      <div className="mt-5 rounded-[4px] border border-gz-rule/60 bg-white/60 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light flex items-center gap-1.5">
            <span className="h-1 w-3 rounded-full bg-gz-gold" />
            Actividad · últimos 42 días
          </p>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold">
            {last42.filter((d) => d.count > 0).length}/{last42.length} días activos
          </p>
        </div>
        <div className="flex gap-[3px]">
          {last42.map((day) => {
            const heat = activityHeat(day.count);
            return (
              <div
                key={day.date}
                className="flex-1 h-7 rounded-[2px] transition-transform hover:scale-110 cursor-help"
                style={{ backgroundColor: heat.bg }}
                title={`${day.date}: ${day.count} actividades`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── KpiCard interno ─────────────────────────────────────

function KpiCard({
  kicker,
  value,
  sub,
  badge,
  footer,
  accent,
}: {
  kicker: string;
  value: string;
  sub: string;
  badge?: string | null;
  footer?: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="relative bg-white border border-gz-ink/15 rounded-[5px] overflow-hidden p-4 shadow-[0_1px_0_rgba(15,15,15,0.04),0_4px_18px_-12px_rgba(15,15,15,0.18)] hover:shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_24px_-14px_rgba(15,15,15,0.30)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="absolute top-0 left-0 h-full w-[3px]" style={{ backgroundColor: accent }} />
      <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1.5 flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full" style={{ backgroundColor: accent }} />
        {kicker}
      </p>
      <p
        className="font-cormorant text-[36px] font-bold leading-none mb-1"
        style={{ color: accent }}
      >
        {value}
      </p>
      <p className="font-archivo text-[11px] text-gz-ink-mid">{sub}</p>
      {badge && (
        <p className="mt-1.5 inline-block font-ibm-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 rounded-full bg-gz-burgundy/10 text-gz-burgundy">
          {badge}
        </p>
      )}
      {footer}
    </div>
  );
}
