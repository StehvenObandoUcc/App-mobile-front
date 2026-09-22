/**
 * Warm Material Editorial Elevation Tokens
 *
 * Tonal Elevation y Sombras Neutras para Android / iOS.
 * Evita esquinas agresivas y sombras con halos artificiales de colores.
 */

import { colors } from './colors';

export const elevations = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  sm: {
    elevation: 1,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  md: {
    elevation: 2,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  lg: {
    elevation: 4,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
} as const;

export type ThemeElevations = typeof elevations;
