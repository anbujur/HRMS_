import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d8efff",
          500: "#1f8fea",
          600: "#0f72c5",
          900: "#12324d"
        }
      }
    }
  },
  plugins: []
};

export default config;
