/**
 * Warm Material Editorial Radii Tokens
 *
 * Escala granular de formas orgánicas para Android / iOS.
 */

export const radii = {
  xs: 4, // Checkboxes, indicadores de estado online
  sm: 8, // Badges compactos y sub-chips
  chips: 10, // Chips, badges y etiquetas funcionales
  buttons: 14, // Botones primarios y secundarios, inputs
  cards: 16, // Tarjetas de ingredientes y recetas
  containers: 22, // Modales y contenedores principales
  floatingNav: 32, // Barra flotante de navegación inferior
  circular: 999, // Botones redondos, avatares y píldoras completas
} as const;

export type ThemeRadii = typeof radii;
