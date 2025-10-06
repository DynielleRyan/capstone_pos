/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        pharmacy: {
          green: '#10b981',
          blue: '#3b82f6',
          red: '#ef4444',
          yellow: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        pharmacy: {
          "primary": "#0ea5e9",
          "secondary": "#64748b",
          "accent": "#10b981",
          "neutral": "#1f2937",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#e2e8f0",
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
        },
      },
      {
        nord: {
          "base-100": "oklch(95.127% 0.007 260.731)",
          "base-200": "oklch(93.299% 0.01 261.788)",
          "base-300": "oklch(89.925% 0.016 262.749)",
          "base-content": "oklch(32.437% 0.022 264.182)",
          "primary": "oklch(59.435% 0.077 254.027)",
          "primary-content": "oklch(11.887% 0.015 254.027)",
          "secondary": "oklch(69.651% 0.059 248.687)",
          "secondary-content": "oklch(13.93% 0.011 248.687)",
          "accent": "oklch(77.464% 0.062 217.469)",
          "accent-content": "oklch(15.492% 0.012 217.469)",
          "neutral": "oklch(45.229% 0.035 264.131)",
          "neutral-content": "oklch(89.925% 0.016 262.749)",
          "info": "oklch(69.207% 0.062 332.664)",
          "info-content": "oklch(13.841% 0.012 332.664)",
          "success": "oklch(76.827% 0.074 131.063)",
          "success-content": "oklch(15.365% 0.014 131.063)",
          "warning": "oklch(85.486% 0.089 84.093)",
          "warning-content": "oklch(17.097% 0.017 84.093)",
          "error": "oklch(60.61% 0.12 15.341)",
          "error-content": "oklch(12.122% 0.024 15.341)",
        },
      },
      "light",
      "dark",
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}
