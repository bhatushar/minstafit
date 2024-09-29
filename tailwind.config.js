/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{html,js,ts,svelte}"],
  theme: {
    extend: {
      fontFamily: {
        title: ['"Caveat Brush"', "cursive"],
      },
    },
  },
  plugins: [],
};
