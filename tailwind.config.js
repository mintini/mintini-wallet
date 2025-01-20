/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          light: '#DFF8E1',  // Light mint green
          DEFAULT: '#74C7A4',  // Primary mint green
          dark: '#4E9B7E',  // Darker mint green
        },
        silver: {
          light: '#E0E0E0',  // Light silver
          DEFAULT: '#B3B3B3',  // Primary silver
          dark: '#7A7A7A',  // Darker silver
        },
        white: '#FFFFFF',  // Standard white
        black: '#333333',  // Black for contrast text or elements
      },
    },
  },
  plugins: [],
}

