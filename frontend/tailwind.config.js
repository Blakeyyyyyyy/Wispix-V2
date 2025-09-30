/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'wispix-dark': '#0a0a0a',
        'wispix-darker': '#050505',
        'wispix-blue': '#3b82f6',
        'wispix-purple': '#8b5cf6'
      }
    }
  },
  plugins: []
} 