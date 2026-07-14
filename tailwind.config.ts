import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssTypography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      /** Large classroom panels — 2K+ */
      'board': '2560px',
      /** 4K digital boards (3840×2160) — laptop layouts unchanged below this width */
      'uhd': '3840px',
    },
    extend: {
      fontSize: {
        'fluid-xs':   'var(--text-xs)',
        'fluid-sm':   'var(--text-sm)',
        'fluid-base': 'var(--text-base)',
        'fluid-lg':   'var(--text-lg)',
        'fluid-xl':   'var(--text-xl)',
        'fluid-2xl':  'var(--text-2xl)',
        'fluid-3xl':  'var(--text-3xl)',
        'fluid-4xl':  'var(--text-4xl)',
        'fluid-5xl':  'var(--text-5xl)',
        'fluid-6xl':  'var(--text-6xl)',
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        outfit: ["var(--font-outfit)", "ui-sans-serif", "sans-serif"],
        sans: ["var(--font-outfit)", "ui-sans-serif", "sans-serif"],
        inter: ["var(--font-outfit)", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        elevated: "var(--elevated-shadow)",
        glow: "var(--ai-glow)",
        "glow-lg": "0 0 60px rgba(14, 165, 164, 0.35)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
        },
        mist: {
          DEFAULT: "var(--mist)",
          deep: "var(--mist-deep)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        'slate-gray': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        'indigo-blue': {
          50: '#eef6f8',
          100: '#d5e8ec',
          200: '#a8d0d8',
          300: '#6fadb8',
          400: '#3d8a98',
          500: '#0e7490',
          600: '#0c647c',
          700: '#0a5166',
          800: '#083d4d',
          900: '#062433',
        },
        'teal-green': {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        'amber-gold': {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(40px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out",
        "fade-in-up": "fade-in-up 0.8s ease-out",
        "scale-in": "scale-in 0.5s ease-out",
        "gradient-shift": "gradient-shift 8s ease infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
} satisfies Config;
