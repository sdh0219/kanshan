/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        detective: {
          bg: '#0a0e1a',
          card: '#131b30',
          border: '#2a3650',
          accent: '#E8833A',
          blue: '#4472C4',
        },
      },
    },
  },
  plugins: [],
};
