/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        duck: {
          DEFAULT: '#00635d',
          dark: '#004d48',
          light: '#007a73',
        },
        pastel: {
          green: '#E8F5E9',
          greenDark: '#00635d',
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
