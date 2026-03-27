/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--tw-primary)',
          dark: 'var(--tw-primary-dark)',
        },
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%':            { transform: 'translateY(-6px)' },
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in-up':     'fadeInUp 0.2s ease both',
        'slide-in-right': 'slideInRight 0.22s ease both',
        'typing':         'typing 1.4s infinite',
        'badge-pulse':    'pulse2 2s infinite',
        'spin':           'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [],
}

