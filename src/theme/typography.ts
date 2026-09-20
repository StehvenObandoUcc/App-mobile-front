/**
 * Warm Material Editorial Typography Tokens
 *
 * Jerarquía tipográfica editorial con pesos y alturas de línea
 * totalmente compatibles con Android y accesibles según WCAG.
 */

export const typography = {
  sizes: {
    screenTitle: 30, // 28–32: Título de pantalla principal
    sectionTitle: 21, // 20–22: Título de sección editorial
    cardTitle: 17, // 16–18: Título de tarjetas e ingredientes
    body: 15, // 15–16: Cuerpo de texto y párrafos
    bodySmall: 14, // 14: Texto secundario de formularios
    metadata: 13, // 12–13: Metadatos, tiempos y dificultad
    label: 12, // 11–12: Chips, badges y etiquetas funcionales
    caption: 11, // 11: Notas al pie y microtextos auxiliares
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeights: {
    screenTitle: 36,
    sectionTitle: 28,
    cardTitle: 24,
    body: 22,
    bodySmall: 20,
    metadata: 18,
    label: 16,
    caption: 14,
  },
} as const;

export type ThemeTypography = typeof typography;
