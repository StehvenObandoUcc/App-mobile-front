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
  buttonHeight: 52,   // 48 → 52: alinea el token con la altura real de los botones
  inputHeight: 52,    // 48 → 52: campos de entrada

  // ─── Alias semánticos (Despensa Tonal · Etapa 2) ────────────────────────────
  screenGutter: 20,   // Margen lateral de pantalla
  cardPadding: 20,    // Relleno interno de tarjetas
  sectionGap: 32,     // Separación entre secciones
  tileGap: 12,        // Separación entre FeatureTiles
} as const;

export type ThemeSpacing = typeof spacing;
