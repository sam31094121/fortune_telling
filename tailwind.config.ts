import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sky: {
          deep: 'var(--sky-deep)',
          purple: 'var(--sky-purple)',
          violet: 'var(--sky-violet)',
        },
        earth: {
          dark: 'var(--earth-dark)',
          gold: 'var(--earth-gold)',
          bronze: 'var(--earth-bronze)',
        },
        human: {
          light: 'var(--human-light)',
          pink: 'var(--human-pink)',
          cyan: 'var(--human-cyan)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
      },
      boxShadow: {
        mystic: '0 0 40px rgba(109,74,255,0.16), inset 0 0 24px rgba(255,255,255,0.04)',
        'mystic-strong':
          '0 0 56px rgba(109,74,255,0.22), 0 0 18px rgba(244,201,93,0.12), inset 0 0 24px rgba(255,255,255,0.06)',
      },
      borderRadius: {
        mystic: '24px',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.42' },
          '50%': { opacity: '0.85' },
        },
        shimmer: {
          from: { transform: 'translateX(-130%)' },
          to: { transform: 'translateX(130%)' },
        },
      },
      animation: {
        twinkle: 'twinkle 7s ease-in-out infinite alternate',
        shimmer: 'shimmer 1.4s ease',
      },
    },
  },
  plugins: [],
};

export default config;
