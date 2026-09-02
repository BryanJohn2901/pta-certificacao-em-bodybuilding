/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./curta-a/index.html",
    "./curta-b/index.html",
    "./curta-c/index.html",
    "./curta-d/index.html",
    "./longa-a/index.html",
    "./longa-b/index.html",
    "./longa-c/index.html",
    "./longa-d/index.html",
    "./bb6-obg/index.html",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1d1d1b",
        ink2: "#262623",
        ink3: "#2f2f2b",
        line: "#3a3a35",
        linesoft: "#2c2c28",
        paper: "#ffffff",
        text: "#e9e7e3",
        muted: "#a1a1aa",
        muted2: "#8b8b93",
        red: "#c82328",
        reddeep: "#8f181c",
        ember: "#c82328",
        brand: {
          bg: "#1d1d1b",
          surface: "#262623",
          primary: "#c82328",
        },
      },
      fontFamily: {
        body: ["Inter", "sans-serif"],
        display: ["Archivo", "sans-serif"],
        mono: ["Inter", "sans-serif"],
      },
    },
  },
  safelist: ["hidden", "flex", "show"],
};
