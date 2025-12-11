import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: "#331d83",
        blue: "#2093c4",
      },
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
    },
  },
};
