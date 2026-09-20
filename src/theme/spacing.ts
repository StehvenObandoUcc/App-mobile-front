/**
 * Warm Material Editorial Spacing Tokens
 *
 * Escala modular de 4dp para márgenes, paddings y dimensiones de componentes.
 * Garantiza touch targets confortables (>= 48dp) conforme a directrices de Android M3.
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,

  // ─── Directrices Táctiles y Accesibilidad ──────────────────────────────────
  touchTargetMin: 48, // Touch target mínimo de 48dp para Android
  buttonHeight: 48,   // Altura estándar de botones interactivos
  inputHeight: 48,    // Altura estándar de campos de entrada
} as const;

export type ThemeSpacing = typeof spacing;
