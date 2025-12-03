/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'toon-bg': 'var(--app-bg)',
        'toon-sidebar': 'var(--sidebar-bg)',
        'toon-component': 'var(--component-bg)',
        'toon-accent': 'var(--accent-color)',
        'toon-text': 'var(--text-color)',
        'toon-border': 'var(--border-color)',
      },
      boxShadow: {
        'hard': '4px 4px 0px 0px var(--shadow-color, #000000)',
        'hard-sm': '2px 2px 0px 0px var(--shadow-color, #000000)',
        'hard-lg': '6px 6px 0px 0px var(--shadow-color, #000000)',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}