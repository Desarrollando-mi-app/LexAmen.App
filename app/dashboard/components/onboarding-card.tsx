"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "onboarding_dismissed";

const STEPS = [
  {
    step: 1,
    emoji: "📇",
    title: "Domina las Flashcards",
    description:
      "Repasa los conceptos clave de Derecho Civil y Procesal con tarjetas de estudio inteligentes.",
    href: "/dashboard/flashcards",
    cta: "Ir a Flashcards",
  },
  {
    step: 2,
    emoji: "✅",
    title: "Pon a prueba tu conocimiento",
    description:
      "Practica con preguntas de selección múltiple y verdadero/falso para reforzar lo aprendido.",
    href: "/dashboard/mcq",
    cta: "Ir a Preguntas",
  },
  {
    step: 3,
    emoji: "⚔️",
    title: "Desafía a tus compañeros",
    description:
      "Compite en Causas contra otros estudiantes, gana XP y sube en la liga.",
    href: "/dashboard/causas",
    cta: "Ir a Causas",
  },
];

export function OnboardingCard() {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setDismissed(false);
  }, []);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="mt-6 rounded-xl border border-gold/30 bg-gradient-to-br from-gold/5 to-paper p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-navy">
            ¡Bienvenido a Iuris Studio! 👋
          </h3>
          <p className="mt-1 text-sm text-navy/60">
            Sigue estos 3 pasos para comenzar tu preparación
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-navy/30 transition-colors hover:bg-navy/5 hover:text-navy/60"
          aria-label="Cerrar"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="M6 6 18 18" />
          </svg>
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <Link
            key={s.step}
            href={s.href}
            className="group rounded-xl border border-border bg-white p-4 transition-all hover:border-gold/40 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                {s.step}
              </span>
              <span className="text-xl">{s.emoji}</span>
            </div>
            <h4 className="mt-3 text-sm font-semibold text-navy">
              {s.title}
            </h4>
            <p className="mt-1 text-xs text-navy/50 leading-relaxed">
              {s.description}
            </p>
            <span className="mt-3 inline-block text-xs font-semibold text-gold group-hover:underline">
              {s.cta} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
