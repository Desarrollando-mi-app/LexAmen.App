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
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "Georgia", "serif"],
        archivo: ["var(--font-archivo)", "Archivo", "sans-serif"],
        "ibm-mono": ["var(--font-ibm-plex-mono)", "IBM Plex Mono", "monospace"],
      },
      animation: {
        "gz-slide-up": "gz-slideUp 0.6s ease both",
        "gz-blink": "gz-blink 1.5s infinite",
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
      },
    },
  },
  plugins: [],
};
export default config;
