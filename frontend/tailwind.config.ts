import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        glass: {
          bg: "var(--glass-bg)",
          strong: "var(--glass-bg-strong)",
          border: "var(--glass-border)",
          borderStrong: "var(--glass-border-strong)",
        },
      },
      boxShadow: {
        glass: "var(--glass-shadow)",
        glassSoft: "var(--glass-shadow-soft)",
      },
    },
  },
  plugins: [],
} satisfies Config;
