import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "rgb(var(--navy-rgb) / <alpha-value>)",
        gold: "rgb(var(--accent-rgb) / <alpha-value>)",
        paper: "var(--bg-primary)",
        border: "rgb(var(--border-rgb) / <alpha-value>)",
        card: "var(--bg-card)",
        "card-hover": "var(--bg-card-hover)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        "gz-cream": "var(--gz-cream)",
        "gz-cream-dark": "var(--gz-cream-dark)",
        "gz-ink": "var(--gz-ink)",
        "gz-ink-mid": "var(--gz-ink-mid)",
        "gz-ink-light": "var(--gz-ink-light)",
        "gz-gold": "var(--gz-gold)",
        "gz-gold-bright": "var(--gz-gold-bright)",
        "gz-burgundy": "var(--gz-burgundy)",
        "gz-navy": "var(--gz-navy)",
        "gz-sage": "var(--gz-sage)",
        "gz-rule": "var(--gz-rule)",
        "gz-rule-dark": "var(--gz-rule-dark)",
        "gz-red": "var(--gz-red)",
        "gz-red-dark": "var(--gz-red-dark)",
        // Investigaciones — paleta editorial-imprenta
        "inv-paper":      "var(--inv-paper)",
        "inv-paper-2":    "var(--inv-paper-2)",
        "inv-paper-3":    "var(--inv-paper-3)",
        "inv-ink":        "var(--inv-ink)",
        "inv-ink-2":      "var(--inv-ink-2)",
        "inv-ink-3":      "var(--inv-ink-3)",
        "inv-ink-4":      "var(--inv-ink-4)",
        "inv-ocre":       "var(--inv-ocre)",
        "inv-ocre-2":     "var(--inv-ocre-2)",
        "inv-ocre-3":     "var(--inv-ocre-3)",
        "inv-tinta-roja": "var(--inv-tinta-roja)",
        "inv-tinta-verde":"var(--inv-tinta-verde)",
        "inv-rule":       "var(--inv-rule)",
        "inv-rule-2":     "var(--inv-rule-2)",
        "inv-rule-3":     "var(--inv-rule-3)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        "crimson-pro": ["var(--font-crimson-pro)", "Crimson Pro", "Georgia", "serif"],
        archivo: ["var(--font-archivo)", "Archivo", "sans-serif"],
        "ibm-mono": ["var(--font-ibm-plex-mono)", "IBM Plex Mono", "monospace"],
      },
      animation: {
        "gz-slide-up": "gz-slideUp 0.6s ease both",
        "gz-blink": "gz-blink 1.5s infinite",
        "xp-float": "xpFloat 1.2s ease-out forwards",
        shake: "shakeX 0.5s ease-in-out",
        "scale-correct": "scaleCorrect 0.3s ease-in-out",
        "confetti-fall": "confettiFall 2s ease-in forwards",
        fire: "fireGlow 1.5s ease-in-out infinite",
        "golden-glow": "goldenGlow 2s ease-in-out infinite",
        "scale-bounce": "scaleBounce 0.6s ease-out",
        "fade-slide-up": "fadeSlideUp 0.5s ease-out",
        "bell-pulse": "bellPulse 0.6s ease-in-out",
      },
      keyframes: {
        "gz-slideUp": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gz-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        xpFloat: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-40px)" },
        },
        shakeX: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        scaleCorrect: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        confettiFall: {
          "0%": { transform: "translateY(-10vh) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(100vh) rotate(720deg)", opacity: "0" },
        },
        fireGlow: {
          "0%, 100%": { textShadow: "0 0 4px rgba(220, 38, 38, 0.4)" },
          "50%": {
            textShadow:
              "0 0 12px rgba(220, 38, 38, 0.8), 0 0 20px rgba(255, 215, 0, 0.4)",
          },
        },
        goldenGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(154, 114, 48, 0.3)" },
          "50%": {
            boxShadow:
              "0 0 20px rgba(154, 114, 48, 0.6), 0 0 40px rgba(196, 154, 80, 0.3)",
          },
        },
        scaleBounce: {
          "0%": { transform: "scale(0)" },
          "60%": { transform: "scale(1.2)" },
          "80%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        bellPulse: {
          "0%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(12deg)" },
          "30%": { transform: "rotate(-10deg)" },
          "45%": { transform: "rotate(8deg)" },
          "60%": { transform: "rotate(-6deg)" },
          "75%": { transform: "rotate(3deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
