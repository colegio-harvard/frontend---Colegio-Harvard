/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F5',
          100: '#FECDD3',
          200: '#FCA5A5',
          300: '#F87171',
          400: '#E04848',
          500: '#C62828',
          600: '#B71C1C',
          700: '#991B1B',
          800: '#7F1D1D',
          900: '#631111',
        },
        gold: {
          50: '#FFFDF5',
          100: '#FEF5D4',
          200: '#FDECB2',
          300: '#F5D680',
          400: '#E8BF4D',
          500: '#C5963A',
          600: '#B8860B',
          700: '#996F0A',
          800: '#7A5908',
          900: '#5C4306',
        },
        cream: {
          50: '#FFFCF8',
          100: '#FDF8F3',
          200: '#F5EDE3',
          300: '#EDE1D3',
          400: '#DDD0BF',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C5963A 0%, #E8BF4D 50%, #C5963A 100%)',
        'gold-gradient-subtle': 'linear-gradient(135deg, #B8860B 0%, #C5963A 50%, #DAA520 100%)',
        'crimson-gradient': 'linear-gradient(135deg, #B71C1C 0%, #C62828 50%, #991B1B 100%)',
        'cream-gradient': 'linear-gradient(180deg, #FFFCF8 0%, #FDF8F3 50%, #F5EDE3 100%)',
        'sidebar-gradient': 'linear-gradient(180deg, #7F1D1D 0%, #991B1B 40%, #631111 100%)',
        'login-gradient': 'linear-gradient(135deg, #FDF8F3 0%, #FEF5D4 30%, #FECDD3 70%, #FDF8F3 100%)',
      },
      boxShadow: {
        'gold': '0 1px 3px 0 rgba(197, 150, 58, 0.2), 0 1px 2px 0 rgba(197, 150, 58, 0.1)',
        'gold-md': '0 4px 6px -1px rgba(197, 150, 58, 0.15), 0 2px 4px -1px rgba(197, 150, 58, 0.1)',
        'gold-lg': '0 10px 25px -3px rgba(197, 150, 58, 0.2), 0 4px 6px -2px rgba(197, 150, 58, 0.1)',
        'crimson': '0 4px 14px 0 rgba(183, 28, 28, 0.15)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 25px rgba(197, 150, 58, 0.12), 0 4px 10px rgba(0,0,0,0.04)',
      },
      borderColor: {
        'gold-light': 'rgba(197, 150, 58, 0.2)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
