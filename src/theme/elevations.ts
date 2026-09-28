/**
 * Despensa Tonal — Elevation Tokens (rediseño M3 · Etapa 2)
 *
 * Plano y tonal: las tarjetas no llevan sombra (blanco sobre avena).
 * Solo lo que flota (nav, FAB, hojas, diálogos) se eleva, con sombra de tinta cálida.
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
  // level0/1 · tarjetas: planas (el borde outlineVariant se aplica en el componente si hace falta)
  sm: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  md: {
    elevation: 2,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  // level2 · lo que flota: nav, FAB
  lg: {
    elevation: 8,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  // level3 · diálogos y hojas inferiores
  xl: {
    elevation: 12,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
  },
} as const;

export type ThemeElevations = typeof elevations;
