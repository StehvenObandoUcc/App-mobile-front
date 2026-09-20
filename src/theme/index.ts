import { Dimensions } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radii, elevations } from './radii';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SCREEN = { WIDTH: SCREEN_WIDTH, HEIGHT: SCREEN_HEIGHT };

// ─── Warm Material Editorial Theme ───────────────────────────────────────────
export const theme = {
  colors,
  typography,
  spacing,
  radii,
  elevations,
} as const;

export type Theme = typeof theme;

// ─── Exportaciones Directas de Tokens ─────────────────────────────────────────
export { colors, typography, spacing, radii, elevations };

// ─── Alias Retrocompatibles (Garantizan cero roturas en código existente) ────
export const COLORS = {
  // Brand
  primary: colors.primary,
  primaryMid: colors.primaryDark,
  primaryLight: colors.primaryContainer,
  accent: colors.secondary,
  accentLight: colors.secondaryContainer,

  // Warm accent
  orange: colors.secondary,
  orangeDeep: colors.primary,

  // Neutrals
  bg: colors.background,
  surface: colors.surface,
  surfaceAlt: colors.surfaceVariant,
  border: colors.border,

  // Text
  textPrimary: colors.textPrimary,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,

  // Status
  success: colors.functional.fresh.text,
  warning: colors.functional.expiringSoon.text,
  danger: colors.functional.expired.text,

  // Functional objects
  functional: colors.functional,

  // Gradients (Mapeados a tonos suaves y neutros para evitar saturación)
  gradientHero: [colors.primary, colors.primaryDark] as [string, string],
  gradientCard: [colors.surface, colors.surfaceVariant] as [string, string],
  gradientWarm: [colors.secondary, colors.primary] as [string, string],
  gradientSurface: [colors.surface, colors.surfaceVariant] as [string, string],
};

export const FONT = {
  sizes: {
    xs: typography.sizes.caption,
    sm: typography.sizes.metadata,
    md: typography.sizes.body,
    lg: typography.sizes.cardTitle,
    xl: typography.sizes.sectionTitle,
    xxl: typography.sizes.screenTitle,
    h1: 32,
    h2: 28,
  },
  weights: typography.weights,
};

export const SPACE = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
  xl: spacing.xl,
  xxl: spacing.xxl,
  xxxl: spacing.xxxl,
};

export const RADIUS = {
  sm: radii.chips,
  md: radii.buttons,
  lg: radii.cards,
  xl: radii.containers,
  pill: radii.circular,
};

export const SHADOW = {
  sm: elevations.sm,
  md: elevations.md,
  lg: elevations.lg,
  colored: (_color: string) => elevations.md,
};
