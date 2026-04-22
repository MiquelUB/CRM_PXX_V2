/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Acció Principal
        brand: {
          DEFAULT: '#4f46e5', // indigo-600
          dark: '#4338ca',
        },
        // Semàntica de Negoci (SaaS Plans)
        roure: '#b45309',      // amber-700
        mirador: '#0ea5e9',    // sky-500
        territori: '#059669',  // emerald-600
        // Kanban States
        state: {
          nou: '#3b82f6',      // blue-500
          contacte: '#a855f7', // purple-500
          guanyat: '#10b981',  // emerald-500
          perdut: '#f43f5e',   // rose-500
        }
      },
    },
  },
  plugins: [],
}
