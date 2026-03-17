"use client";

import { useEffect, useState } from "react";
import { playBadgeEarned, getAnimationsEnabled } from "@/lib/sounds";

interface BadgeData {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  tier: string;
}

interface BadgeEarnedModalProps {
  visible: boolean;
  badge: BadgeData;
  onClose: () => void;
}

const TIER_LABELS: Record<string, string> = {
  BRONCE: "Bronce",
  PLATA: "Plata",
  ORO: "Oro",
  PLATINO: "Platino",
  DIAMANTE: "Diamante",
};

export function BadgeEarnedModal({
  visible,
  badge,
  onClose,
}: BadgeEarnedModalProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!visible) {
      setStep(0);
      return;
    }

    const animated = getAnimationsEnabled();
    const delays = animated ? [0, 300, 600, 900, 1500] : [0, 0, 0, 0, 500];

    const timers = [
      setTimeout(() => setStep(1), delays[0]),
      setTimeout(() => {
        setStep(2);
        playBadgeEarned();
      }, delays[1]),
      setTimeout(() => setStep(3), delays[2]),
      setTimeout(() => setStep(4), delays[3]),
      setTimeout(() => setStep(5), delays[4]),
    ];

    return () => timers.forEach(clearTimeout);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        step >= 1 ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "rgba(154, 114, 48, 0.15)" }}
      onClick={(e) => e.target === e.currentTarget && step >= 5 && onClose()}
    >
      <div className="relative mx-4 w-full max-w-xs rounded-[8px] border border-gz-gold/30 bg-white p-8 text-center shadow-2xl"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        {/* Title */}
        <p
          className={`font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold transition-all duration-500 ${
            step >= 1 ? "opacity-100" : "opacity-0"
          }`}
        >
          Nueva Insignia
        </p>

        {/* Badge emoji */}
        <div
          className={`mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full ${
            step >= 2 ? "animate-scale-bounce animate-golden-glow" : "scale-0"
          }`}
          style={{ backgroundColor: "var(--gz-cream)" }}
        >
          <span className="text-5xl">{badge.emoji}</span>
        </div>

        {/* Badge name */}
        <p
          className={`mt-5 font-cormorant text-[22px] font-bold text-gz-ink transition-all duration-500 ${
            step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {badge.label}
        </p>

        {/* Description */}
        <p
          className={`mt-2 font-archivo text-[13px] text-gz-ink-mid transition-all duration-500 ${
            step >= 4 ? "opacity-100" : "opacity-0"
          }`}
        >
          {badge.description}
        </p>

        {/* Tier */}
        <p
          className={`mt-1 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-gold transition-all duration-300 ${
            step >= 4 ? "opacity-100" : "opacity-0"
          }`}
        >
          Tier: {TIER_LABELS[badge.tier] ?? badge.tier}
        </p>

        {/* Close button */}
        {step >= 5 && (
          <button
            onClick={onClose}
            className="mt-6 rounded-[4px] bg-gz-gold px-8 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold-bright animate-fade-slide-up"
          >
            Genial!
          </button>
        )}
      </div>
    </div>
  );
}
