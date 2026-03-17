"use client";

import { useEffect, useState } from "react";
import { playStreakActivated, playStreakBroken, getAnimationsEnabled } from "@/lib/sounds";
import { toast } from "sonner";

const STORAGE_KEY = "studio-iuris-last-streak-check";

interface StreakDetectorProps {
  streak: number;
  hadActivityYesterday: boolean;
}

export function StreakDetector({ streak, hadActivityYesterday }: StreakDetectorProps) {
  const [fireAnimate, setFireAnimate] = useState(false);

  useEffect(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastCheck = localStorage.getItem(STORAGE_KEY);

    // Only run once per day
    if (lastCheck === todayKey) return;
    localStorage.setItem(STORAGE_KEY, todayKey);

    if (streak > 0 && hadActivityYesterday) {
      // Active streak continuing
      playStreakActivated();
      if (getAnimationsEnabled()) {
        setFireAnimate(true);
        setTimeout(() => setFireAnimate(false), 2000);
      }
      toast.success(`Racha de ${streak} dias activa!`, { icon: "🔥" });
    } else if (streak === 0 && !hadActivityYesterday) {
      // Streak broken (had a streak before but missed yesterday)
      playStreakBroken();
      toast.info("Tu racha se ha roto. Estudia hoy para iniciar una nueva!", { icon: "💔" });
    }
  }, [streak, hadActivityYesterday]);

  // Inject fire animation on the streak indicator in GzUserBar
  useEffect(() => {
    if (!fireAnimate) return;
    const el = document.querySelector("[data-streak-indicator]");
    if (el) {
      el.classList.add("animate-fire");
      const timer = setTimeout(() => el.classList.remove("animate-fire"), 2000);
      return () => clearTimeout(timer);
    }
  }, [fireAnimate]);

  return null;
}
