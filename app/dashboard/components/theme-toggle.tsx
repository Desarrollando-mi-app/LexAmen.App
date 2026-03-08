"use client";

import { useState, useEffect, useCallback } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") || "dark";
    const initial = stored === "light" ? "light" : "dark";
    setTheme(initial);
  }, []);

  const toggle = useCallback(() => {
    if (animating) return;

    const next = theme === "light" ? "dark" : "light";
    setAnimating(true);

    // Create overlay with the NEXT theme's background
    const overlay = document.createElement("div");
    overlay.className = "theme-transition-overlay";
    overlay.style.backgroundColor =
      next === "dark" ? "#0D0B08" : "#F7F3ED";
    overlay.style.clipPath = "circle(0% at 50% 50%)";
    document.body.appendChild(overlay);

    // Animate clip-path expanding
    const animation = overlay.animate(
      [
        { clipPath: "circle(0% at 50% 50%)" },
        { clipPath: "circle(150% at 50% 50%)" },
      ],
      {
        duration: 600,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      }
    );

    // Halfway through, apply the new theme
    setTimeout(() => {
      setTheme(next);
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
    }, 300);

    // When animation completes, remove overlay
    animation.onfinish = () => {
      overlay.remove();
      setAnimating(false);
    };
  }, [theme, animating]);

  if (!mounted) return <div className="h-8 w-8" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      disabled={animating}
      className={`
        flex h-9 w-9 items-center justify-center rounded-full text-lg
        transition-all duration-200
        ${
          isDark
            ? "border border-gold/30 hover:border-gold/50 hover:bg-gold/10"
            : "border border-navy/20 hover:border-navy/30 hover:bg-navy/5"
        }
      `}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Papel & Tinta" : "Arca Romana"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
