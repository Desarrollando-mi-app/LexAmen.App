"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { GzMastheadNav } from "./gz-masthead-nav";

const LETTERS_STUDIO = "Studio";
const LETTERS_IURIS = "IURIS";
const LETTER_STAGGER_MS = 40;
const SHRINK_THRESHOLD_PX = 40;
const TOP_THRESHOLD_PX = 4;

export function GzMasthead() {
  // `isShrunk` controls the expanded/compact visual state
  const [isShrunk, setIsShrunk] = useState(false);
  // `animKey` is bumped every time the user returns to the top after having
  // scrolled away — changing the key remounts the letter spans and replays
  // the CSS keyframe animation from zero.
  const [animKey, setAnimKey] = useState(0);
  // Track the previous "has been shrunk" state so we only replay the
  // animation when we ACTUALLY return to top, not on every scroll event at 0.
  const wasShrunkRef = useRef(false);

  useEffect(() => {
    let rafId = 0;
    function onScroll() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y > SHRINK_THRESHOLD_PX) {
          if (!wasShrunkRef.current) {
            wasShrunkRef.current = true;
            setIsShrunk(true);
          }
        } else if (y <= TOP_THRESHOLD_PX) {
          if (wasShrunkRef.current) {
            wasShrunkRef.current = false;
            setIsShrunk(false);
            setAnimKey((k) => k + 1);
          }
        }
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 px-6 lg:px-10 transition-[padding] duration-300 ease-out ${
        isShrunk ? "pt-2 pb-0" : "pt-5 pb-0"
      }`}
      style={{
        backgroundColor: "var(--gz-cream)",
        backdropFilter: isShrunk ? "saturate(1.1)" : undefined,
      }}
    >
      {/* Row superior: marca izquierda + metadata derecha */}
      <div
        className={`flex items-center justify-between transition-[margin] duration-300 ease-out ${
          isShrunk ? "mb-2" : "mb-4"
        }`}
      >
        {/* === IZQUIERDA: Shrunk = sello | Expanded = isotipo + texto === */}
        <div className="flex items-center gap-4 min-h-[44px]">
          {isShrunk ? (
            /* Estado comprimido: solo el logo-sello circular */
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={48}
              height={48}
              className="h-[44px] w-[44px] flex-shrink-0"
              priority
            />
          ) : (
            /* Estado expandido: isotipo + nombre animado + lema */
            <>
              <Image
                src="/brand/logo-isotipo.svg"
                alt="Studio Iuris"
                width={80}
                height={80}
                className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px] rounded-full overflow-hidden flex-shrink-0"
                priority
              />

              {/* Nombre + Lema — `key={animKey}` fuerza remount para replay */}
              <div key={animKey}>
                {/* "Studio" — font-archivo (sans-serif) */}
                <div className="font-archivo text-[20px] lg:text-[28px] font-bold tracking-[2px] text-gz-ink leading-none">
                  {LETTERS_STUDIO.split("").map((c, i) => (
                    <span
                      key={i}
                      className="gz-letter"
                      style={{ animationDelay: `${i * LETTER_STAGGER_MS}ms` }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
                {/* "IURIS" — font-cormorant (serif), MAYÚSCULAS, ROJO */}
                <div className="font-cormorant text-[26px] lg:text-[38px] !font-bold tracking-[4px] text-gz-red uppercase leading-none mt-[-2px]">
                  {LETTERS_IURIS.split("").map((c, i) => (
                    <span
                      key={i}
                      className="gz-letter"
                      style={{
                        animationDelay: `${
                          (i + LETTERS_STUDIO.length) * LETTER_STAGGER_MS
                        }ms`,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
                {/* Lema */}
                <p className="font-cormorant italic text-[11px] lg:text-[14px] text-gz-ink-mid mt-2 leading-snug">
                  Plataforma de aprendizaje jurídico · Nuevos tiempos &amp; Nuevas herramientas
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Doble línea separadora — la segunda línea solo en expandido */}
      <div className="relative border-b-2 border-gz-ink mb-0">
        {!isShrunk && (
          <div className="absolute bottom-[-4px] left-0 right-0 h-px bg-gz-ink" />
        )}
      </div>

      {/* Nav — siempre visible (también en estado comprimido) */}
      <GzMastheadNav />
    </header>
  );
}
