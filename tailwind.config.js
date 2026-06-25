/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0F0A",
        surface: "#111811",
        surface2: "#151E15",
        border: "#1A211A",
        border2: "#2A322A",
        accent: "#00C853",
        "accent-alt": "#10B981",
        "accent-dim": "#00843A",
        warn: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
        text1: "#FFFFFF",
        text2: "#A1A8A1",
        text3: "#6B726B",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
}
