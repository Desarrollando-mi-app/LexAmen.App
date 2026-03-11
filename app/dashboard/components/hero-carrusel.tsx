"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

interface SlideData {
  id: string;
  origen: string;
  imagenUrl: string;
  imagenPosicion: string;
  overlayOpacidad: number;
  titulo: string;
  subtitulo: string | null;
  ctaTexto: string;
  ctaUrl: string;
  ctaExterno: boolean;
  anunciante: { nombre: string } | null;
}

interface Props {
  ubicacion: "dashboard" | "diario";
}

export function HeroCarrusel({ ubicacion }: Props) {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const impressionsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch slides
  useEffect(() => {
    fetch(`/api/hero-slides?ubicacion=${ubicacion}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSlides(data);
          setLoaded(true);
        }
      })
      .catch(() => {});
  }, [ubicacion]);

  // Register impression
  const registrarImpresion = useCallback(
    (slideId: string) => {
      if (impressionsRef.current.has(slideId)) return;
      impressionsRef.current.add(slideId);
      fetch(`/api/hero-slides/${slideId}/evento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "impresion", ubicacion }),
      }).catch(() => {});
    },
    [ubicacion]
  );

  // Register impression for current slide
  useEffect(() => {
    if (slides.length > 0 && slides[current]) {
      registrarImpresion(slides[current].id);
    }
  }, [current, slides, registrarImpresion]);

  // Preload next image
  useEffect(() => {
    if (slides.length <= 1) return;
    const nextIdx = (current + 1) % slides.length;
    const img = new window.Image();
    img.src = slides[nextIdx].imagenUrl;
  }, [current, slides]);

  // Auto-rotate
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, paused]);

  const goTo = (idx: number) => setCurrent(idx);
  const goPrev = () => setCurrent((p) => (p - 1 + slides.length) % slides.length);
  const goNext = () => setCurrent((p) => (p + 1) % slides.length);

  const handleCtaClick = (slide: SlideData) => {
    fetch(`/api/hero-slides/${slide.id}/evento`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "clic", ubicacion }),
      keepalive: true,
    }).catch(() => {});
  };

  if (!loaded || slides.length === 0) return null;

  const slide = slides[current];

  return (
    <div
      className="relative h-[260px] sm:h-[420px] w-full overflow-hidden rounded-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides with fade */}
      {slides.map((s, i) => (
        <div
          key={s.id}
          className="absolute inset-0 transition-opacity duration-[400ms] ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
        >
          <Image
            src={s.imagenUrl}
            alt={s.titulo}
            fill
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: s.imagenPosicion }}
            priority={i === 0}
          />
          {/* Overlay gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to top, rgba(0,0,0,${s.overlayOpacidad}), rgba(0,0,0,0.1))`,
            }}
          />
        </div>
      ))}

      {/* Content — always on top */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-8">
        <h2 className="font-serif text-white text-xl sm:text-3xl font-bold line-clamp-2">
          {slide.titulo}
        </h2>
        {slide.subtitulo && (
          <p className="text-white/80 text-sm mt-2 line-clamp-2 max-w-lg hidden sm:block">
            {slide.subtitulo}
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <a
            href={slide.ctaUrl}
            onClick={() => handleCtaClick(slide)}
            target={slide.ctaExterno ? "_blank" : undefined}
            rel={slide.ctaExterno ? "noopener noreferrer" : undefined}
            className="inline-flex bg-[#9A7230] hover:bg-[#7a5a26] text-white rounded-sm px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {slide.ctaTexto}
          </a>
          {slide.origen === "publicitario" && (
            <span className="bg-[#9A7230]/80 text-white text-[10px] font-semibold px-2 py-1 rounded-sm tracking-wider uppercase">
              Publicidad
            </span>
          )}
        </div>
      </div>

      {/* Arrows — desktop only */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            aria-label="Anterior"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            aria-label="Siguiente"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? "bg-[#9A7230]" : "bg-white/40"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
