/**
 * Despensa Tonal — Radii Tokens (rediseño M3 · Etapa 2)
 * Formas más orgánicas; mismas claves que Warm Material Editorial + 3 nuevas.
 */

export const radii = {
  xs: 4, // Checkboxes, indicadores de estado online
  sm: 8, // Badges compactos y sub-chips
  chips: 10, // Se mantiene: varias pantallas lo usan en cajas y badges rectangulares
  buttons: 14, // Se mantiene: usado en tarjetas e inputs heredados (lista de compras, formularios)
  pill: 999, // NUEVO: forma de píldora para Chip, botones y buscador rediseñados
  alerts: 20, // NUEVO: avisos y banners (OfflineBanner)
  fields: 16, // NUEVO: inputs multilínea de formularios
  fab: 20, // NUEVO: FAB squircle de escaneo
  cards: 24, // 16 → 24: tarjetas de ingredientes y recetas
  tiles: 28, // NUEVO: FeatureTile y hero del Inicio
  containers: 32, // 22 → 32: diálogos y hojas inferiores
  floatingNav: 36, // 32 → 36: barra flotante de navegación
  circular: 999, // Botones redondos, avatares y píldoras completas
} as const;

export type ThemeRadii = typeof radii;
