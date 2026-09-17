/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f8fafc',
        surface: '#ffffff',
        primary: '#0f172a',
        accent: '#1d4ed8',
        success: '#16a34a',
        warning: '#f59e0b',
        danger: '#dc2626',
        muted: '#475569'
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.06)',
        md: '0 8px 24px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
