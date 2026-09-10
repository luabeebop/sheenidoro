/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // neutrals — aquirin's black/white, inverted for a dark terminal
        void: '#000000',
        panel: '#07080a',
        panel2: '#0d0f12',
        panel3: '#14171b',
        line: '#1e2227',
        line2: '#2c3238',
        txt: '#ffffff',
        dim: '#8b9199',
        faint: '#4c5259',
        // phase accents — `hot` is aquirin's red
        hot: '#ff0033',
        hotDim: '#a3001f',
        ice: '#00e5ff',
        iceDim: '#00879b',
        gold: '#ffb000',
        goldDim: '#9c6c00',
      },
      fontFamily: {
        mono: ['Inconsolata', 'JetBrainsMono Nerd Font', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        sans: ['Inconsolata', 'JetBrainsMono Nerd Font', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        hud: '0.22em',
        wide2: '0.14em',
      },
      boxShadow: {
        hot: '0 0 0 1px rgba(255,0,51,0.55), 0 0 22px rgba(255,0,51,0.22)',
        inset: 'inset 0 0 40px rgba(255,255,255,0.02)',
      },
      animation: {
        blink: 'blink 1.05s steps(2, start) infinite',
        flicker: 'flicker 4.5s infinite steps(1)',
        pulseBar: 'pulseBar 1.6s ease-in-out infinite',
      },
      keyframes: {
        pulseBar: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
