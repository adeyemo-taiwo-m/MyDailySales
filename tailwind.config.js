/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        buttons: "#1d4ed8",
        medium: "#60a5fa",
        light: "#dbeafe",
        success: "#10b981",
        cancel: "#dc2626",
      },
    },
  },
  plugins: [],
}
