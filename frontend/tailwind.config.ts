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
        paper:      "var(--paper)",
        paper2:     "var(--paper2)",
        surface:    "var(--surface)",
        ink:        "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        mute:       "var(--mute)",
        rule:       "var(--rule)",
        pop:        "var(--pop)",
        mint:       "var(--mint)",
        sky:        "var(--sky)",
        lemon:      "var(--lemon)",
        rose:       "var(--rose)",
        lilac:      "var(--lilac)",
        danger:     "var(--danger)",
        success:    "var(--success)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
