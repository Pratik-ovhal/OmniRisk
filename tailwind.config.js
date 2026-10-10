/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#00152a",
        "on-primary": "#ffffff",
        "primary-container": "#102a43",
        "on-primary-container": "#7a92b0",
        "primary-fixed": "#d1e4ff",
        "primary-fixed-dim": "#b0c9e8",
        "on-primary-fixed": "#011d35",
        "on-primary-fixed-variant": "#314863",
        "inverse-primary": "#b0c9e8",

        "secondary": "#006a61",
        "on-secondary": "#ffffff",
        "secondary-container": "#86f2e4",
        "on-secondary-container": "#006f66",
        "secondary-fixed": "#89f5e7",
        "secondary-fixed-dim": "#6bd8cb",
        "on-secondary-fixed": "#00201d",
        "on-secondary-fixed-variant": "#005049",

        "tertiary": "#001626",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#002b46",
        "on-tertiary-container": "#4b95d0",
        "tertiary-fixed": "#cde5ff",
        "tertiary-fixed-dim": "#94ccff",
        "on-tertiary-fixed": "#001d32",
        "on-tertiary-fixed-variant": "#004b74",

        "surface": "#f7f9fc",
        "surface-dim": "#d8dadd",
        "surface-bright": "#f7f9fc",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f7",
        "surface-container": "#eceef1",
        "surface-container-high": "#e6e8eb",
        "surface-container-highest": "#e0e3e6",
        "surface-variant": "#e0e3e6",
        "on-surface": "#191c1e",
        "on-surface-variant": "#43474d",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f4",
        "surface-tint": "#49607c",

        "outline": "#74777e",
        "outline-variant": "#c3c6ce",

        "background": "#f7f9fc",
        "on-background": "#191c1e",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        /* Risk Indicator Semantic Palettes */
        "risk-low": "#10b981",       /* 75-100 Emerald / Green */
        "risk-moderate": "#f59e0b",  /* 40-74 Amber */
        "risk-high": "#f97316",      /* 10-39 Orange */
        "risk-critical": "#ef4444",  /* 0-9 Crimson Red */
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      }
    },
  },
  plugins: [],
}
