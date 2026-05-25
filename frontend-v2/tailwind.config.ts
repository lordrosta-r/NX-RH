import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      colors: {
        primary: {
          50: "#EFF9FD",
          100: "#D9F1FA",
          200: "#A8E0F5",
          300: "#62C8EC",
          400: "#2DB5DE",
          500: "#17A8D4",
          600: "#1290B5",
          700: "#0E7090",
          800: "#0A5068",
          900: "#063545",
          950: "#031E29",
        },
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        warning: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
        },
        error: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        // Alias sémantique de `error` pour les variantes de danger
        danger: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        info: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        // Tokens de surface
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f9fafb",
          muted: "#f3f4f6",
        },
        // Tokens de bordure
        border: {
          DEFAULT: "#e5e7eb",
          strong: "#d1d5db",
        },
        // Tokens de texte
        text: {
          DEFAULT: "#111827",
          secondary: "#374151",
          muted: "#6b7280",
          disabled: "#9ca3af",
        },
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        DEFAULT:
          "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
        md: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
        lg: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)",
        xl: "0 20px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.05)",
      },
      spacing: {
        "18": "72px",
        "22": "88px",
        "88": "352px",
        "128": "512px",
      },
      height: {
        navbar: "64px",
      },
      maxWidth: {
        "8xl": "88rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideInUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(320px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite linear",
        fadeIn: "fadeIn 200ms ease-in-out",
        scaleIn: "scaleIn 150ms ease-out",
        slideInUp: "slideInUp 200ms ease-out",
        slideInRight: "slideInRight 220ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
