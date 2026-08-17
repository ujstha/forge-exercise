/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0a0a0a',
        surface: '#151515',
        surface2: '#1e1e1e',
        accent: '#c8f135',
        protein: '#4488ff',
        carbs: '#c8f135',
        fat: '#ff8833',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
