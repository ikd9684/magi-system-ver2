import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      colors: {
        magi: {
          blue: "#60a5fa",
          green: "#34d399",
          amber: "#fbbf24",
        },
      },
      animation: {
        "pulse-border": "pulse-border 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-pulse": "glow-pulse 1.5s ease-in-out infinite",
      },
      keyframes: {
        "pulse-border": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "glow-pulse": {
          "0%, 100%": { "box-shadow": "0 0 5px currentColor" },
          "50%": { "box-shadow": "0 0 20px currentColor, 0 0 40px currentColor" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
