/**
 * Paleta Sandía — Color Tokens (claro + oscuro «Cacao suave»)
 *
 * 4 colores de marca: Sandía (acción), Lima (frescura), Ciruela (IA) y la base Crema · Cacao.
 * 2 colores de sistema SOLO para estados: Ladrillo (error, vencido, borrar) y Miel (próximo a vencer).
 *
 * `lightColors` y `darkColors` tienen exactamente las mismas claves. Los componentes leen el tema
 * activo con `useTheme()` / `makeStyles()` (src/theme/ThemeProvider.tsx). El export `colors`
 * (= claro) queda para el código que aún no migró y para lo que vive fuera de React.
 *
 * Contrastes WCAG 2.1 medidos: texto >= 4.5:1, UI >= 3:1. Ver tablero «2 · Paleta Sandía» del lienzo.
 * Respaldo de la paleta anterior (Despensa Tonal): .design-backup/fase0-tema/colors.ts
 */

type M3 = {
  primary: string; onPrimary: string; primaryContainer: string; onPrimaryContainer: string; primaryPressed: string;
  secondary: string; onSecondary: string; secondaryContainer: string; onSecondaryContainer: string; secondaryPressed: string;
  tertiary: string; onTertiary: string; tertiaryContainer: string; onTertiaryContainer: string; tertiaryPressed: string;
  error: string; onError: string; errorContainer: string; onErrorContainer: string;
  surface: string; surfaceContainerLowest: string; surfaceContainerLow: string; surfaceContainer: string;
  surfaceContainerHigh: string; surfaceContainerHighest: string;
  onSurface: string; onSurfaceVariant: string; outline: string; outlineVariant: string;
  /** Superficie oscura en AMBOS modos: barra de navegación, barra de selección, tarjeta de escaneo. */
  inverseSurface: string; inverseOnSurface: string; inversePrimary: string;
  scrim: string;
};

type Extended = {
  /** Botón flotante, punto activo y badges sobre la barra oscura. */
  accent: string; onAccent: string;
  navIconIdle: string; textMuted: string; inkPressed: string;
  cameraScrim: string; onCameraMuted: string; quotaDotIdle: string; textBody: string;
  /** Pastilla de crédito sobre fotos (Unsplash). Texto blanco encima: ≥ 8:1 aun sobre una foto blanca (peor caso). */
  photoScrim: string;
  /** Lima tal cual (relleno de barras y medidores); para texto usar `secondary`. */
  limeFill: string;
  /** Miel: texto/icono de aviso sobre superficies. */
  warning: string;
  /** Tarjeta «Escanea tus alimentos» (IA de visión): ciruela, color de la IA. */
  aiHero: string; onAiHero: string; aiHeroMuted: string; aiHeroChip: string; aiHeroPressed: string;
};

type Tone = { background: string; border: string; text: string };
type Cat = { text: string; background: string; accent?: string };

function build(m3: M3, ext: Extended, f: Record<'fresh' | 'expiringSoon' | 'expired' | 'unknown', Tone>, neutralCat: Cat) {
  return {
    m3,
    ...ext,

    // ═══ Alias heredados (misma API de siempre) ═══
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

    /** Botón principal, selección y foco: Sandía. */
    ink: m3.primary,
    onInk: m3.onPrimary,

    /** Barra oscura (nav, selección, escaneo) y su texto. */
    bar: m3.inverseSurface,
    onBar: m3.inverseOnSurface,

    textPrimary: m3.onSurface,
    textSecondary: m3.onSurfaceVariant,
    textInverse: '#FFFFFF',

    border: m3.outlineVariant,
    borderStrong: m3.outline,
    scrim: m3.scrim,

    functional: f,

    // Verduras y Frutas conservan un tinte (lima / sandía); el resto se reconoce por su icono.
    categories: {
      vegetable: { text: f.fresh.text, background: f.fresh.background } as Cat,
      fruit: { text: m3.onPrimaryContainer, background: m3.primaryContainer, accent: m3.primary } as Cat,
      protein: { ...neutralCat },
      dairy: { ...neutralCat },
      grain: { ...neutralCat },
      legume: { ...neutralCat },
      sauce: { ...neutralCat, accent: m3.primary } as Cat,
      snack: { ...neutralCat, accent: ext.accent } as Cat,
      other: { ...neutralCat },
    },

    // Dificultad: se lee por número de segmentos (todos en Sandía) sobre un contenedor neutro.
    difficulty: {
      // Contenedor neutro en los tres niveles: Miel es solo de vencimientos y Ladrillo de errores.
      easy: { text: m3.onSurface, background: m3.surfaceContainer, segment: m3.primary, level: 1 },
      medium: { text: m3.onSurface, background: m3.surfaceContainer, segment: m3.primary, level: 2 },
      hard: { text: m3.onSurface, background: m3.surfaceContainer, segment: m3.primary, level: 3 },
    },

    error: { text: m3.error, background: m3.errorContainer },

    skeleton: { background: m3.surfaceContainer, highlight: m3.surfaceContainerHigh },
  };
}

// ─── Claro ──────────────────────────────────────────────────────────────────
export const lightColors = build(
  {
    primary: '#C33149', // Sandía · blanco 5.45:1 · sobre fondo 5.03:1
    onPrimary: '#FFFFFF',
    primaryContainer: '#FADAE0', // cacao 12.7:1
    onPrimaryContainer: '#5E0A1C', // 10.7:1
    primaryPressed: '#A0263B',

    secondary: '#4F6A10', // Lima (tono de texto/botón) · blanco 6.17:1
    onSecondary: '#FFFFFF',
    secondaryContainer: '#DEECAE',
    onSecondaryContainer: '#22300A', // 11.2:1
    secondaryPressed: '#43590C',

    tertiary: '#7A427B', // Ciruela IA · blanco 7.26:1
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#ECE0ED', // tertiary encima 5.69:1
    onTertiaryContainer: '#45213F', // 10.7:1
    tertiaryPressed: '#643466', // blanco 9.44:1

    error: '#A3301A', // Ladrillo
    onError: '#FFFFFF',
    errorContainer: '#FBE0D8',
    onErrorContainer: '#5A1407',

    surface: '#FDF5E9', // Crema · cacao 15.3:1 · textMuted 5.92:1
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F5ECDF',
    surfaceContainer: '#EFE5D7',
    surfaceContainerHigh: '#E8DDCE',
    surfaceContainerHighest: '#E1D5C5',
    onSurface: '#2B1B17', // Cacao · 15:1
    onSurfaceVariant: '#5E4B43', // 7.4:1
    outline: '#8A776B', // 3.87:1
    outlineVariant: '#DCCFBF',

    inverseSurface: '#2B1B17',
    inverseOnSurface: '#F7EFE8',
    inversePrimary: '#FFB2BB', // 9.7:1 sobre la barra
    scrim: 'rgba(43, 27, 23, 0.48)',
  },
  {
    accent: '#EF7487', // 5.9:1 sobre la barra
    onAccent: '#2B1B17',
    navIconIdle: '#D9C3B8',
    textMuted: '#6E5B51', // 5.92:1 sobre crema
    inkPressed: '#A0263B',
    cameraScrim: '#1E1714',
    photoScrim: 'rgba(30, 23, 20, 0.78)',
    onCameraMuted: '#F2E6DE',
    quotaDotIdle: '#7A5A4F',
    textBody: '#3B2B25',
    limeFill: '#A8C256',
    warning: '#7A5900',
    aiHero: '#7A427B', // blanco encima 7.26:1
    onAiHero: '#FFFFFF',
    aiHeroMuted: '#EEDDED', // sobre aiHero 5.6:1
    aiHeroChip: '#925E94', // blanco encima 4.94:1
    aiHeroPressed: '#643466',
  },
  {
    fresh: { background: '#DEECAE', border: '#C4DA7C', text: '#22300A' },
    expiringSoon: { background: '#FCE295', border: '#ECCA5E', text: '#4A3600' }, // texto 9.05:1
    expired: { background: '#FBE0D8', border: '#F2B9A9', text: '#7A2412' },
    unknown: { background: '#EFE5D7', border: '#DCCFBF', text: '#4F3F38' },
  },
  { text: '#2B1B17', background: '#EFE5D7' }
);

export type ThemeColors = typeof lightColors;

// ─── Oscuro · Cacao suave (no negro; texto crema ~12:1 para cansar menos la vista) ──
export const darkColors: ThemeColors = build(
  {
    primary: '#EF7487', // 5.58:1 sobre fondo
    onPrimary: '#3A0D17',
    primaryContainer: '#553437',
    onPrimaryContainer: '#FFD9DE',
    primaryPressed: '#F58E9E',

    secondary: '#B6CC6A',
    onSecondary: '#22300A',
    secondaryContainer: '#46442F',
    onSecondaryContainer: '#DCEBB0',
    secondaryPressed: '#C4D886',

    tertiary: '#D4AECF',
    onTertiary: '#3E1838',
    tertiaryContainer: '#4C3E43',
    onTertiaryContainer: '#F3DDEF',
    tertiaryPressed: '#E0C0DB',

    error: '#FFB4A3',
    onError: '#5C1606',
    errorContainer: '#5A2A20',
    onErrorContainer: '#FFDAD2',

    surface: '#2A2220',
    surfaceContainerLowest: '#332A27',
    surfaceContainerLow: '#3A302C',
    surfaceContainer: '#3D3532',
    surfaceContainerHigh: '#453C39',
    surfaceContainerHighest: '#4D4440',
    onSurface: '#EADFD3', // 11.9:1
    onSurfaceVariant: '#CDBFB2', // 8.7:1
    outline: '#9C8D82', // 4.9:1
    outlineVariant: '#4F433D',

    inverseSurface: '#3D322E',
    inverseOnSurface: '#EADFD3',
    inversePrimary: '#FFB2BB',
    scrim: 'rgba(0, 0, 0, 0.6)',
  },
  {
    accent: '#EF7487',
    onAccent: '#3A0D17',
    navIconIdle: '#CDBFB2',
    textMuted: '#B3A497', // 6.4:1
    inkPressed: '#F58E9E',
    cameraScrim: '#1E1714',
    photoScrim: 'rgba(30, 23, 20, 0.78)',
    onCameraMuted: '#F2E6DE',
    quotaDotIdle: '#7A5A4F',
    textBody: '#DCCFC3',
    limeFill: '#B6CC6A',
    warning: '#E9C46A',
    aiHero: '#4E3049', // texto 8.9:1
    onAiHero: '#F3DDEF',
    aiHeroMuted: '#DCC9D8', // 7.27:1
    aiHeroChip: '#634060', // 6.74:1
    aiHeroPressed: '#5A3A55',
  },
  {
    fresh: { background: '#46442F', border: '#5E6040', text: '#DCEBB0' },
    expiringSoon: { background: '#4D3F1F', border: '#6B5826', text: '#F8E7B0' },
    expired: { background: '#5A2A20', border: '#7A3A2C', text: '#FFDAD2' },
    unknown: { background: '#3D3532', border: '#4F433D', text: '#DCCFC3' },
  },
  { text: '#EADFD3', background: '#3D3532' }
);

/** Mismo color con otra opacidad (para degradados a «transparente» que no viren a gris). Solo hex de 6 dígitos. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Paleta clara estática: solo para código que aún no usa `useTheme()` o que vive fuera de React. */
export const colors = lightColors;
