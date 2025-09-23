/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      animation: {
        'dice-roll': 'diceRoll 0.5s ease-in-out',
        'token-move': 'tokenMove 0.3s ease-in-out',
        'pulse-glow': 'pulseGlow 2s infinite',
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
      },
    },
  },
  plugins: [],
}