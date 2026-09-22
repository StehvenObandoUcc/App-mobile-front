import type { colors } from './colors';
import type { typography } from './typography';
import type { spacing } from './spacing';
import type { radii } from './radii';
import type { elevations } from './elevations';

export type Theme = {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  elevations: typeof elevations;
};
