/**
 * Despensa Tonal — Color Tokens (rediseño M3 · Etapa 2)
 *
 * Evolución de "Warm Material Editorial":
 *  - `m3`: roles de color Material 3 completos (fuente de verdad).
 *  - Las claves heredadas (background, primary, textPrimary, functional, categories…)
 *    conservan el MISMO nombre y forma, ahora apuntando a los roles M3,
 *    para que las 8 pantallas y los 16 componentes compilen sin cambios.
 *
 * Contrastes medidos (WCAG 2.1) anotados en cada par. Texto >= 4.5:1, UI >= 3:1.
 * Respaldo de la paleta anterior: .design-backup/etapa2-2026-09-28/theme/colors.ts
 */

const m3 = {
  // ─── Primary · Tomate (escaneo, Chef IA, estado activo, enlaces) ─────────
  primary: '#B3432A', // blanco encima 5.60:1 · sobre surface 5.11:1
  onPrimary: '#FFFFFF',
  primaryContainer: '#FFDBCD', // durazno
  onPrimaryContainer: '#5A1A09', // 10.25:1 (no usar `primary` como texto aquí: 4.33)
  primaryPressed: '#8F3220', // blanco encima 7.94:1

  // ─── Secondary · Salvia (despensa, frescura, éxito) ──────────────────────
  secondary: '#4A6741', // blanco encima 6.35:1
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DCEBD3',
  onSecondaryContainer: '#1F4A1A', // 8.22:1
  secondaryPressed: '#3F5C37', // 7.51:1

  // ─── Tertiary · Frambuesa IA (coincidencia, Chef IA, pasos generados) ────
  tertiary: '#9C3D52', // blanco encima 6.56:1 · sobre surface 5.99:1
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#F6D5DD', // rosa frío: distinto del pastel de «Proteínas»
  onTertiaryContainer: '#5C1A2E', // 9.43:1
  tertiaryPressed: '#7E2F42', // blanco encima 8.85:1

  // ─── Error · Chile ───────────────────────────────────────────────────────
  error: '#B3261E', // blanco encima 6.54:1 · sobre errorContainer 5.14:1
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B', // 12.77:1

  // ─── Superficies «avena» ─────────────────────────────────────────────────
  surface: '#F8F4EF', // fondo de pantalla
  surfaceContainerLowest: '#FFFFFF', // tarjetas
  surfaceContainerLow: '#F3EEE8', // campos
  surfaceContainer: '#EDE7E0', // chips inactivos, skeleton
  surfaceContainerHigh: '#E7E0D8', // brillo skeleton, deshabilitado
  surfaceContainerHighest: '#E0D8CF', // pistas de medidores
  onSurface: '#211B18', // 15.53:1 sobre surface
  onSurfaceVariant: '#5A4F48', // 7.25:1
  outline: '#857970', // 3.86:1 — bordes de campos y chips (UI >= 3:1)
  outlineVariant: '#DDD3CA', // decorativo: divisores

  // ─── Cacao (inverse): café rojizo de la familia del tomate, no negro ──────
  inverseSurface: '#4A2A21', // CTA principal y barra de navegación · blanco 12.77:1
  inverseOnSurface: '#F7EFE8', // 11.23:1
  inversePrimary: '#FFB59E', // 7.51:1 sobre cacao
  scrim: 'rgba(33, 27, 24, 0.48)',
} as const;

/** Colores extendidos (M3 "custom colors") propios de la marca. */
const extended = {
  accent: '#E86B45', // FAB sobre cacao (4.03:1 vs barra) con icono cacao (4.03:1)
  onAccent: '#2A2320',
  navIconIdle: '#D9C3B8', // 7.57:1 sobre cacao
  textMuted: '#6F635B', // 5.31:1 sobre surface · 5.04:1 sobre surfaceContainerLow
  inkPressed: '#5E382C', // blanco encima 10.11:1
  // Cámara (Escaneo.dc.html): velos sobre la vista en vivo y texto secundario claro
  cameraScrim: '#1E1714',
  onCameraMuted: '#F2E6DE',
  quotaDotIdle: '#7A5A4F', // punto de foto sin usar sobre cacao
  textBody: '#3F3631', // párrafos largos (Legal.dc.html) · 11.9:1 sobre blanco
} as const;

export const colors = {
  m3,
  ...extended,

  // ═══ Alias heredados (misma API que Warm Material Editorial) ═══════════════
  background: m3.surface,
  surface: m3.surfaceContainerLowest,
  surfaceVariant: m3.surfaceContainerLow,
  surfaceSubtle: m3.surfaceContainer,

  primary: m3.primary,
  primaryDark: m3.primaryPressed,
  primaryContainer: m3.primaryContainer,
  onPrimaryContainer: m3.onPrimaryContainer,

  secondary: m3.secondary,
  secondaryDark: m3.secondaryPressed,
  secondaryContainer: m3.secondaryContainer,
  onSecondaryContainer: m3.onSecondaryContainer,

  tertiary: m3.tertiary,
  tertiaryContainer: m3.tertiaryContainer,
  onTertiaryContainer: m3.onTertiaryContainer,

  ink: m3.inverseSurface, // PrimaryButton tone="ink"
  onInk: '#FFFFFF',

  textPrimary: m3.onSurface,
  textSecondary: m3.onSurfaceVariant,
  textInverse: '#FFFFFF',

  border: m3.outlineVariant,
  borderStrong: m3.outline,
  scrim: m3.scrim,

  // ─── Estados de caducidad (mismas claves) ────────────────────────────────
  functional: {
    fresh: { background: '#DCEBD3', border: '#B9D4AC', text: '#1F4A1A' }, // 8.22:1
    expiringSoon: { background: '#F8E7B0', border: '#E9CF7A', text: '#5C4300' }, // 7.55:1
    expired: { background: '#F9DEDC', border: '#F0B8B3', text: '#8C1D18' }, // 7.17:1
    unknown: { background: '#EDE7E0', border: '#DDD3CA', text: '#4E4540' }, // 7.61:1
  },

  // ─── Familias de despensa (mismas 9 claves; accent se conserva donde existía) ─
  categories: {
    vegetable: { text: '#1F4A1A', background: '#DCEBD3' }, // 8.22:1
    fruit: { text: '#5A1A09', background: '#FFDBCD', accent: '#B3432A' }, // 10.25:1
    protein: { text: '#5B1B17', background: '#F8D8D3' }, // 9.76:1
    dairy: { text: '#0D3B35', background: '#CFEBE4' }, // 9.83:1
    grain: { text: '#473500', background: '#F7E4A6' }, // 9.34:1
    legume: { text: '#45235A', background: '#EBDCF2' }, // 9.78:1
    sauce: { text: '#4D2616', background: '#EFD9CB', accent: '#B3432A' }, // 9.63:1
    snack: { text: '#4F2E00', background: '#FBE0B8', accent: '#E86B45' }, // 9.55:1
    other: { text: '#4E4540', background: '#EDE7E0' }, // 7.61:1
  },

  // ─── Dificultad (+ `segment`: color del medidor segmentado, UI >= 3:1) ────
  difficulty: {
    easy: { text: '#1F4A1A', background: '#DCEBD3', segment: '#4A6741', level: 1 },
    medium: { text: '#5C4300', background: '#F8E7B0', segment: '#8A6500', level: 2 },
    hard: { text: '#8C1D18', background: '#F9DEDC', segment: '#B3261E', level: 3 },
  },

  // ─── Estados de Error ─────────────────────────────────────────────────────
  error: {
    text: m3.error,
    background: m3.errorContainer,
  },

  // ─── Placeholders y Skeleton ──────────────────────────────────────────────
  skeleton: {
    background: m3.surfaceContainer,
    highlight: m3.surfaceContainerHigh,
  },
} as const;

export type ThemeColors = typeof colors;
