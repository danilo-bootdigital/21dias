import type { Config } from "tailwindcss";

/**
 * Código 21 — design tokens (luxo minimalista: dark + dourado).
 * Paleta da marca:
 *   #111111 preto (ground)   #FFFFFF branco (texto)   #D9D9D9 cinza (muted)
 *   #C8A45D dourado (accent)  #B89146 dourado escuro (accent-strong)
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#111111",
        surface: "#1A1A1A",
        "surface-raised": "#222222",
        border: "#2A2A2A",
        text: "#FFFFFF",
        muted: "#D9D9D9",
        subtle: "#8A8A8A",
        gold: {
          DEFAULT: "#C8A45D",
          strong: "#B89146",
        },
      },
      fontFamily: {
        // Famílias de display/corpo definitivas entram na fase de UI.
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
