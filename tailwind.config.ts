import type { Config } from "tailwindcss";

/**
 * Código 21 — design tokens (Constituição Visual mobile-first: dark + dourado).
 * Paleta premium com neutros enviesados para o ouro. Espelha app/globals.css.
 *   #0D0D0D ground · #F6F2EA texto · #C7C1B4 muted · #8C8578 subtle
 *   #C8A45D dourado · #B89146 dourado escuro · #E4C77E dourado-brilho
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#0D0D0D",
        surface: "#161513",
        "surface-raised": "#1E1C18",
        border: "#2A2824",
        line: "#34302A",
        text: "#F6F2EA",
        muted: "#C7C1B4",
        subtle: "#8C8578",
        gold: {
          DEFAULT: "#C8A45D",
          strong: "#B89146",
          bright: "#E4C77E",
        },
        // Semânticas — só para estado, nunca como acento decorativo.
        success: "#6FAE7E",
        warning: "#E0B45A",
        danger: "#C9755F",
        info: "#7FA6C9",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Escala fluida (clamp) — espelha as CSS vars de globals.css.
        "fluid-h1": ["var(--step-h1)", { lineHeight: "1.05" }],
        "fluid-h2": ["var(--step-h2)", { lineHeight: "1.1" }],
        "fluid-h3": ["var(--step-h3)", { lineHeight: "1.25" }],
        "fluid-lead": ["var(--step-lead)", { lineHeight: "1.5" }],
      },
      spacing: {
        // Alvo de toque mínimo (polegar) — use min-h-tap / h-tap.
        tap: "var(--tap)",
        "safe-b": "var(--safe-bottom)",
        "safe-t": "var(--safe-top)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      // ---- Motion Language (tokens oficiais) ----
      transitionDuration: {
        fast: "160ms",
        base: "240ms",
        slow: "400ms",
        ceremonial: "800ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        exit: "cubic-bezier(0.4, 0, 1, 1)",
        celebrate: "cubic-bezier(0.34, 1.2, 0.64, 1)",
      },
      // ---- Sistema de sombras / elevação ----
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.4)",
        pop: "0 8px 24px -12px rgba(0,0,0,0.6)",
        overlay: "0 20px 48px -20px rgba(0,0,0,0.75)",
        "glow-gold": "0 0 0 1px rgba(200,164,93,0.4), 0 0 20px rgba(200,164,93,0.18)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.2s linear infinite",
        "sheet-up": "sheet-up 240ms cubic-bezier(0.2,0,0,1)",
      },
    },
  },
  plugins: [],
};

export default config;
