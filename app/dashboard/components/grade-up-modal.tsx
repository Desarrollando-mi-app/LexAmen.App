"use client";

import { useEffect, useState } from "react";
import { playLevelUp } from "@/lib/sounds";
import { getAnimationsEnabled } from "@/lib/sounds";
import { Confetti } from "./confetti";

interface GradeUpModalProps {
  visible: boolean;
  gradoAnterior: number;
  gradoNuevo: number;
  nombreGrado: string;
  nivelNombre: string;
  emoji: string;
  color: string;
  onClose: () => void;
}

export function GradeUpModal({
  visible,
  gradoNuevo,
  nombreGrado,
  nivelNombre,
  emoji,
  color,
  onClose,
}: GradeUpModalProps) {
  const [step, setStep] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!visible) {
      setStep(0);
      setShowConfetti(false);
      return;
    }

    const animated = getAnimationsEnabled();
    const delays = animated ? [0, 300, 600, 900, 1200, 2500] : [0, 0, 0, 0, 0, 500];

    const timers = [
      setTimeout(() => setStep(1), delays[0]),
      setTimeout(() => setStep(2), delays[1]),
      setTimeout(() => {
        setStep(3);
        playLevelUp();
      }, delays[2]),
      setTimeout(() => setStep(4), delays[3]),
      setTimeout(() => {
        setShowConfetti(true);
        setStep(5);
      }, delays[4]),
      setTimeout(() => setStep(6), delays[5]),
    ];

    return () => timers.forEach(clearTimeout);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <Confetti active={showConfetti} color="multi" duration={3000} />
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
          step >= 1 ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      >
        <div className="relative mx-4 w-full max-w-sm rounded-[8px] p-8 text-center text-white overflow-hidden"
          style={{ backgroundColor: color }}
        >
          {/* Title */}
          <p
            className={`font-ibm-mono text-[11px] uppercase tracking-[2px] text-white/80 transition-all duration-500 ${
              step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {emoji} HAS ASCENDIDO {emoji}
          </p>

          {/* Grado number */}
          <div
            className={`mt-6 transition-all duration-600 ${
              step >= 3 ? "animate-scale-bounce" : "scale-0"
            }`}
          >
            <p className="font-cormorant text-[72px] font-bold leading-none">
              {gradoNuevo}
            </p>
          </div>

          {/* Grado name */}
          <p
            className={`mt-4 font-cormorant text-[24px] font-bold transition-all duration-500 ${
              step >= 4 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {nombreGrado}
          </p>

          {/* Nivel */}
          <p
            className={`mt-2 font-archivo text-[14px] text-white/70 transition-all duration-500 ${
              step >= 5 ? "opacity-100" : "opacity-0"
            }`}
          >
            {nivelNombre}
          </p>

          {/* Continue button */}
          {step >= 6 && (
            <button
              onClick={onClose}
              className="mt-8 rounded-[4px] bg-white/20 px-8 py-2.5 font-archivo text-[14px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30 animate-fade-slide-up"
            >
              Continuar
            </button>
          )}
        </div>
      </div>
    </>
  );
}
