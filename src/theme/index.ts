import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radii } from './radii';
import { elevations } from './elevations';
import type { Theme } from './types';

// ─── Warm Material Editorial Theme ───────────────────────────────────────────
export const theme: Theme = {
  colors,
  typography,
  spacing,
  radii,
  elevations,
};

// ─── Exportaciones Directas de Tokens y Tipos ─────────────────────────────────
export { colors, typography, spacing, radii, elevations };
export type { Theme };
