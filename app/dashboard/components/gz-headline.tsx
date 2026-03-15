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

interface GzHeadlineProps {
  flashcardsDominated: number;
  flashcardsTotal: number;
  streak: number;
  activityDays: { date: string; count: number }[];
}

function getActivityLevel(count: number): string {
  if (count === 0) return "bg-[var(--gz-gold)]/[0.08]";
  if (count <= 3) return "bg-[var(--gz-gold)]/20";
  if (count <= 8) return "bg-[var(--gz-gold)]/40";
  if (count <= 15) return "bg-[var(--gz-gold)]/70";
  return "bg-gz-gold";
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

export function GzHeadline({
  flashcardsDominated,
  flashcardsTotal,
  streak,
  activityDays,
}: GzHeadlineProps) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const impressionsRef = useRef<Set<string>>(new Set());

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
  const last28 = activityDays.slice(-28);

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

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 pb-6 border-b-2 border-gz-rule-dark mb-6 animate-gz-slide-up"
      style={{ animationDelay: "0.1s" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Headline main */}
      <div>
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 font-medium">
          {activeSlide.origen === "publicitario" ? "PATROCINADO" : "NUEVO EN STUDIO IURIS"}
        </p>
        <h2 className="font-cormorant text-[28px] sm:text-[32px] lg:text-[38px] !font-bold leading-[1.15] text-gz-ink mb-3">
          {activeSlide.titulo}
        </h2>
        {activeSlide.subtitulo && (
          <p className="font-cormorant italic text-[15px] sm:text-[17px] leading-[1.6] text-gz-ink-mid border-l-[3px] border-gz-gold pl-4 mb-4">
            {activeSlide.subtitulo}
          </p>
        )}
        <a
          href={activeSlide.ctaUrl}
          onClick={handleCtaClick}
          target={activeSlide.ctaExterno ? "_blank" : undefined}
          rel={activeSlide.ctaExterno ? "noopener noreferrer" : undefined}
          className="inline-block bg-gz-navy text-white font-archivo text-[12px] font-semibold uppercase tracking-[1px] px-7 py-2.5 hover:bg-gz-gold hover:text-gz-navy transition-colors"
        >
          {activeSlide.ctaTexto} →
        </a>

        {/* Dots */}
        {slides.length > 1 && (
          <div className="flex items-center gap-1.5 mt-4">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? "bg-gz-gold" : "bg-gz-rule"
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar stats */}
      <div className="lg:border-l border-gz-rule lg:pl-6 space-y-0">
        {/* Flashcards dominated */}
        <div className="pb-4 mb-4 border-b border-gz-rule">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2">
            Flashcards dominadas
          </p>
          <p className="font-cormorant text-[42px] !font-bold text-gz-ink leading-none">
            {new Intl.NumberFormat("es-CL").format(flashcardsDominated)}{" "}
            <span className="text-[12px] text-gz-ink-light font-archivo font-normal">
              / {new Intl.NumberFormat("es-CL").format(flashcardsTotal)}
            </span>
          </p>
        </div>

        {/* Streak */}
        <div className="pb-4 mb-4 border-b border-gz-rule">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2">
            Racha actual
          </p>
          <p className="font-cormorant text-[42px] !font-bold text-gz-ink leading-none">
            {streak}{" "}
            <span className="text-[12px] text-gz-ink-light font-archivo font-normal">
              días
            </span>
          </p>
        </div>

        {/* Activity strip */}
        <div>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2">
            Actividad reciente
          </p>
          <div className="flex gap-[2px]">
            {last28.map((day) => (
              <div
                key={day.date}
                className={`flex-1 h-5 rounded-[2px] ${getActivityLevel(day.count)}`}
                title={`${day.date}: ${day.count} actividades`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
