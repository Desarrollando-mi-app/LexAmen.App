"use client";

import { useState, useEffect } from "react";

export function ThemePill() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("studio-iuris-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = stored === "dark" || (!stored && prefersDark);
    setIsDark(shouldBeDark);
    applyTheme(shouldBeDark);
  }, []);

  function applyTheme(dark: boolean) {
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("studio-iuris-theme", next ? "dark" : "light");
    applyTheme(next);
  }

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={toggle}
        aria-label={isDark ? "Activar modo día" : "Activar modo noche"}
        title={isDark ? "Modo día" : "Modo noche"}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-gz-rule bg-white text-[18px] shadow-sm transition-colors hover:bg-gz-cream-dark"
      >
        <span>{isDark ? "☀️" : "🌙"}</span>
      </button>
    </div>
  );
}
