import type { Config } from "tailwindcss";

/**
 * Agape Education Center design tokens.
 *
 * Components must use ONLY these tokens (e.g. `bg-primary-700`,
 * `text-accent-400`, `font-display`) — never ad-hoc hex values.
 * Loaded by Tailwind v4 via `@config` in `src/app/globals.css`.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep, trustworthy blue — headers, primary buttons, links.
        primary: {
          50: "#eef4fb",
          100: "#d6e3f5",
          200: "#adc7ea",
          300: "#7ca4da",
          400: "#4c7fc5",
          500: "#2d62ab",
          600: "#1f4c8d",
          700: "#183c72",
          800: "#132f5a",
          900: "#0e2344",
          950: "#08162c",
        },
        // Warm gold/amber — highlights, CTAs on dark backgrounds, motto.
        accent: {
          50: "#fff9eb",
          100: "#fdefc8",
          200: "#fbdd8c",
          300: "#f8c650",
          400: "#f5b02a",
          500: "#e08f12",
          600: "#bd6c0c",
          700: "#974d0f",
          800: "#7b3e13",
          900: "#663415",
        },
        // Warm neutrals for page surfaces and body text.
        surface: {
          DEFAULT: "#fffdf8",
          muted: "#f7f3ea",
          border: "#e7e0d0",
        },
        ink: {
          DEFAULT: "#1c2433",
          muted: "#4a5568",
          inverse: "#ffffff",
        },
      },
      fontFamily: {
        // CSS variables are set by next/font in src/app/layout.tsx.
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
};

export default config;
