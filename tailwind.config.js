/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Refined Art Deco — Monte Carlo, not Vegas neon.
        felt: {
          900: '#0a0f0d', // near-black background
          850: '#0a1712', // elevated shell / nav surface
          800: '#0b1f17', // deep emerald shadow
          700: '#0f2a1f',
          600: '#143b2c',
          500: '#1b4d39',
        },
        gold: {
          500: '#d4af37', // primary gold accent
          400: '#e6c75b',
          300: '#f2dd8c',
          200: '#f7e9b3', // brightest sheen highlight
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
      letterSpacing: {
        deco: '0.3em',
      },
      transitionTimingFunction: {
        // Exponential ease-outs — no bounce, no elastic.
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(212,175,55,0.28), 0 10px 30px -10px rgba(212,175,55,0.38)',
        'gold-lg': '0 0 0 1px rgba(212,175,55,0.35), 0 14px 40px -10px rgba(212,175,55,0.45)',
        deco: '0 18px 50px -18px rgba(0,0,0,0.82)',
        card: '0 12px 38px -16px rgba(0,0,0,0.72)',
        glow: '0 0 26px -4px rgba(212,175,55,0.5)',
        // Hairline top highlight — the "lit from above" candlelight edge.
        rim: 'inset 0 1px 0 0 rgba(247,233,179,0.08)',
      },
      backgroundImage: {
        'gold-grad': 'linear-gradient(155deg, #f2dd8c 0%, #d4af37 48%, #b8941f 100%)',
        'gold-sheen':
          'linear-gradient(110deg, transparent 30%, rgba(247,233,179,0.14) 50%, transparent 70%)',
      },
      keyframes: {
        'chip-pop': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'count-flash': {
          '0%': { color: '#f7e9b3', textShadow: '0 0 18px rgba(212,175,55,0.55)' },
          '100%': { color: '#f4efe1', textShadow: '0 0 0 rgba(212,175,55,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Entrance: rise + fade. fill-mode both keeps it visible at rest.
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Slow, recurring sheen sweep for the hero balance.
        sheen: {
          '0%': { backgroundPosition: '-150% 0' },
          '100%': { backgroundPosition: '250% 0' },
        },
      },
      animation: {
        'chip-pop': 'chip-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'count-flash': 'count-flash 0.9s ease-out',
        shimmer: 'shimmer 2.5s linear infinite',
        rise: 'rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        sheen: 'sheen 6s cubic-bezier(0.16, 1, 0.3, 1) infinite',
      },
    },
  },
  plugins: [],
}
