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
        bg: "#0d0d0d",
        surface: "#1a1a1a",
        "surface-hover": "#222222",
        accent: "#00ff88",
        "accent-dim": "#00ff8833",
        "accent-glow": "#0f1f17",
        "accent-border": "#00ff8866",
        muted: "#888888",
        faint: "#444444",
        danger: "#ff4444",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
