/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        surface: {
          base: '#0f172a',
          raised: '#1e293b',
          sunken: '#0b1120',
          overlay: 'rgba(15, 23, 42, 0.8)',
          subtle: '#1f2937',
          card: '#111827',
        },
        text: {
          primary: '#f8fafc',
          secondary: '#e2e8f0',
          muted: '#94a3b8',
          inverted: '#0f172a',
        },
        info: {
          100: '#e0f2fe',
          200: '#bae6fd',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          100: '#fee2e2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        accent: {
          100: '#cffafe',
          200: '#a5f3fc',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Tile colors
        'tile-enemy': '#dc2626',      // red-600
        'tile-treasure': '#eab308',   // yellow-600
        'tile-chance': '#9333ea',      // purple-600
        'tile-sanctuary': '#16a34a',  // green-600
        'tile-empty': '#6b7280',       // gray-500
        'tile-start': '#3b82f6',       // blue-500
        'tile-final': '#f59e0b',       // amber-500

        // Item tier colors
        'tier-1': '#fbbf24',           // yellow-400
        'tier-2': '#92400e',           // amber-800
        'tier-3': '#7c3aed',           // violet-600
      },
      fontFamily: {
        display: ['"Unbounded"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'label-sm': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        'label-md': ['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '0.04em' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'body-md': ['1rem', { lineHeight: '1.5rem' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'title-sm': ['1.25rem', { lineHeight: '1.75rem' }],
        'title-md': ['1.5rem', { lineHeight: '2rem' }],
        'display-sm': ['2rem', { lineHeight: '2.5rem' }],
        'display-md': ['2.75rem', { lineHeight: '3.25rem' }],
      },
      spacing: {
        '3xs': '0.125rem',
        '2xs': '0.25rem',
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
      },
      animation: {
        'dice-roll': 'diceRoll 0.5s ease-in-out',
        'token-move': 'tokenMove 0.3s ease-in-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'panel-pop': 'panelPop 0.25s ease-out',
        shimmer: 'shimmer 2.4s infinite linear',
      },
      keyframes: {
        diceRoll: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.2)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        tokenMove: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
        panelPop: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
