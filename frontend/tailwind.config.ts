import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
      },
      colors: {
        indigo: {
          500: "var(--color-indigo-500)",
          600: "var(--color-indigo-600)",
        },
        purple: {
          500: "var(--color-purple-500)",
          600: "var(--color-purple-600)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
