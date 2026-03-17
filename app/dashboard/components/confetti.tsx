"use client";

import { useEffect, useState } from "react";
import { getAnimationsEnabled } from "@/lib/sounds";

interface ConfettiProps {
  active: boolean;
  duration?: number;
  color?: "gold" | "multi";
}

const GOLD_COLORS = ["#9a7230", "#c49a50", "#FFD700", "#B8860B", "#DAA520"];
const MULTI_COLORS = [
  "#9a7230",
  "#c49a50",
  "#FFD700",
  "#6b1d2a",
  "#12203a",
  "#3a5a35",
];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  rotation: number;
}

export function Confetti({
  active,
  duration = 2000,
  color = "gold",
}: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active || !getAnimationsEnabled()) {
      setParticles([]);
      return;
    }

    const colors = color === "gold" ? GOLD_COLORS : MULTI_COLORS;
    const count = 60;
    const generated: Particle[] = [];

    for (let i = 0; i < count; i++) {
      generated.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.6,
        duration: 1.5 + Math.random() * 1.5,
        size: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
      });
    }

    setParticles(generated);

    const timer = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(timer);
  }, [active, duration, color]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 1.5 : 1),
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "1px" : "50%",
          }}
        />
      ))}
    </div>
  );
}
