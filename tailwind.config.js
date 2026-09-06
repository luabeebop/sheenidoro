/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sakuraBg: '#fff0f5',
        sakuraBg2: '#ffe4ec',
        sakuraAccent: '#f8c8d4',
        sakuraAccent2: '#f4b6c2',
        sakuraPrimary: '#f472b6',
        sakuraPrimaryDark: '#db2777',
        sakuraPrimaryLight: '#f9a8d4',
        sakuraText: '#5c3a4a',
        sakuraMuted: '#9d6b7a',
        sakuraCard: '#ffffff',
        sakuraBorder: '#ffd6e0',
      },
      fontFamily: {
        mono: ['JetBrainsMono Nerd Font', 'JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sakura: '0 4px 24px rgba(244,114,182,0.15)',
        sakuraLg: '0 8px 32px rgba(244,114,182,0.18)',
      },
      animation: {
        breathe: 'breathe 3s ease-in-out infinite',
        pop: 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        pop: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
