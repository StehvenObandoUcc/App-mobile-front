/**
 * Despensa Tonal — Typography Tokens (rediseño M3 · Etapa 2)
 *
 * Se conservan todas las claves de Warm Material Editorial; cambian algunos valores
 * y se añaden alias M3 (displayNumber, weights.light, letterSpacing, families).
 * Fuente de marca: Outfit (OFL). Carga: src/hooks/useBrandFonts.ts ·
 * uso en componentes: fontFamilyFor() de src/utils/brand-font.ts.
 */

export const typography = {
  families: {
    light: 'Outfit-Light',
    regular: 'Outfit-Regular',
    medium: 'Outfit-Medium',
    semibold: 'Outfit-SemiBold',
    bold: 'Outfit-Bold',
  },
  sizes: {
    displayNumber: 44, // NUEVO: cifras grandes (días, métricas del Inicio)
    screenTitle: 32, // 30 → 32 · M3 displaySmall (peso 300 + énfasis 600)
    headline: 24, // M3 headlineSmall
    sectionTitle: 20, // 21 → 20 · M3 titleLarge
    cardTitle: 17, // M3 titleMedium
    body: 16, // 15 → 16 · M3 bodyLarge
    bodySmall: 14, // M3 bodyMedium
    metadata: 13, // M3 labelLarge
    label: 12, // M3 labelMedium (+0.6 de tracking)
    caption: 12, // 11 → 12 · M3 bodySmall
    micro: 11, // 10 → 11 · M3 labelSmall (solo badges numéricos)
  },
  weights: {
    light: '300' as const, // NUEVO: titulares con contraste de peso
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const, // compatibilidad; evitar en el nuevo estilo
  },
  lineHeights: {
    displayNumber: 48,
    screenTitle: 40,
    headline: 32,
    sectionTitle: 28,
    cardTitle: 24,
    body: 24,
    bodySmall: 20,
    metadata: 18,
    label: 16,
    caption: 16,
    micro: 14,
  },
  letterSpacing: {
    label: 0.6,
    overline: 1.2,
  },
} as const;

export type ThemeTypography = typeof typography;
