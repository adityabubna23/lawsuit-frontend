/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0B4D64', // law-firm teal
        accent: '#F59E0B', // warm gold
        midnight: '#002873'
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}