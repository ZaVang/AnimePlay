/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Unbounded', 'sans-serif'],
        ui: ['"Geist Sans"', 'Inter', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
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
        // Anime Tactical Luxury (ATL) Theme
        abyss: '#08080C',
        substrate: '#12121A',
        surface: '#1C1C28',
        gold: {
          light: '#F0C987',
          DEFAULT: '#D4A574',
          dark: '#A67C52',
        },
        clinical: {
          warning: '#FACC15',
          danger: '#EF4444',
          blue: '#38BDF8',
          cyan: '#48C5F4',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
}
