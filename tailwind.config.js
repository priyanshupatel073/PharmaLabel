/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        canvas: '#f4f6fb',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card:   '0 2px 12px rgba(0,0,0,0.07)',
        cardHov:'0 8px 28px rgba(0,0,0,0.12)',
        nav:    '0 4px 15px rgba(99,102,241,0.30)',
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.25rem',
      }
    },
  },
  plugins: [],
}
