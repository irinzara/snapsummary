/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000',
        card: 'rgba(255,255,255,0.05)',
        border: 'rgba(255,255,255,0.08)',
        primary: '#ffffff',
        accent: '#0ea5e9',
        accentPurple: '#a855f7',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
