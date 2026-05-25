import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        secondary: '#6366f1',
        accent: '#f97316',
        surface: '#ffffff',
        'surface-2': '#f8fafc',
        'surface-3': '#f1f5f9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(99,102,241,0.3)' },
          '50%': { borderColor: 'rgba(99,102,241,0.8)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'gradient-shift': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'orb-move': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 15px) scale(0.95)' },
        },
        'nav-underline': {
          '0%': { width: '0%', left: '50%' },
          '100%': { width: '100%', left: '0%' },
        },
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'slide-down': 'slide-down 0.4s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        'orb-move': 'orb-move 8s ease-in-out infinite',
      },
      backgroundSize: {
        '200%': '200%',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
