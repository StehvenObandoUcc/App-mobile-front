import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radii } from './radii';
import { elevations } from './elevations';
import { CATEGORY_CONFIG, CATEGORY_LIST, getCategoryConfig, type CategoryMeta } from './categories';
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
export { colors, typography, spacing, radii, elevations, CATEGORY_CONFIG, CATEGORY_LIST, getCategoryConfig };
export type { Theme, CategoryMeta };
