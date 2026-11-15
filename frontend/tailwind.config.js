/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#eef2ff',
          500: '#6366f1',
          600: '#4f46e5',
          900: '#312e81',
        },

        ink: {
          100: '#0f172a',
          200: '#334155',
          300: '#64748b',
          700: '#94a3b8',
          800: '#cbd5e1',
          900: '#f8fafc',
        },

        surface: '#ffffff',
        'surface-hover': '#f1f5f9',

        border: '#e2e8f0',

        muted: '#64748b',

        emerald: {
          500: '#10b981',
        },
      },

      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};