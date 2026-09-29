// Metro (Expo): configuración por defecto + inlineRequires.
// inlineRequires carga cada módulo cuando se usa por primera vez (no todos al abrir): arranque más rápido.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
