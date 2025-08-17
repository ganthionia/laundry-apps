javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb", // biru utama
        secondary: "#f97316", // oranye aksen
        neutral: "#f3f4f6", // abu soft untuk background
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem'
      },
      boxShadow: {
        soft: "0 4px 10px rgba(0,0,0,0.06)",
        card: "0 6px 16px rgba(0,0,0,0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};