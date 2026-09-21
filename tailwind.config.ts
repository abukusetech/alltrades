import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        profit: {
          DEFAULT: "#16a34a",
          bg: "#f0fdf4",
          border: "#bbf7d0",
          text: "#15803d",
        },
        loss: {
          DEFAULT: "#dc2626",
          bg: "#fef2f2",
          border: "#fecaca",
          text: "#b91c1c",
        },
        warn: {
          DEFAULT: "#d97706",
          bg: "#fffbeb",
          border: "#fde68a",
          text: "#b45309",
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        surface: {
          DEFAULT: "#ffffff",
          soft: "#fafbfc",
          muted: "#f4f6f8",
        },
        border: {
          DEFAULT: "#e5e7eb",
          strong: "#d1d5db",
          soft: "#f1f3f5",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        "3xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        raised:
          "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
        modal:
          "0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
