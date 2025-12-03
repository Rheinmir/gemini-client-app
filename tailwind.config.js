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
        'hard': '2px 2px 0px 0px var(--shadow-color, #000000)',
        'hard-md': '3px 3px 0px 0px var(--shadow-color, #000000)',
        'hard-lg': '5px 5px 0px 0px var(--shadow-color, #000000)',
      },
      borderWidth: {
        '2': '2px',
      }
    },
  },
  plugins: [],
}