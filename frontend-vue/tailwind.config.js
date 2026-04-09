/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
      },
      colors: {
        industrial: {
          900: '#0B0D11',
          800: '#13161C',
          700: '#22252A',
          600: '#3A3D43',
          500: '#4F545C',
          400: '#6F737D',
          300: '#A1A5B1',
          200: '#C0C4CC',
          100: '#F4F4F4',
        },
        clinical: {
          warning: '#FACC15',
          danger: '#EF4444',
          blue: '#38BDF8',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
}
