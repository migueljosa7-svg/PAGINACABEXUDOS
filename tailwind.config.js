export default {
  content: ['./src/**/*.{ts,tsx}', './public/**/*.html'],
  darkMode: 'class',
  // Sin reset global: la app ya trae el suyo. Solo se emiten las variables --tw-* base.
  corePlugins: { preflight: false },
  theme: {
    extend: {},
  },
  plugins: [],
};
