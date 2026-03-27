/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan app and component files for utility classes.
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0b1020',
        slate: '#111a2d',
        mist: '#9fb4d1',
        glow: '#52d3ff',
        mint: '#22c55e',
        amber: '#f59e0b',
        rose: '#ef4444'
      },
      boxShadow: {
        panel: '0 15px 40px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};
