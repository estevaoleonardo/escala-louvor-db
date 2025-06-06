module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{html,js}",
    "./*.{html,js}",         // versão mais genérica
    "./**/*.{html,js}"       // para incluir todas as subpastas recursivamente
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}