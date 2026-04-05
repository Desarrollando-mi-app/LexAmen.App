"use client";

import { useEffect, useState } from "react";
import { playAchievement, getAnimationsEnabled } from "@/lib/sounds";
import { Confetti } from "./confetti";

interface TitleCompletionModalProps {
  visible: boolean;
  tituloLabel: string;
  xpBonus?: number;
  onClose: () => void;
  onReview?: () => void;
  onNext?: () => void;
}

export function TitleCompletionModal({
  visible,
  tituloLabel,
  xpBonus = 20,
  onClose,
  onReview,
  onNext,
}: TitleCompletionModalProps) {
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep(0);
      setShowConfetti(false);
      return;
    }

    // Animated reveal sequence
    const timers = [
      setTimeout(() => setStep(1), 100),
      setTimeout(() => setStep(2), 400),
      setTimeout(() => {
        setStep(3);
        playAchievement();
        if (getAnimationsEnabled()) setShowConfetti(true);
      }, 700),
      setTimeout(() => setStep(4), 1200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          step >= 1 ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <Confetti active={showConfetti} color="gold" />

      {/* Modal */}
      <div
        className={`relative z-10 mx-4 w-full max-w-md rounded-lg border-2 border-gz-gold bg-[var(--gz-cream)] p-8 text-center shadow-2xl transition-all duration-500 ${
          step >= 2 ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
      >
        {/* Emojis */}
        <div
          className={`text-[40px] transition-all duration-300 ${
            step >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          🎉 ✨ 🎊
        </div>

        {/* Title */}
        <h2
          className={`mt-4 font-cormorant text-[28px] font-bold text-gz-ink transition-all duration-500 ${
            step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          ¡Título completado!
        </h2>

        {/* Titulo name */}
        <p
          className={`mt-2 font-archivo text-[16px] font-semibold text-gz-gold transition-all duration-500 ${
            step >= 3 ? "opacity-100" : "opacity-0"
          }`}
        >
          {tituloLabel} — 100% dominado
        </p>

        {/* XP bonus */}
        <div
          className={`mt-4 inline-block rounded-full bg-gz-gold/15 px-6 py-2 transition-all duration-500 ${
            step >= 3 ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}
        >
          <span className="font-cormorant text-[24px] font-bold text-gz-gold">
            +{xpBonus} XP
          </span>
        </div>

        {/* Message */}
        <p
          className={`mt-4 font-archivo text-[13px] text-gz-ink-mid leading-relaxed transition-all duration-500 ${
            step >= 4 ? "opacity-100" : "opacity-0"
          }`}
        >
          Has demostrado dominio en esta materia.
          <br />
          La repetición fortalece el conocimiento.
          <br />
          ¡Repásalo para consolidar lo aprendido!
        </p>

        {/* Buttons */}
        <div
          className={`mt-6 flex gap-3 justify-center transition-all duration-500 ${
            step >= 4 ? "opacity-100" : "opacity-0"
          }`}
        >
          {onReview && (
            <button
              onClick={onReview}
              className="rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] font-semibold text-gz-ink transition-colors hover:border-gz-gold"
            >
              🔄 Repasar
            </button>
          )}
          <button
            onClick={onNext ?? onClose}
            className="rounded-[3px] bg-gz-navy px-4 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            {onNext ? "Siguiente título →" : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
