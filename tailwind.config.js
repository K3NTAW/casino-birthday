/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Refined Art Deco — Monte Carlo, not Vegas neon.
        felt: {
          900: '#0a0f0d', // near-black background
          800: '#0b1f17', // deep emerald shadow
          700: '#0f2a1f',
          600: '#143b2c',
          500: '#1b4d39',
        },
        gold: {
          500: '#d4af37', // primary gold accent
          400: '#e6c75b',
          300: '#f2dd8c',
          600: '#b8941f',
        },
        bone: '#f4efe1', // warm off-white text
        ruby: '#9b2226', // losses / danger
        jade: '#2a9d6f', // wins / success
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        body: ['"Jost"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(212,175,55,0.35), 0 8px 30px -8px rgba(212,175,55,0.25)',
        deco: '0 10px 40px -12px rgba(0,0,0,0.7)',
      },
      keyframes: {
        'chip-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'count-flash': {
          '0%': { color: '#f2dd8c' },
          '100%': { color: '#f4efe1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'chip-pop': 'chip-pop 0.35s ease-out',
        'count-flash': 'count-flash 0.8s ease-out',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}
