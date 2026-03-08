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
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
      },
    },
  },
  plugins: [],
};
export default config;
